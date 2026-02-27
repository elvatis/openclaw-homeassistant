# T-004 Architecture Decision Record

## Status: Accepted
## Date: 2026-02-27

---

## 1. Transport: REST API (not WebSocket)

### Decision
Use the Home Assistant REST API exclusively. Do not use the WebSocket API or the `home-assistant-js-websocket` npm package.

### Context
Home Assistant exposes two primary APIs:
- **REST API** - stateless HTTP endpoints under `/api/` (states, services, history, config, template, events, logbook)
- **WebSocket API** - persistent connection at `/api/websocket` for real-time subscriptions and two-way communication

The `home-assistant-js-websocket` package (researched in T-002) provides a typed client for the WebSocket API with auto-reconnect, auth flows, and subscription helpers.

### Rationale

| Factor | REST | WebSocket |
|--------|------|-----------|
| Complexity | Stateless, one fetch per call | Persistent connection, reconnect logic, message routing |
| Dependencies | Zero (Node 18+ built-in fetch) | Requires `home-assistant-js-websocket` (20+ KB) |
| Latency | ~10-50ms per call (HTTP overhead) | ~1-5ms per message (open connection) |
| Use case fit | On-demand tool calls from AI agent | Real-time dashboards, continuous state streams |
| Reliability | Each call independent, no state to lose | Connection drops require reconnect + resubscribe |
| Concurrency | Trivially parallel (multiple fetch) | Single connection, multiplexed messages |

**Key insight:** An AI agent calls tools on-demand, not continuously. The latency difference (10-50ms vs 1-5ms) is negligible when the AI model's own response takes 500-5000ms. The simplicity and zero-dependency benefits of REST outweigh WebSocket's latency advantage.

**Future path:** If real-time state subscriptions become needed (e.g., for event-driven automations), WebSocket support can be added as an optional transport behind the same `HAClientLike` interface without breaking the REST-based default.

### Consequences
- Zero runtime dependencies (only Node.js built-in `fetch`)
- No connection management, reconnect logic, or heartbeat handling
- Each tool call is an independent HTTP request
- No real-time push capability (polling required if continuous monitoring is needed)

---

## 2. Authentication: Long-Lived Access Token (LLAT)

### Decision
Authenticate using Home Assistant Long-Lived Access Tokens passed via `Authorization: Bearer {token}` header.

### Rationale
- LLATs are the standard auth method for programmatic HA access
- Simple to create (HA profile page -> Security -> Long-Lived Access Tokens)
- No OAuth flow, refresh rotation, or session management needed
- Token is passed once at config time, reused for all requests
- Suitable for server-side plugins running unattended

### Consequences
- Token must be stored securely by the host application (not by this plugin)
- Token has no expiry by default (user must manually revoke)
- One token per HA instance

---

## 3. Config Schema

### Decision
Four config properties with runtime validation:

```typescript
interface PluginConfig {
  url: string;           // Required - HA base URL (http:// or https://)
  token: string;         // Required - Long-Lived Access Token
  allowedDomains?: string[];  // Optional - restrict to these HA domains
  readOnly?: boolean;    // Optional - block all write tools (default: false)
}
```

### Validation rules
- `url`: Must be a non-empty string starting with `http://` or `https://`. Trailing slashes are stripped.
- `token`: Must be a non-empty string after trimming.
- `allowedDomains`: Optional array. Each element must be a non-empty string. Values are normalized to lowercase. Empty array or omitted = all domains allowed.
- `readOnly`: Optional boolean. Defaults to `false`. When `true`, all 23 write tools throw before executing.

### Schema format
The config schema is defined in three places:
1. **TypeScript interface** (`src/types.ts: PluginConfig`) - compile-time safety
2. **JSON Schema** (`openclaw.plugin.json: configSchema`) - OpenClaw plugin manifest
3. **Runtime validator** (`src/config.ts: validateConfig()`) - startup-time validation with descriptive error messages

---

## 4. Tool Signatures

### Convention
All 34 tools follow a consistent pattern:

```
tool_name(input: ToolInput) -> Promise<ToolOutput>
```

**Naming:** `ha_{domain}_{action}` or `ha_{action}` for cross-domain tools.

**Input types** are exported from `src/types.ts` as named interfaces (e.g., `LightOnInput`, `EntityIdInput`). A complete `ToolInputMap` maps each tool name to its input type.

**Output:** All tools return `Promise<unknown>` since HA API responses vary by endpoint. Consumers should type-narrow results based on the tool called.

### Tool categories

| Category | Tools (count) | Read/Write |
|----------|--------------|------------|
| Status & Discovery | ha_status, ha_list_entities, ha_get_state, ha_search_entities, ha_list_services (5) | Read |
| Lights | ha_light_on, ha_light_off, ha_light_toggle, ha_light_list (4) | 3 Write, 1 Read |
| Switches | ha_switch_on, ha_switch_off, ha_switch_toggle (3) | Write |
| Climate | ha_climate_set_temp, ha_climate_set_mode, ha_climate_set_preset, ha_climate_list (4) | 3 Write, 1 Read |
| Media Player | ha_media_play, ha_media_pause, ha_media_stop, ha_media_volume, ha_media_play_media (5) | Write |
| Covers | ha_cover_open, ha_cover_close, ha_cover_position (3) | Write |
| Scenes & Scripts | ha_scene_activate, ha_script_run, ha_automation_trigger (3) | Write |
| Sensors & History | ha_sensor_list, ha_history, ha_logbook (3) | Read |
| Generic | ha_call_service, ha_fire_event, ha_render_template, ha_notify (4) | 3 Write, 1 Read |
| **Total** | **34** | **11 Read, 23 Write** |

### Input patterns

Most tools accept one of these input shapes:

1. **No input** (`EmptyInput`): ha_status, ha_list_services, ha_light_list, ha_climate_list, ha_sensor_list
2. **Entity ID only** (`EntityIdInput`): ha_light_off, ha_light_toggle, ha_switch_*, ha_media_play/pause/stop, ha_cover_open/close, ha_scene_activate
3. **Entity ID + parameters**: ha_light_on (brightness, color_temp, rgb_color, transition), ha_climate_set_temp (temperature), ha_media_volume (volume_level), ha_cover_position (position), etc.
4. **Optional filters** (`ListEntitiesInput`): ha_list_entities (domain, area, state)
5. **Time range** (`HistoryInput`): ha_history, ha_logbook (entity_id, start, end)
6. **Generic** (`CallServiceInput`): ha_call_service (domain, service, service_data)

---

## 5. Safety Model (3-tier)

### Layer 1: readOnly mode
When `config.readOnly = true`, all 23 write tools throw `"Tool {name} is blocked because readOnly=true"` before making any API call.

### Layer 2: allowedDomains allowlist
When `config.allowedDomains` is non-empty, only entities/services in the listed domains are accessible. Both read and write tools enforce this.

### Layer 3: Entity ID validation
All entity IDs are validated against `/^[a-z0-9_]+\.[a-z0-9_]+$/` before reaching the HA API. This prevents injection via crafted entity IDs.

### Guard ordering
For write tools: `assertToolAllowed` (readOnly) -> `assertEntityAllowed` (format + domain) -> API call.

---

## 6. Client Architecture

```
OpenClaw Host
  |
  init(api) -- validates config, creates HAClient, registers 34 tools
  |
  HAClient (src/client.ts)
    - Uses Node.js built-in fetch (no runtime deps)
    - 30s timeout via AbortController
    - Bearer token auth on every request
    - Base URL normalization (strip trailing slash)
    - Typed methods for each HA REST endpoint
    |
    v
  Home Assistant REST API (/api/*)
```

### HAClientLike interface
The client is abstracted behind `HAClientLike` for testability. All 10 methods are defined in the interface, allowing mock implementations in tests without hitting a real HA instance.

---

## 7. Dependency Philosophy

**Zero runtime dependencies.** The only requirements are Node.js >= 18 (for built-in `fetch`) and the OpenClaw plugin host.

Dev dependencies (TypeScript, Jest, ts-jest) are used only during development and testing. The published package contains only compiled JavaScript and type declarations.
