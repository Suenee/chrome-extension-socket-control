# Chrome Extension Socket Control VPP contract

Application version: **0.10**  
VPP version: **1**

Generic envelope, routing, admission, queue and correlation semantics are owned by the canonical VPP v1 specification in `Suenee/companion-module-voiceprompter/PROTOCOL.md`. This document defines only browser-specific application behavior.

## Authoritative state

The extension owns browser window/tab state. After successful SUB admission it publishes `browserStateChanged` when a permitted peer is available. It publishes again when a peer appears after being absent and after relevant browser window/tab changes. The event is change-driven, not periodic polling.

`browserStateChanged.args` contains exactly `windows`, `tabs`, `windowCount`, and `tabCount`.

Window records contain `windowId`, `focused`, `state`, and `type`. Tab records contain `tabId`, `windowId`, `index`, `active`, `pinned`, `groupId`, `title`, and `url`.

## Calls

All calls use `expectsResponse: true` and normal VPP terminal response/error correlation.

- `getBrowserState {}`
- `getTab { tabId }`
- `findTabs { selector }`
- `createTab { url?, windowId?, active?, index? }`
- `closeTab { tabId }`
- `activateTab { tabId }`
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
