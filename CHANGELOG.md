# Changelog

## 0.18 - 25.09.2026

- Treat an unavailable SUB endpoint as an expected reconnect state instead of an application-level failure.
- Added exponential reconnect backoff: 3, 6, 12, 24, 48, then 60 seconds maximum.
- Reset reconnect backoff immediately after a successful WebSocket connection or manual disconnect.
- Connection status now reports that SUB is unavailable and shows the next retry delay.
- Note: Chromium itself emits `ERR_CONNECTION_REFUSED` for a failed WebSocket handshake before extension code receives the asynchronous error event; the WebSocket API does not provide a way for CSC to suppress that browser-generated diagnostic.


## 0.17 - 24.09.2026

- Added editable CName and Name comboboxes with live suggestions derived from tabs in each browser window.
- CName may now begin with a digit while retaining lowercase snake_case validation and uniqueness.
- Replaced the combined Bounds column with X1, Y1, X2 and Y2 corner coordinates and widened the options page.
- Added the derived tab `focused` state: true only when the tab is active and its containing browser window is focused.
- Added the complete 16, 32, 48 and 128 px Client Socket Control icon set for toolbar and extension-management UI.
- SUM manifest version is now 1.02 for the extended published tab state.


## 0.16 - 24.09.2026

- Replaced the toolbar popup workflow with a full Client Socket Control options page.
- Added Windows and Configuration tabs.
- Added live browser-window table with persistent ID, editable unique CName, editable unique Name, and Chromium window bounds.
- New windows receive an initial human-readable Name inferred from their current tab and a unique lowercase_snake_case CName; saved names are not automatically overwritten.
- Added Reset, Save, Close, live validation, and connection-status display.
- Clicking the extension toolbar icon now opens the options page.
- Prepared the extension manifest for dedicated CSC icon assets.


## 0.15 - 24.09.2026

- Added Chromium-reported window bounds (`left`, `top`, `width`, `height`) to every browser window state record.
- Window movement and resize events now trigger authoritative state publication.
- Suppress duplicate browser-state events when the normalized state did not actually change; reconnect and newly available peers still receive a forced full snapshot.
- CSC intentionally reports desktop coordinates only and does not infer monitor numbers or Windows virtual desktops.


## Manifest 1.01 - 24.09.2026

- Added the native `browserState` array to the `browserStateChanged` event contract so strict SUM event validation matches the payload emitted by Client Socket Control.
- No extension runtime or VPP payload changes.

## 0.14 - 23.09.2026

- Publish an authoritative browser-state snapshot immediately after successful SUB admission.
- Added browser_state, windows and tabs diagnostic Companion variables as JSON strings.
- Browser state now also contains a hierarchical window-to-tabs tree for diagnostics.
- Store the most recently published browser snapshot in extension diagnostics.
- Window: Create explicitly defaults Window state to Default.
- Added state publication logging with window/tab counts.
- Decoupled SUM manifest versioning from the extension; the manifest now starts its independent series at 1.00.

## 0.13 - 23.09.2026

- Renamed the displayed application to Client Socket Control.
- Browser state snapshots are published after SUB admission even while peer discovery diagnostics are still waiting, preventing initial window/tab counts from being suppressed.
- Added persistent application IDs for browser windows and tabs and exposed runtime Chrome IDs only as metadata.
- Dynamic SUM window/tab collections now use persistent IDs.
- Tab Create can target Active window or a dynamically discovered persistent window.
- Window/tab state is published as complete authoritative collections for Companion selectors and move actions.
- Reset button now appears before Connect/Disconnect.
- Added Tab: Focus, which activates a tab and brings its containing window to the foreground.
- Added Default / Maximized state selection to Window: Create.
- Completed explicit dynamic selectors for tab close/activate/focus/move and window focus/close actions.
- Tab selector labels include title, host and persistent window identity.

## 0.12 - 23.09.2026

- Removed the explicit Save and Test connection buttons.
- Configuration is saved automatically only when the complete form is valid; otherwise the previous valid configuration remains active.
- Merged Connect and Disconnect into one state-aware button.
- Replaced Clear configuration with a reset icon that restores form defaults.
- Added a Close button to the popup.

## 0.11 - 23.09.2026

- Added explicit configured / not-configured state.
- Fresh installations no longer attempt a SUB connection before valid settings exist.
- Fresh installation opens the extension setup popup once; closing it without configuration leaves the extension quietly inactive.
- Added validation for server, port, Socket Box and plain-text API key before enabling a connection.
- Added Clear configuration action.
- Auto-connect and connection state are now independent from configuration state.

## 0.10 - 23.09.2026

- Initial Manifest V3 Chrome/Brave extension.
- Added SUB settings popup with plain-text API key and auto-connect enabled by default.
- Added green/yellow/red/gray connection diagnostics and peer-aware SUB ping state.
- Added VPP v1 registration, correlation, responses/errors and authoritative browser-state publication.
- Added tab/window discovery, search, creation, closing, activation, focus, real tab movement and reordering.
- Added canonical SUM manifest with dynamic window/tab collections.
- Added bounded browser runtime diagnostics in extension local storage.
- Added Wipe Codes-style self-updating `upgrade.cmd` / `upgrade.ps1` with `logs/upgrade.log`.
