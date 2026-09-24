const $=id=>document.getElementById(id);
let loadedSettings=null, loadedWindows=[], currentStatus=null;

for(const b of document.querySelectorAll(".tab")) b.onclick=()=>{
  document.querySelectorAll(".tab,.panel").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); $(b.dataset.tab).classList.add("active");
};

function configValues(){return {host:$("host").value.trim(),port:Number($("port").value),socketBox:$("socketBox").value.trim(),apiKey:$("apiKey").value.trim(),autoConnect:$("autoConnect").checked};}
function applyConfig(v){for(const k of ["host","port","socketBox","apiKey"])$(k).value=v?.[k]??"";$("autoConnect").checked=!!v?.autoConnect;}
function statusLabel(s){return({connected:"Connected",waiting:"Waiting for peer",connecting:"Connecting / reconnecting",error:"Error / disconnected",disabled:"Disabled",not_configured:"Not configured"})[s]||"Unknown";}
function snake(s){return String(s||"").trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");}

function validate(){
  let ok=true, msg="";
  const rows=[...document.querySelectorAll("#windowRows tr")];
  const cnames=new Map(),names=new Map();
  for(const row of rows){
    const c=row.querySelector(".cname"), n=row.querySelector(".wname");
    c.classList.remove("invalid");n.classList.remove("invalid");
    const cv=c.value.trim(), nv=n.value.trim();
    if(!/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(cv)){c.classList.add("invalid");ok=false;msg||="CName must use lowercase_snake_case.";}
    if(!nv){n.classList.add("invalid");ok=false;msg||="Name is required.";}
    cnames.set(cv,(cnames.get(cv)||[]).concat(c)); names.set(nv,(names.get(nv)||[]).concat(n));
  }
  for(const [v,els] of cnames) if(v&&els.length>1){els.forEach(x=>x.classList.add("invalid"));ok=false;msg||="CName must be unique.";}
  for(const [v,els] of names) if(v&&els.length>1){els.forEach(x=>x.classList.add("invalid"));ok=false;msg||="Name must be unique.";}
  const cfg=configValues();
  const cfgOk=!!(cfg.host&&Number.isInteger(cfg.port)&&cfg.port>0&&cfg.port<=65535&&cfg.socketBox&&cfg.apiKey);
  $("configError").textContent=cfgOk?"":"Server, valid port, Socket Box and API key are required.";
  $("windowError").textContent=msg;
  $("save").disabled=!(ok&&cfgOk);
  return ok&&cfgOk;
}
function renderWindows(items){
  loadedWindows=items;
  const body=$("windowRows");body.textContent="";
  for(const w of items){
    const tr=document.createElement("tr");
    const b=w.bounds||{};
    tr.innerHTML='<td></td><td><input class="cname"></td><td><input class="wname"></td><td class="bounds"></td>';
    tr.dataset.id=w.persistentWindowId;
    tr.children[0].textContent=w.persistentWindowId;
    tr.querySelector(".cname").value=w.cName||"";
    tr.querySelector(".wname").value=w.name||"";
    tr.querySelector(".bounds").textContent=[b.left,b.top,b.width,b.height].map(x=>x??"?").join(" / ");
    for(const input of tr.querySelectorAll("input")) input.addEventListener("input",validate);
    body.appendChild(tr);
  }
  validate();
}
function windowValues(){return [...document.querySelectorAll("#windowRows tr")].map(r=>({persistentWindowId:r.dataset.id,cName:r.querySelector(".cname").value.trim(),name:r.querySelector(".wname").value.trim()}));}
async function load(){
  const r=await chrome.runtime.sendMessage({type:"getOptionsData"});
  loadedSettings=r.settings; currentStatus=r.status||{}; applyConfig(r.settings); renderWindows(r.windows||[]);
  $("light").className=currentStatus.level||"gray";$("state").textContent=statusLabel(currentStatus.state);$("detail").textContent=currentStatus.detail||"";
}
for(const id of ["host","port","socketBox","apiKey","autoConnect"]) $(id).addEventListener(id==="autoConnect"?"change":"input",validate);
$("refreshWindows").onclick=load;
$("reset").onclick=()=>{applyConfig(loadedSettings);renderWindows(loadedWindows);validate();};
$("save").onclick=async()=>{
  if(!validate())return;
  const r=await chrome.runtime.sendMessage({type:"saveOptions",settings:configValues(),windows:windowValues()});
  if(!r?.ok){$("windowError").textContent=r?.error||"Save failed.";return;}
  await load();
};
$("close").onclick=()=>window.close();
load(); setInterval(async()=>{const r=await chrome.runtime.sendMessage({type:"getOptionsData"});currentStatus=r.status||{};$("light").className=currentStatus.level||"gray";$("state").textContent=statusLabel(currentStatus.state);$("detail").textContent=currentStatus.detail||"";},1500);
