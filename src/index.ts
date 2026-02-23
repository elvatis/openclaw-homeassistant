import pluginManifest from "../openclaw.plugin.json";
import { HAClient } from "./client";
import { createTools } from "./tools";
import { OpenClawApi, PluginConfig } from "./types";

function ensureConfig(config: Partial<PluginConfig>): PluginConfig {
  if (!config.url || !config.token) {
    throw new Error("Missing required config: url, token");
  }

  return {
    url: config.url,
    token: config.token,
    allowedDomains: config.allowedDomains ?? [],
    readOnly: config.readOnly ?? false
  };
}

const TOOL_NAMES = [
  "ha_status",
  "ha_list_entities",
  "ha_get_state",
  "ha_search_entities",
  "ha_list_services",
  "ha_light_on",
  "ha_light_off",
  "ha_light_toggle",
  "ha_light_list",
  "ha_switch_on",
  "ha_switch_off",
  "ha_switch_toggle",
  "ha_climate_set_temp",
  "ha_climate_set_mode",
  "ha_climate_set_preset",
  "ha_climate_list",
  "ha_media_play",
  "ha_media_pause",
  "ha_media_stop",
  "ha_media_volume",
  "ha_media_play_media",
  "ha_cover_open",
  "ha_cover_close",
  "ha_cover_position",
  "ha_scene_activate",
  "ha_script_run",
  "ha_automation_trigger",
  "ha_sensor_list",
  "ha_history",
  "ha_logbook",
  "ha_call_service",
  "ha_fire_event",
  "ha_render_template",
  "ha_notify"
] as const;

export default function init(api: OpenClawApi): void {
  const config = ensureConfig((api.config ?? {}) as Partial<PluginConfig>);
  const client = new HAClient(config);
  const tools = createTools({ client, config });

  const register = api.registerTool ?? api.tool;
  if (!register) {
    throw new Error("OpenClaw API does not expose registerTool/tool.");
  }

  TOOL_NAMES.forEach((name) => {
    register(name, async (input) => (tools as Record<string, (arg: unknown) => Promise<unknown>>)[name](input));
  });
}

export const manifest = pluginManifest;
export { createTools } from "./tools";
export { HAClient } from "./client";
export { assertToolAllowed, assertDomainAllowed, assertEntityAllowed, parseEntityId } from "./guards";
