import { assertDomainAllowed, assertEntityAllowed, assertToolAllowed, parseEntityId } from "../guards";
import { createTools } from "../tools";
import { HAClientLike, PluginConfig } from "../types";

function makeConfig(overrides: Partial<PluginConfig> = {}): PluginConfig {
  return {
    url: "http://ha.local:8123",
    token: "token",
    allowedDomains: [],
    readOnly: false,
    ...overrides
  };
}

function makeClient(overrides: Partial<HAClientLike> = {}): jest.Mocked<HAClientLike> {
  return {
    getConfig: jest.fn().mockResolvedValue({ version: "2026.2.0" } as any),
    getStates: jest.fn().mockResolvedValue([]),
    getState: jest.fn().mockResolvedValue({ entity_id: "light.kitchen", state: "on", attributes: {} }),
    getServices: jest.fn().mockResolvedValue([]),
    callService: jest.fn().mockResolvedValue({ ok: true }),
    getHistory: jest.fn().mockResolvedValue([]),
    getLogbook: jest.fn().mockResolvedValue([]),
    renderTemplate: jest.fn().mockResolvedValue("ok"),
    fireEvent: jest.fn().mockResolvedValue({ ok: true }),
    ...overrides
  } as jest.Mocked<HAClientLike>;
}

describe("guards", () => {
  test("parseEntityId accepts valid format", () => {
    expect(parseEntityId("light.kitchen_main")).toEqual({ domain: "light", objectId: "kitchen_main" });
  });

  test("parseEntityId rejects invalid format", () => {
    expect(() => parseEntityId("invalid")).toThrow("Invalid entity_id");
  });

  test("assertToolAllowed blocks write tools in readOnly", () => {
    expect(() => assertToolAllowed(makeConfig({ readOnly: true }), "ha_light_on")).toThrow("readOnly=true");
  });

  test("assertDomainAllowed respects allowedDomains", () => {
    expect(() => assertDomainAllowed(makeConfig({ allowedDomains: ["light"] }), "switch")).toThrow("blocked");
  });

  test("assertEntityAllowed checks domain allow-list", () => {
    expect(() => assertEntityAllowed(makeConfig({ allowedDomains: ["sensor"] }), "light.kitchen")).toThrow("blocked");
  });
});

describe("tools", () => {
  test("ha_status calls getConfig", async () => {
    const client = makeClient();
    const tools = createTools({ client, config: makeConfig() });
    await tools.ha_status();
    expect(client.getConfig).toHaveBeenCalledTimes(1);
  });

  test("ha_get_state validates entity_id", async () => {
    const client = makeClient();
    const tools = createTools({ client, config: makeConfig() });
    await expect(tools.ha_get_state({ entity_id: "bad" })).rejects.toThrow("Invalid entity_id");
  });

  test("ha_list_entities filters by domain", async () => {
    const client = makeClient({
      getStates: jest.fn().mockResolvedValue([
        { entity_id: "light.kitchen", state: "on", attributes: {} },
        { entity_id: "switch.fan", state: "off", attributes: {} }
      ])
    });
    const tools = createTools({ client, config: makeConfig() });
    const out = await tools.ha_list_entities({ domain: "light" });
    expect(out).toHaveLength(1);
    expect(out[0].entity_id).toBe("light.kitchen");
  });

  test("ha_list_entities returns all when no filters given", async () => {
    const client = makeClient({
      getStates: jest.fn().mockResolvedValue([
        { entity_id: "light.kitchen", state: "on", attributes: {} },
        { entity_id: "switch.fan", state: "off", attributes: {} },
        { entity_id: "sensor.temp", state: "22", attributes: {} }
      ])
    });
    const tools = createTools({ client, config: makeConfig() });
    const out = await tools.ha_list_entities();
    expect(out).toHaveLength(3);
  });

  test("ha_list_entities filters by state", async () => {
    const client = makeClient({
      getStates: jest.fn().mockResolvedValue([
        { entity_id: "light.kitchen", state: "on", attributes: {} },
        { entity_id: "light.bedroom", state: "off", attributes: {} },
        { entity_id: "switch.fan", state: "on", attributes: {} }
      ])
    });
    const tools = createTools({ client, config: makeConfig() });
    const out = await tools.ha_list_entities({ state: "on" });
    expect(out).toHaveLength(2);
    expect(out.map((e: any) => e.entity_id)).toEqual(["light.kitchen", "switch.fan"]);
  });

  test("ha_list_entities filters by area", async () => {
    const client = makeClient({
      getStates: jest.fn().mockResolvedValue([
        { entity_id: "light.kitchen", state: "on", attributes: { area_id: "kitchen" } },
        { entity_id: "light.bedroom", state: "on", attributes: { area_id: "bedroom" } },
        { entity_id: "switch.fan", state: "on", attributes: {} }
      ])
    });
    const tools = createTools({ client, config: makeConfig() });
    const out = await tools.ha_list_entities({ area: "kitchen" });
    expect(out).toHaveLength(1);
    expect(out[0].entity_id).toBe("light.kitchen");
  });

  test("ha_list_entities respects allowedDomains config", async () => {
    const client = makeClient({
      getStates: jest.fn().mockResolvedValue([
        { entity_id: "light.kitchen", state: "on", attributes: {} },
        { entity_id: "switch.fan", state: "off", attributes: {} },
        { entity_id: "sensor.temp", state: "22", attributes: {} }
      ])
    });
    const tools = createTools({ client, config: makeConfig({ allowedDomains: ["light", "sensor"] }) });
    const out = await tools.ha_list_entities();
    expect(out).toHaveLength(2);
    expect(out.map((e: any) => e.entity_id).sort()).toEqual(["light.kitchen", "sensor.temp"]);
  });

  test("ha_list_entities rejects domain not in allowedDomains", async () => {
    const client = makeClient({
      getStates: jest.fn().mockResolvedValue([
        { entity_id: "light.kitchen", state: "on", attributes: {} },
        { entity_id: "switch.fan", state: "off", attributes: {} }
      ])
    });
    const tools = createTools({ client, config: makeConfig({ allowedDomains: ["light"] }) });
    await expect(tools.ha_list_entities({ domain: "switch" })).rejects.toThrow("blocked");
  });

  test("ha_search_entities matches friendly_name", async () => {
    const client = makeClient({
      getStates: jest.fn().mockResolvedValue([
        { entity_id: "light.kitchen", state: "on", attributes: { friendly_name: "Kitchen Main" } }
      ])
    });
    const tools = createTools({ client, config: makeConfig() });
    const out = await tools.ha_search_entities({ pattern: "kitchen" });
    expect(out).toHaveLength(1);
  });

  test("ha_light_on sends service call", async () => {
    const client = makeClient();
    const tools = createTools({ client, config: makeConfig() });
    await tools.ha_light_on({ entity_id: "light.kitchen", brightness: 120 });
    expect(client.callService).toHaveBeenCalledWith("light", "turn_on", expect.objectContaining({ entity_id: "light.kitchen", brightness: 120 }));
  });

  test("ha_light_on blocked in readOnly", async () => {
    const client = makeClient();
    const tools = createTools({ client, config: makeConfig({ readOnly: true }) });
    await expect(tools.ha_light_on({ entity_id: "light.kitchen" })).rejects.toThrow("readOnly=true");
  });

  test("ha_media_volume validates range", async () => {
    const client = makeClient();
    const tools = createTools({ client, config: makeConfig() });
    await expect(tools.ha_media_volume({ entity_id: "media_player.living", volume_level: 1.2 })).rejects.toThrow("between 0.0 and 1.0");
  });

  test("ha_cover_position validates range", async () => {
    const client = makeClient();
    const tools = createTools({ client, config: makeConfig() });
    await expect(tools.ha_cover_position({ entity_id: "cover.blind", position: 120 })).rejects.toThrow("between 0 and 100");
  });

  test("ha_call_service enforces allowedDomains", async () => {
    const client = makeClient();
    const tools = createTools({ client, config: makeConfig({ allowedDomains: ["light"] }) });
    await expect(tools.ha_call_service({ domain: "switch", service: "turn_on" })).rejects.toThrow("blocked");
  });

  test("ha_call_service executes generic call", async () => {
    const client = makeClient();
    const tools = createTools({ client, config: makeConfig() });
    await tools.ha_call_service({ domain: "light", service: "turn_on", service_data: { entity_id: "light.kitchen" } });
    expect(client.callService).toHaveBeenCalledWith("light", "turn_on", { entity_id: "light.kitchen" });
  });

  test("ha_history defaults start time", async () => {
    const client = makeClient();
    const tools = createTools({ client, config: makeConfig() });
    await tools.ha_history({ entity_id: "sensor.temp" });
    expect(client.getHistory).toHaveBeenCalledWith(expect.any(String), "sensor.temp", undefined);
  });

  test("ha_render_template passes template", async () => {
    const client = makeClient();
    const tools = createTools({ client, config: makeConfig() });
    await tools.ha_render_template({ template: "{{ 1 + 1 }}" });
    expect(client.renderTemplate).toHaveBeenCalledWith("{{ 1 + 1 }}", {});
  });

  test("ha_notify calls notify service", async () => {
    const client = makeClient();
    const tools = createTools({ client, config: makeConfig() });
    await tools.ha_notify({ target: "mobile_app_phone", message: "hello" });
    expect(client.callService).toHaveBeenCalledWith("notify", "mobile_app_phone", { message: "hello" });
  });

  test("ha_sensor_list returns only sensors", async () => {
    const client = makeClient({
      getStates: jest.fn().mockResolvedValue([
        { entity_id: "sensor.temp", state: "20", attributes: {} },
        { entity_id: "light.kitchen", state: "on", attributes: {} }
      ])
    });
    const tools = createTools({ client, config: makeConfig() });
    const out = await tools.ha_sensor_list();
    expect(out).toHaveLength(1);
    expect(out[0].entity_id).toBe("sensor.temp");
  });
});
