const $=id=>document.getElementById(id); let loaded=false,lastStatus=null,saveTimer=null;
async function refresh(){ const r=await chrome.runtime.sendMessage({type:"getStatus"}); lastStatus=r.status||{}; if(!loaded){apply(r.settings);loaded=true;} $("light").className=lastStatus.level||"gray"; $("state").textContent=label(lastStatus.state); $("detail").textContent=lastStatus.detail||""; $("toggle").textContent=isLive(lastStatus.state)?"Disconnect":"Connect"; $("diag").textContent=JSON.stringify({browser:navigator.userAgent,extension:"0.12",vpp:1,status:lastStatus},null,2); }
function label(s){return({connected:"Connected",waiting:"Waiting for peer",connecting:"Connecting / reconnecting",error:"Error / disconnected",disabled:"Disabled",not_configured:"Not configured"})[s]||"Unknown";}
function isLive(s){return ["connected","waiting","connecting"].includes(s);}
function values(){return {host:$("host").value.trim(),port:Number($("port").value),socketBox:$("socketBox").value.trim(),apiKey:$("apiKey").value.trim(),autoConnect:$("autoConnect").checked};}
function apply(v){for(const k of ["host","port","socketBox","apiKey"])$(k).value=v?.[k]??"";$("autoConnect").checked=!!v?.autoConnect;}
function error(t=""){$("formError").textContent=t;}
async function autosave(){clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{const r=await chrome.runtime.sendMessage({type:"saveSettings",settings:values()});if(r?.ok){error();}else{error("Changes are not active until all fields are valid.");}},350);}
for(const id of ["host","port","socketBox","apiKey"])$(id).addEventListener("input",autosave);
$("autoConnect").addEventListener("change",autosave);
$("toggle").onclick=async()=>{error();if(isLive(lastStatus?.state)){await chrome.runtime.sendMessage({type:"disconnect"});}else{const saved=await chrome.runtime.sendMessage({type:"saveSettings",settings:values()});if(!saved?.ok){error(saved?.error||"Configuration required.");return;}const r=await chrome.runtime.sendMessage({type:"connect"});if(!r?.ok)error(r?.error||"Cannot connect.");}loaded=false;refresh();};
$("reset").onclick=async()=>{error();const r=await chrome.runtime.sendMessage({type:"resetForm"});apply(r.defaults);autosave();};
$("close").onclick=()=>window.close();
setInterval(refresh,1000);refresh();
