# T-001: Home Assistant REST API + WebSocket API Research

> Researched: 2026-02-27
> Sources: https://developers.home-assistant.io/docs/api/rest/, https://developers.home-assistant.io/docs/api/websocket/, https://developers.home-assistant.io/docs/auth_api/

## 1. Authentication

All API access uses Bearer token authentication:

```
Authorization: Bearer <TOKEN>
```

Token types:
- **Long-Lived Access Token (LLAT)**: Valid for 10 years. Created via HA profile page or WebSocket `auth/long_lived_access_token` command. Best for third-party integrations.
- **Short-Lived Access Token**: 30-minute TTL, obtained via OAuth2 authorization code grant.
- **Refresh Tokens**: Used to obtain new short-lived access tokens without re-authorization.
- **Signed Paths**: Temporary authenticated URLs with 30-second default expiry for single-use scenarios (file downloads).

**Our implementation uses LLAT** - correct choice for a plugin that runs autonomously.

## 2. REST API - Complete Endpoint Reference

Base URL: `http://<host>:<port>` (default port 8123)

### GET Endpoints

| Endpoint | Description | Response |
|----------|-------------|----------|
| `GET /api/` | Health check - is API running? | `{"message": "API running."}` |
| `GET /api/config` | Instance config (version, location, components, units) | JSON config object |
| `GET /api/components` | List of currently loaded integrations | String array |
| `GET /api/events` | List event types with listener counts | Array of `{event, listener_count}` |
| `GET /api/services` | All services grouped by domain | Array of domain/service objects |
| `GET /api/states` | All entity states | Array of state objects |
| `GET /api/states/<entity_id>` | Single entity state (404 if not found) | State object |
| `GET /api/history/period/<timestamp>` | State change history | Nested array of state changes |
| `GET /api/logbook/<timestamp>` | Logbook entries | Array of logbook entries |
| `GET /api/error_log` | Current session error log | Plain text |
| `GET /api/camera_proxy/<entity_id>` | Camera image data | Binary image |
| `GET /api/calendars` | List calendar entities | Array of `{entity_id, name}` |
| `GET /api/calendars/<entity_id>` | Calendar events in range | Array of event objects |

### POST Endpoints

| Endpoint | Description | Body | Response |
|----------|-------------|------|----------|
| `POST /api/states/<entity_id>` | Create/update entity state | `{state, attributes?}` | State object (200=update, 201=create) |
| `POST /api/events/<event_type>` | Fire an event | Optional event_data JSON | `{"message": "Event X fired."}` |
| `POST /api/services/<domain>/<service>` | Call a service | Optional service_data JSON | Array of changed states |
| `POST /api/template` | Render Jinja2 template | `{template}` | Plain text result |
| `POST /api/config/core/check_config` | Validate configuration | Empty | `{result, errors?}` |
| `POST /api/intent/handle` | Handle intent | `{name, data}` | Intent result |

### DELETE Endpoints

| Endpoint | Description |
|----------|-------------|
| `DELETE /api/states/<entity_id>` | Remove an entity |

### Query Parameters (History/Logbook)

**`GET /api/history/period/<timestamp>`**:
- `filter_entity_id` - comma-separated entity IDs (recommended for performance)
- `end_time` - ISO 8601 timestamp
- `minimal_response` - strip attributes for smaller payload
- `no_attributes` - exclude all attributes
- `significant_changes_only` - filter minor changes

**`GET /api/logbook/<timestamp>`**:
- `entity` - single entity ID filter
- `end_time` - ISO 8601 timestamp

**`POST /api/services/<domain>/<service>`**:
- `?return_response` - include service response data alongside changed states

### State Object Shape

```json
{
  "entity_id": "light.living_room",
  "state": "on",
  "attributes": {
    "friendly_name": "Living Room",
    "brightness": 255,
    "color_temp": 370
  },
  "last_changed": "2024-01-01T00:00:00+00:00",
  "last_updated": "2024-01-01T00:00:00+00:00",
  "context": {
    "id": "abc123",
    "parent_id": null,
    "user_id": null
  }
}
```

## 3. WebSocket API - Complete Reference

Connection URL: `ws://<host>:<port>/api/websocket` (or `wss://` for TLS)

### Authentication Flow

```
Client connects
  <- {"type": "auth_required", "ha_version": "2024.1.0"}
  -> {"type": "auth", "access_token": "LLAT_TOKEN"}
  <- {"type": "auth_ok", "ha_version": "2024.1.0"}
  (optional) -> {"id": 1, "type": "supported_features", "features": {"coalesce_messages": 1}}
  ... command phase ...
```

### Message Format

All post-auth messages include:
- `id` (integer) - monotonically increasing, used for request/response correlation
- `type` (string) - message type

### Server Response Format

```json
{"id": 1, "type": "result", "success": true, "result": { ... }}
```

Error response:
```json
{"id": 1, "type": "result", "success": false, "error": {"code": "error_code", "message": "Human-readable message"}}
```

### All WebSocket Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `auth_required` | Server -> Client | Initiates authentication |
| `auth` | Client -> Server | Submits access token |
| `auth_ok` | Server -> Client | Authentication succeeded |
| `auth_invalid` | Server -> Client | Authentication failed |
| `supported_features` | Client -> Server | Declare client capabilities (e.g. `coalesce_messages`) |
| `subscribe_events` | Client -> Server | Subscribe to event bus (optionally filtered by `event_type`) |
| `event` | Server -> Client | Delivers events matching subscription |
| `subscribe_trigger` | Client -> Server | Subscribe to automation trigger matches |
| `unsubscribe_events` | Client -> Server | Cancel a subscription by ID |
| `fire_event` | Client -> Server | Emit custom events |
| `call_service` | Client -> Server | Execute a service (domain, service, service_data, target) |
| `get_states` | Client -> Server | Fetch all entity states |
| `get_config` | Client -> Server | Retrieve instance config |
| `get_services` | Client -> Server | List available services |
| `get_panels` | Client -> Server | Query registered UI panels |
| `ping` | Client -> Server | Heartbeat ping |
| `pong` | Server -> Client | Heartbeat response |
| `validate_config` | Client -> Server | Test trigger/condition/action configs |
| `extract_from_target` | Client -> Server | Resolve entities from target selectors |
| `get_triggers_for_target` | Client -> Server | Find applicable triggers for entity/device |
| `get_conditions_for_target` | Client -> Server | Find applicable conditions for entity/device |
| `get_services_for_target` | Client -> Server | Find applicable services for entity/device |
| `result` | Server -> Client | Generic command response |

### WebSocket vs REST: When to Use Which

| Use Case | REST | WebSocket |
|----------|------|-----------|
| One-off state queries | Yes (simpler) | Yes |
| Service calls | Yes | Yes |
| Real-time state updates | No | Yes (subscribe_events) |
| Trigger subscriptions | No | Yes (subscribe_trigger) |
| Event bus listening | No | Yes |
| Batch operations | REST is fine | WS avoids per-request overhead |
| Template rendering | Yes | No dedicated command |
| History/logbook | Yes | No dedicated command |
| Camera proxy | Yes | No |
| Error log | Yes | No |

## 4. Implementation Coverage Analysis

### Endpoints we use (client.ts)

| Endpoint | Client Method | Status |
|----------|--------------|--------|
| `GET /api/` | `checkConnection()` | Implemented |
| `GET /api/config` | `getConfig()` | Implemented |
| `GET /api/states` | `getStates()` | Implemented |
| `GET /api/states/<id>` | `getState(entityId)` | Implemented |
| `GET /api/services` | `getServices()` | Implemented |
| `POST /api/services/<d>/<s>` | `callService(domain, service, data)` | Implemented |
| `GET /api/history/period/<ts>` | `getHistory(start, entityId?, end?)` | Implemented |
| `GET /api/logbook/<ts>` | `getLogbook(start, entityId?, end?)` | Implemented |
| `POST /api/template` | `renderTemplate(template, vars)` | Implemented |
| `POST /api/events/<type>` | `fireEvent(eventType, data)` | Implemented |

### Endpoints we do NOT use (intentionally omitted)

| Endpoint | Reason |
|----------|--------|
| `GET /api/components` | Low value for AI agent - config already contains components list |
| `GET /api/events` | Listing event types rarely useful for agent tool calls |
| `POST /api/states/<id>` | Creating/modifying states directly is dangerous for agent use |
| `DELETE /api/states/<id>` | Deleting entities is dangerous for agent use |
| `GET /api/error_log` | Debugging tool, not useful for smart home control |
| `GET /api/camera_proxy/<id>` | Binary data - not easily consumed by LLM tools |
| `GET /api/calendars` | Future enhancement candidate |
| `GET /api/calendars/<id>` | Future enhancement candidate |
| `POST /api/config/core/check_config` | Admin-only, not relevant to device control |
| `POST /api/intent/handle` | Intent handling is separate from direct API control |

### WebSocket: Why we use REST-only

Decision: **REST-only** (no WebSocket dependency) for these reasons:

1. **Simplicity**: REST uses built-in `fetch()` - zero runtime dependencies.
2. **Stateless**: Each tool call is a single request/response. No connection management.
3. **Agent pattern fit**: AI tools are request/response by nature, not long-lived streams.
4. **Reliability**: No reconnection logic, heartbeat management, or message ordering.
5. **Portability**: Works in any Node.js >= 18 environment with no native modules.

WebSocket would only be valuable for real-time state subscription (e.g., "notify me when the door opens"), which is outside our current tool-based agent scope. If we add subscription-based tools later, WebSocket can be added as an optional transport.

## 5. Potential Improvements Identified

### Low-effort, high-value

1. **`?return_response` for service calls** - Some services (e.g., `weather.get_forecast`) return data via `service_response`. We could add an optional `return_response` parameter to `ha_call_service`.

2. **`minimal_response` and `no_attributes` for history** - Our `getHistory()` could accept these query params to reduce payload size for large history queries.

3. **Calendar tools** - `GET /api/calendars` and `GET /api/calendars/<id>` are clean, read-only endpoints that would be useful for scheduling-aware AI agents.

### Medium-effort

4. **WebSocket event subscription** - For real-time monitoring use cases, a `ha_subscribe_events` tool could open a WebSocket and relay events. Requires connection lifecycle management.

5. **`POST /api/states/<entity_id>`** - Virtual sensor creation (e.g., AI-computed states). Would need careful guarding.

## 6. Correctness Verification

Checked current `client.ts` against official HA REST API docs:

| Check | Result |
|-------|--------|
| Auth header format (`Bearer TOKEN`) | Correct |
| `Content-Type: application/json` on all requests | Correct |
| GET /api/ for health check | Correct |
| GET /api/config response shape | Correct (HomeAssistantConfig type matches) |
| GET /api/states returns array | Correct |
| GET /api/states/<id> returns single state | Correct (404 on not found) |
| GET /api/services returns domain array | Correct |
| POST /api/services/<d>/<s> with body | Correct |
| GET /api/history/period/<ts> with query params | Correct (`filter_entity_id`, `end_time`) |
| GET /api/logbook/<ts> with query params | Correct (`entity`, `end_time`) |
| POST /api/template with `{template}` body | Correct |
| POST /api/events/<type> with optional body | Correct |
| Entity ID encoding in URL paths | Correct (uses `encodeURIComponent`) |
| Timeout handling | Correct (30s AbortController) |
| Error handling (non-2xx response) | Correct (HAClientError with statusCode + body) |

**No issues found.** The client implementation faithfully follows the documented HA REST API.
