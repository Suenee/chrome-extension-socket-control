function windowRecord(w) {
  return { windowId: w.id, focused: !!w.focused, state: w.state || "normal", type: w.type || "normal" };
}
function tabRecord(t) {
  return { tabId:t.id, windowId:t.windowId, index:t.index, active:!!t.active, pinned:!!t.pinned, groupId:t.groupId ?? -1, title:t.title || "", url:t.url || t.pendingUrl || "" };
}
export async function getBrowserState() {
  const windows = await chrome.windows.getAll({ populate:false, windowTypes:["normal"] });
  const tabs = await chrome.tabs.query({});
  const ids = new Set(windows.map(w => w.id));
  const wr = windows.map(windowRecord);
  const tr = tabs.filter(t => ids.has(t.windowId)).map(tabRecord);
  return { windows:wr, tabs:tr, windowCount:wr.length, tabCount:tr.length };
}
export async function getTab(tabId) { return tabRecord(await chrome.tabs.get(requireInt(tabId,"tabId"))); }
export async function findTabs(selector={}) {
  if (!selector || typeof selector !== "object" || Array.isArray(selector)) throw appError("INVALID_ARGUMENT","selector must be an object");
  return (await chrome.tabs.query({})).map(tabRecord).filter(t => matches(t,selector));
}
function matches(t,s) {
  for (const k of ["tabId","windowId","groupId"]) if (s[k] !== undefined && t[k] !== Number(s[k])) return false;
  for (const k of ["active","pinned"]) if (s[k] !== undefined && t[k] !== !!s[k]) return false;
  for (const k of ["url","title"]) if (s[k] !== undefined && !matchText(t[k],s[k])) return false;
  return true;
}
function matchText(actual,spec) {
  if (typeof spec === "string") return actual === spec;
  if (!spec || typeof spec !== "object" || typeof spec.value !== "string") throw appError("INVALID_ARGUMENT","text selector must be string or {value,match}");
  const mode=spec.match || "exact";
  if (mode==="exact") return actual===spec.value;
  if (mode==="contains") return actual.includes(spec.value);
  if (mode==="wildcard") {
    const escaped=spec.value.replace(/[.+^$()|[\]\\]/g,"\\$&").replace(/\*/g,".*").replace(/\?/g,".");
    return new RegExp("^"+escaped+"$").test(actual);
  }
  throw appError("INVALID_ARGUMENT","unsupported match mode");
}
export async function createTab(a) { return tabRecord(await chrome.tabs.create(clean({url:a.url,windowId:num(a.windowId),active:a.active,index:num(a.index)}))); }
export async function closeTab(a) { const id=requireInt(a.tabId,"tabId"); await chrome.tabs.remove(id); return { tabId:id }; }
export async function activateTab(a) { const id=requireInt(a.tabId,"tabId"); const t=await chrome.tabs.update(id,{active:true}); await chrome.windows.update(t.windowId,{focused:true}); return tabRecord(t); }
export async function moveTab(a) { const r=await chrome.tabs.move(requireInt(a.tabId,"tabId"),clean({windowId:num(a.windowId),index:requireInt(a.index,"index",true)})); return tabRecord(r); }
export async function moveTabs(a) { const ids=requireIds(a.tabIds); const r=await chrome.tabs.move(ids,clean({windowId:num(a.windowId),index:requireInt(a.index,"index",true)})); return (Array.isArray(r)?r:[r]).map(tabRecord); }
export async function reorderTabs(a) { return moveTabs({tabIds:a.tabIds,windowId:requireInt(a.windowId,"windowId"),index:requireInt(a.index,"index",true)}); }
export async function createWindow(a) { const w=await chrome.windows.create(clean({url:a.url,focused:a.focused,state:a.state})); if (!w) throw appError("CHROME_API_ERROR","window was not created"); return windowRecord(w); }
export async function closeWindow(a) { const id=requireInt(a.windowId,"windowId"); await chrome.windows.remove(id); return {windowId:id}; }
export async function focusWindow(a) { return windowRecord(await chrome.windows.update(requireInt(a.windowId,"windowId"),{focused:true})); }
export async function moveTabsToNewWindow(a) {
  const ids=requireIds(a.tabIds); const first=await chrome.tabs.get(ids[0]);
  const w=await chrome.windows.create({tabId:first.id,focused:a.focused !== false});
  if (!w?.id) throw appError("CHROME_API_ERROR","window was not created");
  if (ids.length>1) await chrome.tabs.move(ids.slice(1),{windowId:w.id,index:-1});
  return { window:windowRecord(await chrome.windows.get(w.id)), tabs:(await chrome.tabs.query({windowId:w.id})).map(tabRecord) };
}
function clean(o){ return Object.fromEntries(Object.entries(o).filter(([,v])=>v!==undefined)); }
function num(v){ return v===undefined ? undefined : Number(v); }
function requireInt(v,n,allowMinusOne=false){ const x=Number(v); if(!Number.isInteger(x)||(!allowMinusOne&&x<0)||(allowMinusOne&&x<-1)) throw appError("INVALID_ARGUMENT",n+" must be an integer"); return x; }
function requireIds(v){ if(!Array.isArray(v)||!v.length) throw appError("INVALID_ARGUMENT","tabIds must be a non-empty array"); return v.map(x=>requireInt(x,"tabId")); }
export function appError(code,message){ const e=new Error(message); e.code=code; return e; }
