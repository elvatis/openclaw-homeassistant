# @elvatis_com/openclaw-homeassistant

OpenClaw plugin to control and inspect Home Assistant via the REST API.

## Features

- 34 dedicated Home Assistant tools (status, entities, lights, switches, climate, media, covers, scenes/scripts, history, generic service/event/template, notifications)
- Native HA REST client using built-in `fetch` (zero runtime dependencies)
- Safety guards:
  - `readOnly` blocks all write/service actions
  - `allowedDomains` restricts domain access
  - strict `entity_id` validation (`{domain}.{object_id}`)

## Installation

```bash
npm install @elvatis_com/openclaw-homeassistant
```

## Configuration

```json
{
  "plugins": {
    "openclaw-homeassistant": {
      "url": "http://homeassistant.local:8123",
      "token": "YOUR_LONG_LIVED_ACCESS_TOKEN",
      "allowedDomains": ["light", "switch", "sensor", "climate", "media_player"],
      "readOnly": false
    }
  }
}
```

- `url` (required): Home Assistant base URL
- `token` (required): Home Assistant Long-Lived Access Token
- `allowedDomains` (optional): restricts domains (if set)
- `readOnly` (optional): default `false`; when `true`, blocks write tools

## Tool Reference

| Tool | Purpose |
|---|---|
| `ha_status` | Get Home Assistant config/status |
| `ha_list_entities` | List entities (filter by domain/area/state) |
| `ha_get_state` | Get state of one entity |
| `ha_search_entities` | Search entities by pattern (friendly name/entity_id) |
| `ha_list_services` | List available services |
| `ha_light_on` | `light.turn_on` |
| `ha_light_off` | `light.turn_off` |
| `ha_light_toggle` | `light.toggle` |
| `ha_light_list` | List `light.*` entities with color/brightness fields |
| `ha_switch_on` | `switch.turn_on` |
| `ha_switch_off` | `switch.turn_off` |
| `ha_switch_toggle` | `switch.toggle` |
| `ha_climate_set_temp` | `climate.set_temperature` |
| `ha_climate_set_mode` | `climate.set_hvac_mode` |
| `ha_climate_set_preset` | `climate.set_preset_mode` |
| `ha_climate_list` | List `climate.*` entities |
| `ha_media_play` | `media_player.media_play` |
| `ha_media_pause` | `media_player.media_pause` |
| `ha_media_stop` | `media_player.media_stop` |
| `ha_media_volume` | `media_player.volume_set` |
| `ha_media_play_media` | `media_player.play_media` |
| `ha_cover_open` | `cover.open_cover` |
| `ha_cover_close` | `cover.close_cover` |
| `ha_cover_position` | `cover.set_cover_position` |
| `ha_scene_activate` | `scene.turn_on` |
| `ha_script_run` | `script.turn_on` |
| `ha_automation_trigger` | `automation.trigger` |
| `ha_sensor_list` | List `sensor.*` entities |
| `ha_history` | Get history (`/api/history/period/...`) |
| `ha_logbook` | Get logbook entries (`/api/logbook/...`) |
| `ha_call_service` | Generic service call |
| `ha_fire_event` | Fire custom Home Assistant event |
| `ha_render_template` | Render Jinja2 template |
| `ha_notify` | Send `notify/{target}` notification |

## Safety Model

- Read tools remain available in `readOnly` mode.
- Write tools are blocked when `readOnly=true`.
- Domain checks apply to entity tools and generic service calls.
- Invalid entity IDs are rejected early.

## Development

```bash
npm install
npx tsc
npx jest
```

## License

MIT
