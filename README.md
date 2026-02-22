# @elvatis_com/openclaw-homeassistant

OpenClaw plugin for Home Assistant integration. Control devices, read sensors, and trigger automations through natural language.

## Features

- **Entity Control** - Turn on/off lights, switches, covers, and more
- **Sensor Reading** - Get temperature, humidity, power consumption, any sensor state
- **Automation Triggers** - Fire Home Assistant automations and scripts
- **Scene Activation** - Activate predefined scenes
- **Entity Discovery** - List and search entities by domain, area, or name
- **Read-Only Mode** - Optional safety mode that blocks state-changing actions

## Installation

```bash
npm install @elvatis_com/openclaw-homeassistant
```

## Configuration

Add to your `openclaw.json`:

```json
{
  "plugins": {
    "openclaw-homeassistant": {
      "url": "http://homeassistant.local:8123",
      "token": "your-long-lived-access-token",
      "allowedDomains": ["light", "switch", "sensor", "automation", "scene"],
      "readOnly": false
    }
  }
}
```

### Getting a Long-Lived Access Token

1. Open Home Assistant UI
2. Go to your Profile (bottom left)
3. Scroll to "Long-Lived Access Tokens"
4. Click "Create Token"

## Agent Tools

| Tool | Description |
|---|---|
| `ha_list_entities` | List entities, optionally filtered by domain or area |
| `ha_get_state` | Get current state and attributes of an entity |
| `ha_call_service` | Call any HA service (e.g. `light.turn_on`, `switch.toggle`) |
| `ha_trigger_automation` | Trigger an automation by entity_id |
| `ha_activate_scene` | Activate a scene |
| `ha_history` | Get state history for an entity over a time period |

## Safety

- **`readOnly: true`** blocks all state-changing operations (call_service, trigger, scene)
- **`allowedDomains`** restricts which entity domains the agent can interact with
- Destructive domains like `script` and `input_button` are excluded by default

## Development

```bash
git clone https://github.com/homeofe/openclaw-homeassistant
cd openclaw-homeassistant
npm install
npm run build
npm run test
```

## License

MIT
