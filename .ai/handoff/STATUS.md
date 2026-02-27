# openclaw-homeassistant - Status

> Last updated: 2026-02-22 (initial setup)
> Phase: P0 - Project initialized, not yet started

## Project Overview

**Package:** `@elvatis/openclaw-homeassistant`
**Repo:** https://github.com/homeofe/openclaw-homeassistant
**Purpose:** Bridge OpenClaw with Home Assistant - control devices, read sensors, trigger automations via AI.

## Build Health

| Component         | Status       | Notes                              |
| ----------------- | ------------ | ---------------------------------- |
| Repo / Structure  | (Verified)   | Initialized 2026-02-22             |
| Plugin manifest   | (Unknown)    | Not yet created                    |
| HA REST client    | (Unknown)    | Not yet implemented                |
| Agent tools       | (Unknown)    | Not yet implemented                |
| Tests             | (Unknown)    | Not yet created                    |
| npm publish       | (Unknown)    | Not yet published                  |

## Architecture Decision

- **Transport:** Home Assistant REST API + optional WebSocket for state subscriptions
- **Auth:** Long-Lived Access Token (LLAT) from HA profile
- **Agent Tools:** ha_get_state, ha_list_entities, ha_call_service, ha_trigger_automation
- **Safety:** readOnly mode (default off); allowedDomains allowlist
- **npm dep:** `home-assistant-js-websocket` or plain fetch

## Open Questions

- Emre's HA instance URL and setup (local or cloud?)
- Which devices/domains to expose first
- WebSocket subscriptions needed (real-time events) or REST-only sufficient?
