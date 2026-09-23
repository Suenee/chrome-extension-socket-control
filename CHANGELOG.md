# Changelog

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
