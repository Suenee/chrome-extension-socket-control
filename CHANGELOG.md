# Changelog

## 0.13 - 23.09.2026

- Renamed the displayed application to Client Socket Control.
- Browser state snapshots are published after SUB admission even while peer discovery diagnostics are still waiting, preventing initial window/tab counts from being suppressed.
- Added persistent application IDs for browser windows and tabs and exposed runtime Chrome IDs only as metadata.
- Dynamic SUM window/tab collections now use persistent IDs.
- Tab Create can target Active window or a dynamically discovered persistent window.
- Window/tab state is published as complete authoritative collections for Companion selectors and move actions.
- Reset button now appears before Connect/Disconnect.\n- Added Tab: Focus, which activates a tab and brings its containing window to the foreground.\n- Added Default / Maximized state selection to Window: Create.\n- Completed explicit dynamic selectors for tab close/activate/focus/move and window focus/close actions.\n- Tab selector labels include title, host and persistent window identity.

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
