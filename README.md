# Client Socket Control

Client Socket Control exposes Chrome/Brave windows and tabs through the existing VPP v1 / Socket Universe Bridge (SUB) transport so Socket Universe Module (SUM) and other VPP peers can inspect and control the browser.

Current version: **0.14**

## Features

- Manifest V3 extension for Chrome and Brave.
- SUB connection settings: host, port, Socket Box, plain-text API key and auto-connect.
- Connection diagnostics with green/yellow/red/gray status.
- Automatic reconnect and SUB ping/peer diagnostics.
- Authoritative browser window/tab snapshots after admission, peer arrival and browser state changes.
- VPP calls for browser state, tab search/create/close/activate/move/reorder and window create/close/focus.
- Real tab movement via the Chromium Tabs API; tabs are not recreated from their URLs.
- Canonical SUM application manifest in `manifest/chrome_socket_control.json`, versioned independently from the extension (currently **1.00**).

## Install / update

For a fresh local folder, download only `upgrade.cmd` from this repository and run it. The updater can bootstrap the complete repository into that folder. For an existing checkout, run:

```bat
upgrade.cmd
```

The updater follows the Wipe Codes upgrade standard: it self-hands-off outside the mutable working tree, supports local/mapped/UNC repositories, protects tracked local edits, synchronizes `main`, and writes one diagnostic run to `logs\upgrade.log`.

After update, open `chrome://extensions` or `brave://extensions`, enable Developer mode, choose **Load unpacked**, and select this repository folder. When an already-loaded unpacked extension is updated, reload it from the extensions page.

## SUB setup

Open the extension popup and configure the SUB host, port, Socket Box and API key. The API key is intentionally displayed as plain text.

The status indicator means:

- Green: admitted to SUB and at least one permitted peer (normally SUM) is connected.
- Yellow: connecting/reconnecting, or admitted to SUB while waiting for the peer.
- Red: disconnected/error.
- Gray: connection disabled by the user.

Auto-connect is enabled by default.

SUB currently uses a URL of the form:

```text
ws://HOST:PORT/mailbox/SOCKET_BOX?apiKey=API_KEY
```

The extension performs VPP `registerConnection` admission and server `ping` diagnostics. It does not hard-code the SUM Socket Box name; peer availability comes from SUB's routing-aware ping response.

## Permissions

The `tabs` permission is required because URL/title are part of the automation contract. The extension also uses `storage` for local settings and diagnostics.

## Protocol

Generic VPP semantics remain defined by `Suenee/companion-module-voiceprompter/PROTOCOL.md`. This repository documents only its browser-specific contract in `PROTOCOL.md`.

## Runtime diagnostics

Browser extensions cannot write arbitrary files directly into their installation directory. Runtime diagnostics therefore use a bounded local diagnostic ring in `chrome.storage.local`. Upgrade diagnostics are file based and always use `logs\upgrade.log`.

## Development rules

GitHub-facing documentation is English. New application identifiers use English snake_case; VPP method/event names use the established camelCase convention. Generic transport/routing behavior belongs to SUB/VPP, not this extension.
