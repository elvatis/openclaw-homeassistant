# @elvatis/openclaw-homeassistant

OpenClaw plugin for Home Assistant integration. Control smart home devices, query sensor states, and trigger automations directly through your AI assistant.

## What it does

Bridges OpenClaw with a local Home Assistant instance via the REST API and WebSocket. Exposes HA entities as agent tools - the AI can read sensor values, control lights/switches/covers, and trigger automations in natural language.

## Use cases

- "Turn off all lights in the living room"
- "What's the current temperature in the bedroom?"
- "Is the front door locked?"
- "Trigger the 'Good morning' automation"
- "Set the thermostat to 21 degrees"

## Architecture

```
OpenClaw (agent)
  └── @elvatis/openclaw-homeassistant plugin
        └── REST/WebSocket → Home Assistant
              ├── GET /api/states (entity states)
              ├── POST /api/services (call services)
              └── WS /api/websocket (events/subscriptions)
```

## Installation

```bash
openclaw plugins install @elvatis/openclaw-homeassistant
```

## Configuration

```json
{
  "plugins": {
    "entries": {
      "openclaw-homeassistant": {
        "config": {
          "url": "http://homeassistant.local:8123",
          "token": "your-long-lived-access-token",
          "allowedDomains": ["light", "switch", "climate", "cover", "sensor", "automation"],
          "readOnly": false
        }
      }
    }
  }
}
```

## Agent Tools registered

- `ha_get_state` - Get the current state of an entity
- `ha_list_entities` - List entities by domain
- `ha_call_service` - Call a Home Assistant service
- `ha_trigger_automation` - Trigger an automation by name or entity_id

## Status

Work in progress. See `.ai/handoff/STATUS.md` for current build state.
