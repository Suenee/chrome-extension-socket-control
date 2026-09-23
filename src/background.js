import { log } from "./logger.js";
import { getBrowserState } from "./browser.js";
import { envelope, dispatch } from "./vpp.js";

const DEFAULTS={host:"127.0.0.1",port:8170,socketBox:"chrome",apiKey:"",autoConnect:true,configured:false};
let ws=null, settings={...DEFAULTS}, admitted=false, peerConnected=false, reconnectTimer=null, pingTimer=null, publishTimer=null;
const pending=new Map();

chrome.runtime.onInstalled.addListener(details=>initialize({openSetup:details.reason==="install"}));
chrome.runtime.onStartup.addListener(()=>initialize());
chrome.storage.onChanged.addListener((changes,area)=>{ if(area==="sync" && Object.keys(changes).some(k=>k in DEFAULTS)) restartFromSettings(); });
chrome.runtime.onMessage.addListener((m,_s,send)=>{ handleUi(m).then(send); return true; });
for (const ev of [chrome.tabs.onCreated,chrome.tabs.onRemoved,chrome.tabs.onUpdated,chrome.tabs.onMoved,chrome.tabs.onActivated,chrome.tabs.onAttached,chrome.tabs.onDetached,chrome.windows.onCreated,chrome.windows.onRemoved,chrome.windows.onFocusChanged]) ev.addListener(()=>schedulePublish());

initialize();

function validSettings(s){ return !!(s.configured && s.host?.trim() && Number.isInteger(Number(s.port)) && Number(s.port)>0 && Number(s.port)<=65535 && s.socketBox?.trim() && s.apiKey?.trim()); }

async function initialize({openSetup=false}={}){
  const d=await chrome.storage.sync.get(DEFAULTS); settings={...DEFAULTS,...d};
  if(!validSettings(settings)){
    disconnect(false);
    await setState("not_configured","Not configured — connection is inactive");
    if(openSetup) await chrome.action.openPopup().catch(()=>{});
    return;
  }
  await setState(settings.autoConnect?"connecting":"disabled",settings.autoConnect?"Starting":"Auto-connect disabled");
  if(settings.autoConnect) connect();
}
async function restartFromSettings(){
  disconnect(false); const d=await chrome.storage.sync.get(DEFAULTS); settings={...DEFAULTS,...d};
  if(!validSettings(settings)){ await setState("not_configured","Not configured — connection is inactive"); return; }
  if(settings.autoConnect) connect(); else setState("disabled","Auto-connect disabled");
}
function connect(){
  if(!validSettings(settings)){ setState("not_configured","Not configured — connection is inactive"); return; }
  if(!settings.autoConnect || ws?.readyState===WebSocket.OPEN || ws?.readyState===WebSocket.CONNECTING) return;
  clearTimeout(reconnectTimer); admitted=false; peerConnected=false; setState("connecting","Connecting to SUB");
  const key="?apiKey="+encodeURIComponent(settings.apiKey);
  const url="ws://"+settings.host+":"+settings.port+"/mailbox/"+encodeURIComponent(settings.socketBox)+key;
  try { ws=new WebSocket(url); } catch(e){ fail(e); return; }
  ws.onopen=()=>{ log("INFO","SOCKET","WebSocket open"); register(); };
  ws.onmessage=e=>receive(e.data);
  ws.onerror=()=>setState("error","SUB connection error");
  ws.onclose=e=>{
    log("WARN","SOCKET","Closed",{code:e.code,reason:e.reason}); ws=null; admitted=false; peerConnected=false; stopPing();
    if(validSettings(settings)&&settings.autoConnect){setState("connecting","Reconnecting to SUB"); reconnectTimer=setTimeout(connect,3000);}
    else setState(validSettings(settings)?"disabled":"not_configured",validSettings(settings)?"Disconnected":"Not configured — connection is inactive");
  };
}
function disconnect(manual=true){
  clearTimeout(reconnectTimer); stopPing(); if(manual) settings.autoConnect=false;
  if(ws) { try{ws.close(1000,"User disconnect");}catch{} } ws=null; admitted=false; peerConnected=false;
}
async function register(){
  try { await serverCall("registerConnection",{hostName:navigator.userAgent},8000); admitted=true; await ping(); startPing(); }
  catch(e){ await log("ERROR","VPP","Registration failed",String(e)); setState("error","SUB admission failed: "+e.message); try{ws?.close();}catch{} }
}
function serverCall(method,args={},timeout=8000){
  return new Promise((resolve,reject)=>{
    const m=envelope(settings.socketBox,"call",{recipient:"server",method,args,expectsResponse:true});
    pending.set(m.id,{resolve,reject,t:setTimeout(()=>{pending.delete(m.id);reject(new Error(method+" timeout"));},timeout)});
    send(m);
  });
}
function send(m){ if(ws?.readyState!==WebSocket.OPEN) throw new Error("Socket is not open"); ws.send(JSON.stringify(m)); log("DEBUG","TX",m.type+" "+(m.method||m.event||""),{id:m.id}); }
async function receive(raw){
  let m; try{m=JSON.parse(raw);}catch{return;}
  await log("DEBUG","RX",m.type+" "+(m.method||m.event||""),{id:m.id,correlationId:m.correlationId});
  if(m.correlationId && pending.has(m.correlationId)){ const p=pending.get(m.correlationId); pending.delete(m.correlationId); clearTimeout(p.t); m.type==="error"?p.reject(new Error(m.error?.message||m.message||"VPP error")):p.resolve(m.result); return; }
  if(m.type==="call"){
    try { const result=await dispatch(m); if(m.expectsResponse) send(envelope(settings.socketBox,"response",{recipient:m.from,correlationId:m.id,result})); schedulePublish(); }
    catch(e){ if(m.expectsResponse) send(envelope(settings.socketBox,"error",{recipient:m.from,correlationId:m.id,error:{code:e.code||"CHROME_API_ERROR",message:e.message||String(e)}})); }
  }
}
async function ping(){
  if(!admitted) return;
  try {
    const r=await serverCall("ping",{},6000); const boxes=r?.mailboxes||{};
    const now=Object.values(boxes).some(x=>x?.connected===true); const arrived=now&&!peerConnected; peerConnected=now;
    await setState(now?"connected":"waiting",now?"Connected to SUB and peer":"Connected to SUB — waiting for SUM");
    if(arrived) publishState();
  } catch(e){ setState("error","SUB ping failed: "+e.message); }
}
function startPing(){ stopPing(); pingTimer=setInterval(ping,10000); }
function stopPing(){ if(pingTimer)clearInterval(pingTimer); pingTimer=null; }
function schedulePublish(){ clearTimeout(publishTimer); publishTimer=setTimeout(()=>publishState(),150); }
async function publishState(){ if(!admitted||!peerConnected||ws?.readyState!==WebSocket.OPEN)return; try{ const args=await getBrowserState(); send(envelope(settings.socketBox,"event",{event:"browserStateChanged",args,expectsResponse:false})); }catch(e){log("ERROR","STATE","Publish failed",String(e));} }
async function setState(state,detail){
  const level=state==="connected"?"green":(state==="waiting"||state==="connecting")?"yellow":(state==="disabled"||state==="not_configured")?"gray":"red";
  await chrome.storage.local.set({connectionStatus:{state,level,detail,configured:validSettings(settings),admitted,peerConnected,updatedAt:new Date().toISOString()}});
  try{await chrome.action.setBadgeText({text:level==="green"?"OK":level==="yellow"?"…":level==="red"?"!":""});}catch{}
}
function fail(e){ log("ERROR","SOCKET","Connect failed",String(e)); setState("error",e.message||String(e)); if(validSettings(settings)&&settings.autoConnect) reconnectTimer=setTimeout(connect,3000); }
async function handleUi(m){
  if(m?.type==="getStatus") return {settings:{...settings},status:(await chrome.storage.local.get("connectionStatus")).connectionStatus||null};
  if(m?.type==="saveSettings"){
    const next={...DEFAULTS,...m.settings,configured:true};
    if(!validSettings(next)) return {ok:false,error:"Server, valid port, Socket Box and API key are required to enable the connection."};
    settings=next; await chrome.storage.sync.set(settings); return {ok:true};
  }
  if(m?.type==="connect"){ if(!validSettings(settings)) return {ok:false,error:"Configuration required."}; settings.autoConnect=true; await chrome.storage.sync.set({autoConnect:true}); connect(); return {ok:true}; }
  if(m?.type==="disconnect"){ disconnect(true); if(settings.configured) await chrome.storage.sync.set({autoConnect:false}); await setState(validSettings(settings)?"disabled":"not_configured",validSettings(settings)?"Disconnected by user":"Not configured — connection is inactive"); return {ok:true}; }
  if(m?.type==="test"){ if(!validSettings(settings)) return {ok:false,error:"Configuration required."}; if(ws?.readyState!==WebSocket.OPEN) connect(); else await ping(); return {ok:true}; }
  if(m?.type==="clearConfiguration"){ disconnect(false); settings={...DEFAULTS,autoConnect:false,configured:false}; await chrome.storage.sync.clear(); await setState("not_configured","Not configured — connection is inactive"); return {ok:true}; }
  return {ok:false};
}
