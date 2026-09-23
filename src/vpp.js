import * as browser from "./browser.js";
export const APP="ChromeSocketControl", VERSION="0.13", VPP=1;
export function id(){ return crypto.randomUUID(); }
export function envelope(from,type,extra={}) { return {protocolVersion:VPP,id:id(),type,from,source:{app:APP,version:VERSION},timestamp:new Date().toISOString(),...extra}; }
export async function dispatch(message) {
  if(message?.protocolVersion!==1 || message?.type!=="call" || typeof message.method!=="string") throw browser.appError("INVALID_MESSAGE","Invalid VPP call");
  const a=message.args && typeof message.args==="object" && !Array.isArray(message.args) ? message.args : {};
  const methods={
    getBrowserState:()=>browser.getBrowserState(), getTab:()=>browser.getTab(a.tabId), findTabs:()=>browser.findTabs(a.selector),
    createTab:()=>browser.createTab(a), closeTab:()=>browser.closeTab(a), activateTab:()=>browser.activateTab(a), focusTab:()=>browser.focusTab(a), moveTab:()=>browser.moveTab(a),
    moveTabs:()=>browser.moveTabs(a), reorderTabs:()=>browser.reorderTabs(a), createWindow:()=>browser.createWindow(a), closeWindow:()=>browser.closeWindow(a),
    focusWindow:()=>browser.focusWindow(a), moveTabsToNewWindow:()=>browser.moveTabsToNewWindow(a)
  };
  if(!methods[message.method]) throw browser.appError("UNKNOWN_METHOD","Unknown method: "+message.method);
  return methods[message.method]();
}
