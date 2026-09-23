const $=id=>document.getElementById(id); let loaded=false;
async function refresh(){ const r=await chrome.runtime.sendMessage({type:"getStatus"}); if(!loaded){ for(const k of ["host","port","socketBox","apiKey"]) $(k).value=r.settings[k]??""; $("autoConnect").checked=!!r.settings.autoConnect; loaded=true; } const s=r.status||{}; $("light").className=s.level||"gray"; $("state").textContent=label(s.state); $("detail").textContent=s.detail||""; $("diag").textContent=JSON.stringify({browser:navigator.userAgent,extension:"0.11",vpp:1,status:s},null,2); }
function label(s){return({connected:"Connected",waiting:"Waiting for peer",connecting:"Connecting / reconnecting",error:"Error / disconnected",disabled:"Disabled",not_configured:"Not configured"})[s]||"Unknown";}
function values(){ return {host:$("host").value.trim(),port:Number($("port").value),socketBox:$("socketBox").value.trim(),apiKey:$("apiKey").value.trim(),autoConnect:$("autoConnect").checked}; }
function error(text=""){ $("formError").textContent=text; }
async function save(){ error(); const r=await chrome.runtime.sendMessage({type:"saveSettings",settings:values()}); if(!r?.ok){error(r?.error||"Cannot save configuration.");return false;} loaded=false; setTimeout(refresh,150); return true; }
$("save").onclick=save;
$("connect").onclick=async()=>{if(!(await save()))return; const r=await chrome.runtime.sendMessage({type:"connect"}); if(!r?.ok)error(r?.error||"Cannot connect."); refresh();};
$("disconnect").onclick=async()=>{error();await chrome.runtime.sendMessage({type:"disconnect"});loaded=false;refresh();};
$("test").onclick=async()=>{if(!(await save()))return; const r=await chrome.runtime.sendMessage({type:"test"});if(!r?.ok)error(r?.error||"Cannot test connection.");setTimeout(refresh,300);};
$("clear").onclick=async()=>{error();await chrome.runtime.sendMessage({type:"clearConfiguration"});loaded=false;refresh();};
setInterval(refresh,1000); refresh();
