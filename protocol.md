# Client Socket Control VPP contract

Application version: **0.16**  
VPP version: **1**  
SUM manifest version: **1.01**

Generic envelope, routing, admission, queue and correlation semantics are owned by the canonical VPP v1 specification in `Suenee/companion-module-voiceprompter/PROTOCOL.md`. This document defines only browser-specific application behavior.

## Authoritative state

The extension owns browser window/tab state. After successful SUB admission it publishes `browserStateChanged` when a permitted peer is available. It publishes again when a peer appears after being absent and after relevant browser window/tab changes. The event is change-driven, not periodic polling.

`browserStateChanged.args` contains authoritative `windows`, `tabs`, `windowCount`, `tabCount`, plus JSON diagnostic projections `browserStateJson`, `windowsJson`, and `tabsJson`. The hierarchical browser-state JSON groups tabs under their owning window.

Window records contain stable `persistentWindowId` plus runtime `windowId`, editable `cName` and `name`, `label`, `focused`, `state`, `type`, and `bounds`. `bounds` contains the Chromium-reported `left`, `top`, `width`, and `height` desktop coordinates. CSC does not infer a physical monitor number or Windows virtual desktop from these coordinates. Tab records contain stable `persistentTabId` and `persistentWindowId` plus runtime `tabId`, `windowId`, `index`, `active`, `pinned`, `groupId`, `title`, `url`, and a descriptive `label`. Companion stores persistent IDs; Chromium runtime IDs are metadata only.

## Calls

All calls use `expectsResponse: true` and normal VPP terminal response/error correlation.

- `getBrowserState {}`
- `getTab { tabId }`
- `findTabs { selector }`
- `createTab { url?, windowId?, active?, index? }`
- `closeTab { tabId }`
- `activateTab { persistentTabId }`\n- `focusTab { persistentTabId }
- `moveTab { tabId, windowId?, index }`
- `moveTabs { tabIds, windowId?, index }`
- `reorderTabs { tabIds, windowId, index }`
- `createWindow { url?, focused?, state? }`
- `closeWindow { windowId }`
- `focusWindow { windowId }`
- `moveTabsToNewWindow { tabIds, focused? }`

The move methods move existing Chromium tab objects. They must not implement movement by opening the URL again and closing the original tab.

## Selector

`findTabs.selector` may contain `tabId`, `windowId`, `url`, `title`, `active`, `pinned`, and `groupId`. `url` and `title` may be a string (exact match) or `{ value, match }` where `match` is `exact`, `contains`, or `wildcard`.

## Errors

Application errors use normal VPP `error` messages. Stable codes in v0.10 include `INVALID_ARGUMENT`, `NOT_FOUND`, `AMBIGUOUS_MATCH`, `CHROME_API_ERROR`, and `UNKNOWN_METHOD`.
