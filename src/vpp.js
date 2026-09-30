import * as browser from "./browser.js";
import { log } from "./logger.js";
export const APP="ChromeSocketControl", VERSION="0.19", VPP=1;
export function id(){ return crypto.randomUUID(); }
export function envelope(from,type,extra={}) { return {protocolVersion:VPP,id:id(),type,from,source:{app:APP,version:VERSION},timestamp:new Date().toISOString(),...extra}; }
export async function dispatch(message) {
  if(message?.protocolVersion!==1 || message?.type!=="call" || typeof message.method!=="string") throw browser.appError("INVALID_MESSAGE","Invalid VPP call");
  const a=message.args && typeof message.args==="object" && !Array.isArray(message.args) ? message.args : {};
  const methods={
    getBrowserState:()=>browser.getBrowserState(), getTab:()=>browser.getTab(a.tabId), findTabs:()=>browser.findTabs(a.selector),
    findDomElement:async()=>{await log("INFO","DOM","Find started",{tab:a.tabId,element:a.element,matchBy:a.matchBy,attribute:a.attribute,matchMode:a.matchMode,pattern:a.pattern,occurrence:a.occurrence});try{const r=await browser.findDomElement(a);await log("INFO","DOM","Find succeeded",{tab:a.tabId,matches:r.matches,tag:r.tag,alt:r.alt,src:r.src});return r;}catch(e){await log("ERROR","DOM","Find failed",{tab:a.tabId,code:e.code||"ERROR",message:e.message||String(e)});throw e;}},
    createTab:()=>browser.createTab(a), closeTab:()=>browser.closeTab(a), activateTab:()=>browser.activateTab(a), focusTab:()=>browser.focusTab(a), moveTab:()=>browser.moveTab(a),
    moveTabs:()=>browser.moveTabs(a), reorderTabs:()=>browser.reorderTabs(a), createWindow:()=>browser.createWindow(a), closeWindow:()=>browser.closeWindow(a),
    focusWindow:()=>browser.focusWindow(a), moveTabsToNewWindow:()=>browser.moveTabsToNewWindow(a)
  };
  if(!methods[message.method]) throw browser.appError("UNKNOWN_METHOD","Unknown method: "+message.method);
  return methods[message.method]();
}
