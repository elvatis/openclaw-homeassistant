# T-002: Research - home-assistant-js-websocket npm package

> Completed: 2026-02-27

## Package Overview

| Field | Value |
|---|---|
| Package | `home-assistant-js-websocket` |
| Version | 9.6.0 (latest, Nov 2025) |
| License | Apache-2.0 |
| Repo | https://github.com/home-assistant/home-assistant-js-websocket |
| Unpacked size | ~180 KB |
| Runtime deps | **Zero** (no dependencies) |
| TypeScript | Written in TypeScript, ships `dist/index.d.ts` |
| Module formats | ESM (`dist/index.js`), CJS (`dist/haws.cjs`), UMD (`dist/haws.umd.js`) |
| Maturity | Active since 2016, 100+ releases, official HA project |

## Public API Surface

### Authentication

- **`getAuth(options)`** - OAuth2 browser-based auth flow (not useful for server-side)
- **`createLongLivedTokenAuth(hassUrl, accessToken)`** - Creates an `Auth` instance from a Long-Lived Access Token. This is the relevant entry point for server-side / Node.js usage.

### Connection

- **`createConnection(options?: Partial<ConnectionOptions>)`** - Establishes a WebSocket connection to HA
- **`Connection` class** - manages the WebSocket lifecycle
  - `sendMessage(msg)` / `sendMessagePromise<T>(msg)` - send raw WS messages
  - `subscribeEvents<T>(callback, eventType?)` - subscribe to HA events
  - `subscribeMessage<T>(callback, subscribeMessage, options?)` - subscribe to backend subscriptions
  - `ping()` - keep-alive
  - `close()` / `suspend()` / `reconnect(force?)` - lifecycle
  - Events: `ready`, `disconnected`, `reconnect-error`

### ConnectionOptions

```typescript
type ConnectionOptions = {
  setupRetry: number;
  auth?: Auth;
  createSocket: (options: ConnectionOptions) => Promise<HaWebSocket>;
};
```

The `createSocket` parameter allows injecting a custom WebSocket implementation - this is how Node.js support works (inject `ws` package).

### Commands (helper functions)

| Function | Signature | REST Equivalent |
|---|---|---|
| `getStates` | `(conn) => Promise<HassEntity[]>` | `GET /api/states` |
| `getServices` | `(conn) => Promise<HassServices>` | `GET /api/services` |
| `getConfig` | `(conn) => Promise<HassConfig>` | `GET /api/config` |
| `getUser` | `(conn) => Promise<HassUser>` | N/A (WS only) |
| `callService` | `(conn, domain, service, data?, target?, returnResponse?)` | `POST /api/services/{domain}/{service}` |

### Subscriptions (real-time)

| Function | Description |
|---|---|
| `subscribeEntities(conn, onChange)` | Subscribe to all entity state changes; uses compressed deltas on HA 2022.4+ |
| `subscribeConfig(conn, onChange)` | Subscribe to config changes |
| `subscribeServices(conn, onChange)` | Subscribe to service registration changes |

### Collections

- **`getCollection<State>(conn, key, fetchFn?, subscribeFn?, options?)`** - Managed data subscriptions with caching, auto-reconnect, unsubscribe grace period (5s)
- Collection instances expose: `.state`, `.refresh()`, `.subscribe(callback)`

### Types (key interfaces)

| Type | Description |
|---|---|
| `HassEntity` | Entity state with `entity_id`, `state`, `attributes`, timestamps, `context` |
| `HassEntities` | `Record<string, HassEntity>` |
| `HassConfig` | HA config: location, units, timezone, version, components |
| `HassService` | Service definition with `description`, `fields`, optional `response` |
| `HassServices` | `Record<domain, Record<service, HassService>>` |
| `HassUser` | User profile: `id`, `name`, `is_admin`, `is_owner` |
| `HassServiceTarget` | Target with `entity_id`, `device_id`, `area_id`, `floor_id`, `label_id` |
| `HassEvent` | Generic event with `event_type`, `data`, `context` |
| `StateChangedEvent` | Typed event for state changes |
| `Context` | `{ id, user_id, parent_id }` |

## Node.js Usage

The library is browser-first. For Node.js:

1. Need a WebSocket polyfill (e.g., `ws` package)
2. Inject via `createSocket` in `ConnectionOptions`, OR set `globalThis.WebSocket`
3. Use `createLongLivedTokenAuth()` instead of `getAuth()` (no browser redirect)

Example Node.js setup:
```typescript
import { createConnection, createLongLivedTokenAuth, createSocket } from "home-assistant-js-websocket";
import WebSocket from "ws";

// Option A: Global polyfill
globalThis.WebSocket = WebSocket;

const auth = createLongLivedTokenAuth("http://homeassistant.local:8123", "YOUR_TOKEN");
const conn = await createConnection({ auth });
```

## Comparison: WS Library vs Our REST Client

| Aspect | REST (our HAClient) | WS (home-assistant-js-websocket) |
|---|---|---|
| **Dependencies** | Zero (native fetch) | +1 (`ws` for Node.js) |
| **Connection model** | Stateless HTTP | Persistent WebSocket |
| **Real-time updates** | Polling only | Native subscriptions |
| **Latency** | HTTP overhead per call | Single connection, low latency |
| **Reconnection** | N/A | Built-in auto-reconnect |
| **Auth** | Bearer token header | `createLongLivedTokenAuth()` |
| **State queries** | `GET /api/states/{id}` | `getStates()` + entity collections |
| **Service calls** | `POST /api/services/...` | `callService()` |
| **Bundle impact** | 0 KB | ~180 KB unpacked (zero runtime deps) |
| **Complexity** | Minimal | Moderate (connection lifecycle) |
| **HA coverage** | Full REST API | Full WS API + subscriptions |
| **Maintenance** | Our code | Official HA team |

## Recommendation for openclaw-homeassistant

### Keep REST as primary transport. Do NOT add this dependency now.

**Reasoning:**

1. **Our use case is request-response**: AI agent tools (get_state, call_service, list_entities) are one-shot request-response operations. REST is simpler and sufficient for this pattern.

2. **No real-time need**: An AI agent does not need persistent state subscriptions. It queries state when the user asks, not continuously.

3. **Zero dependencies**: Our current REST client uses native `fetch` with zero dependencies. Adding `home-assistant-js-websocket` + `ws` adds complexity for no concrete benefit in our tool-calling model.

4. **Bundle size**: Adding ~180 KB for features we do not use is not justified.

5. **Future option**: If real-time state monitoring is ever needed (e.g., "alert me when temperature exceeds X"), the WS library can be added as an optional enhancement behind a feature flag. The `HAClientLike` interface makes this easy - a WS-backed implementation can fulfill the same interface.

### If WS is added later:

- Create a `HAWebSocketClient implements HAClientLike` adapter
- Use `createLongLivedTokenAuth()` with `ws` polyfill
- Expose `subscribeEntities()` for a potential `ha_watch_state` tool
- Keep it optional (don't require `ws` unless WS transport is configured)
