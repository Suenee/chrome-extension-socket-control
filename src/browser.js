const STORE_KEY="persistentBrowserIds";
const WINDOW_CONFIG_KEY="windowIdentityConfig";
let registry=null;

async function loadRegistry(){
  if(registry) return registry;
  const r=await chrome.storage.local.get(STORE_KEY);
  registry=r[STORE_KEY]||{nextWindow:1,nextTab:1,windows:{},tabs:{}};
  return registry;
}
async function saveRegistry(){await chrome.storage.local.set({[STORE_KEY]:registry});}
async function loadWindowConfig(){const r=await chrome.storage.local.get(WINDOW_CONFIG_KEY);return r[WINDOW_CONFIG_KEY]||{};}
function titleCandidate(w){const tabs=w.tabs||[];const active=tabs.find(t=>t.active)||tabs[0];if(!active)return "";let s=(active.title||"").trim();if(!s){try{s=new URL(active.url||"").hostname.replace(/^www\./,"");}catch{}}return s.replace(/\s+[-–—|]\s+(Google Chrome|Brave)$/i,"").trim().slice(0,60);}
function snakeName(s){return String(s||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"window";}
function unique(base,used){let v=base||"window",n=2;while(used.has(v))v=base+"_"+n++;used.add(v);return v;}
async function ensureWindowIdentities(windows){
  const cfg=await loadWindowConfig(), usedC=new Set(),usedN=new Set();
  for(const x of Object.values(cfg)){if(x?.cName)usedC.add(x.cName);if(x?.name)usedN.add(x.name);}
  let changed=false;
  for(const w of windows){const pid=registry.windows[String(w.id)]?.persistentId;if(!pid||cfg[pid])continue;
    let name=titleCandidate(w)||("Window "+pid.replace(/^window_/,""));const root=name;let n=2;while(usedN.has(name))name=root+" "+n++;usedN.add(name);
    const cName=unique(snakeName(name),usedC);cfg[pid]={cName,name};changed=true;
  }
  if(changed)await chrome.storage.local.set({[WINDOW_CONFIG_KEY]:cfg});return cfg;
}
export async function getWindowConfiguration(){const windows=await reconcile();const cfg=await ensureWindowIdentities(windows);return windows.map(w=>({...windowRecord(w),cName:cfg[registry.windows[String(w.id)]?.persistentId]?.cName||"",name:cfg[registry.windows[String(w.id)]?.persistentId]?.name||""}));}
export async function saveWindowConfiguration(items){if(!Array.isArray(items))throw appError("INVALID_ARGUMENT","windows must be an array");const windows=await reconcile();const live=new Set(windows.map(w=>registry.windows[String(w.id)]?.persistentId));const cfg=await loadWindowConfig(),cs=new Set(),ns=new Set();
  for(const x of items){if(!live.has(x.persistentWindowId))continue;const c=String(x.cName||"").trim(),n=String(x.name||"").trim();if(!/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(c))throw appError("INVALID_ARGUMENT","CName must use lowercase_snake_case.");if(!n)throw appError("INVALID_ARGUMENT","Name is required.");if(cs.has(c))throw appError("INVALID_ARGUMENT","CName must be unique.");if(ns.has(n))throw appError("INVALID_ARGUMENT","Name must be unique.");cs.add(c);ns.add(n);cfg[x.persistentWindowId]={cName:c,name:n};}
  await chrome.storage.local.set({[WINDOW_CONFIG_KEY]:cfg});return getWindowConfiguration();
}
function newId(kind){const n=kind==="window"?registry.nextWindow++:registry.nextTab++;return kind+"_"+n;}
async function reconcile(){
  await loadRegistry();
  const windows=await chrome.windows.getAll({populate:true,windowTypes:["normal"]});
  const liveW=new Set(),liveT=new Set();
  for(const w of windows){
    const wk=String(w.id); liveW.add(wk);
    if(!registry.windows[wk]) registry.windows[wk]={persistentId:newId("window")};
    for(const t of (w.tabs||[])){
      const tk=String(t.id); liveT.add(tk);
      if(!registry.tabs[tk]) registry.tabs[tk]={persistentId:newId("tab")};
    }
  }
  for(const k of Object.keys(registry.windows))if(!liveW.has(k))delete registry.windows[k];
  for(const k of Object.keys(registry.tabs))if(!liveT.has(k))delete registry.tabs[k];
  await saveRegistry(); return windows;
}
function windowRecord(w){
  const p=registry.windows[String(w.id)]?.persistentId||"";
  return {persistentWindowId:p,windowId:w.id,label:(w.focused?"Active — ":"")+p+" — "+((w.tabs||[]).length)+" tabs",focused:!!w.focused,state:w.state||"normal",type:w.type||"normal",bounds:{left:Number.isFinite(w.left)?w.left:null,top:Number.isFinite(w.top)?w.top:null,width:Number.isFinite(w.width)?w.width:null,height:Number.isFinite(w.height)?w.height:null}};
}
function tabRecord(t){
  const p=registry.tabs[String(t.id)]?.persistentId||"";
  const wp=registry.windows[String(t.windowId)]?.persistentId||"";
  const title=t.title||"(untitled)";const host=(()=>{try{return new URL(t.url||t.pendingUrl||"").hostname;}catch{return "";}})();return {persistentTabId:p,persistentWindowId:wp,tabId:t.id,windowId:t.windowId,index:t.index,active:!!t.active,pinned:!!t.pinned,groupId:t.groupId??-1,title,url:t.url||t.pendingUrl||"",label:title+(host?" — "+host:"")+" ["+wp+"]"};
}
async function runtimeWindowId(v){
  if(v===undefined||v===null||v===""||v==="active"){const w=await chrome.windows.getLastFocused({windowTypes:["normal"]});return w.id;}
  await reconcile(); const e=Object.entries(registry.windows).find(([,x])=>x.persistentId===v); if(e)return Number(e[0]);
  return requireInt(v,"windowId");
}
async function runtimeTabId(v){
  await reconcile(); const e=Object.entries(registry.tabs).find(([,x])=>x.persistentId===v); if(e)return Number(e[0]);
  return requireInt(v,"tabId");
}
export async function getBrowserState(){
  const windows=await reconcile(); const cfg=await ensureWindowIdentities(windows); const wr=windows.map(w=>{const r=windowRecord(w),x=cfg[r.persistentWindowId]||{};return {...r,cName:x.cName||"",name:x.name||"",label:(w.focused?"Active — ":"")+(x.name||r.persistentWindowId)+" — "+((w.tabs||[]).length)+" tabs"};}); const tr=windows.flatMap(w=>(w.tabs||[]).map(tabRecord));
  const tree=wr.map(w=>({...w,tabs:tr.filter(t=>t.persistentWindowId===w.persistentWindowId)}));
  return {windows:wr,tabs:tr,windowCount:wr.length,tabCount:tr.length,browserState:tree,windowsJson:JSON.stringify(wr),tabsJson:JSON.stringify(tr),browserStateJson:JSON.stringify(tree)};
}
export async function getTab(tabId){const id=await runtimeTabId(tabId);await reconcile();return tabRecord(await chrome.tabs.get(id));}
export async function findTabs(selector={}){
  if(!selector||typeof selector!=="object"||Array.isArray(selector))throw appError("INVALID_ARGUMENT","selector must be an object");
  const s=await getBrowserState();return s.tabs.filter(t=>matches(t,selector));
}
function matches(t,s){
  for(const k of ["tabId","windowId","groupId"])if(s[k]!==undefined&&t[k]!==Number(s[k]))return false;
  for(const k of ["persistentTabId","persistentWindowId"])if(s[k]!==undefined&&t[k]!==s[k])return false;
  for(const k of ["active","pinned"])if(s[k]!==undefined&&t[k]!==!!s[k])return false;
  for(const k of ["url","title"])if(s[k]!==undefined&&!matchText(t[k],s[k]))return false;return true;
}
function matchText(actual,spec){if(typeof spec==="string")return actual===spec;if(!spec||typeof spec!=="object"||typeof spec.value!=="string")throw appError("INVALID_ARGUMENT","text selector must be string or {value,match}");const mode=spec.match||"exact";if(mode==="exact")return actual===spec.value;if(mode==="contains")return actual.includes(spec.value);if(mode==="wildcard"){const escaped=spec.value.replace(/[.+^$()|[\]\\]/g,"\\$&").replace(/\*/g,".*").replace(/\?/g,".");return new RegExp("^"+escaped+"$").test(actual);}throw appError("INVALID_ARGUMENT","unsupported match mode");}
export async function createTab(a){const windowId=await runtimeWindowId(a.windowId);const t=await chrome.tabs.create(clean({url:a.url,windowId,active:a.active,index:num(a.index)}));await reconcile();return tabRecord(t);}
export async function closeTab(a){const id=await runtimeTabId(a.tabId??a.persistentTabId);await chrome.tabs.remove(id);return {tabId:id};}
export async function activateTab(a){const id=await runtimeTabId(a.tabId??a.persistentTabId);const t=await chrome.tabs.update(id,{active:true});await reconcile();return tabRecord(t);}
export async function focusTab(a){const id=await runtimeTabId(a.tabId??a.persistentTabId);const t=await chrome.tabs.update(id,{active:true});await chrome.windows.update(t.windowId,{focused:true});await reconcile();return tabRecord(t);}
export async function moveTab(a){const id=await runtimeTabId(a.tabId??a.persistentTabId);const windowId=await runtimeWindowId(a.windowId??a.persistentWindowId);const r=await chrome.tabs.move(id,{windowId,index:requireInt(a.index,"index",true)});await reconcile();return tabRecord(r);}
export async function moveTabs(a){const ids=[];for(const x of (a.tabIds||[]))ids.push(await runtimeTabId(x));if(!ids.length)throw appError("INVALID_ARGUMENT","tabIds must be a non-empty array");const windowId=await runtimeWindowId(a.windowId??a.persistentWindowId);const r=await chrome.tabs.move(ids,{windowId,index:requireInt(a.index,"index",true)});await reconcile();return (Array.isArray(r)?r:[r]).map(tabRecord);}
export async function reorderTabs(a){return moveTabs(a);}
export async function createWindow(a){const state=a.state==="maximized"?"maximized":undefined;const w=await chrome.windows.create(clean({url:a.url,focused:a.focused,state}));if(!w)throw appError("CHROME_API_ERROR","window was not created");await reconcile();return windowRecord(await chrome.windows.get(w.id,{populate:true}));}
export async function closeWindow(a){const id=await runtimeWindowId(a.windowId??a.persistentWindowId);await chrome.windows.remove(id);return {windowId:id};}
export async function focusWindow(a){const id=await runtimeWindowId(a.windowId??a.persistentWindowId);const w=await chrome.windows.update(id,{focused:true});await reconcile();return windowRecord({...w,tabs:await chrome.tabs.query({windowId:id})});}
export async function moveTabsToNewWindow(a){const ids=[];for(const x of (a.tabIds||[]))ids.push(await runtimeTabId(x));if(!ids.length)throw appError("INVALID_ARGUMENT","tabIds must be a non-empty array");const first=await chrome.tabs.get(ids[0]);const w=await chrome.windows.create({tabId:first.id,focused:a.focused!==false});if(!w?.id)throw appError("CHROME_API_ERROR","window was not created");if(ids.length>1)await chrome.tabs.move(ids.slice(1),{windowId:w.id,index:-1});return getBrowserState();}
function clean(o){return Object.fromEntries(Object.entries(o).filter(([,v])=>v!==undefined));}
function num(v){return v===undefined?undefined:Number(v);}
function requireInt(v,n,allowMinusOne=false){const x=Number(v);if(!Number.isInteger(x)||(!allowMinusOne&&x<0)||(allowMinusOne&&x<-1))throw appError("INVALID_ARGUMENT",n+" must be an integer");return x;}
export function appError(code,message){const e=new Error(message);e.code=code;return e;}
