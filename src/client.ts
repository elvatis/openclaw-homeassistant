import { HAClientLike, HAEntityState, HAServiceDomain, HomeAssistantConfig, JsonMap, PluginConfig } from "./types";

export class HAClient implements HAClientLike {
  private readonly baseUrl: string;

  public constructor(private readonly config: PluginConfig) {
    this.baseUrl = config.url.replace(/\/$/, "");
  }

  public async getConfig(): Promise<HomeAssistantConfig> {
    return this.request<HomeAssistantConfig>("GET", "/api/config");
  }

  public async getStates(): Promise<HAEntityState[]> {
    return this.request<HAEntityState[]>("GET", "/api/states");
  }

  public async getState(entityId: string): Promise<HAEntityState> {
    return this.request<HAEntityState>("GET", `/api/states/${encodeURIComponent(entityId)}`);
  }

  public async getServices(): Promise<HAServiceDomain[]> {
    return this.request<HAServiceDomain[]>("GET", "/api/services");
  }

  public async callService(domain: string, service: string, serviceData: JsonMap = {}): Promise<unknown> {
    return this.request<unknown>("POST", `/api/services/${encodeURIComponent(domain)}/${encodeURIComponent(service)}`, serviceData);
  }

  public async getHistory(startTimestamp: string, entityId?: string, endTimestamp?: string): Promise<unknown> {
    const params = new URLSearchParams();
    if (entityId) {
      params.set("filter_entity_id", entityId);
    }
    if (endTimestamp) {
      params.set("end_time", endTimestamp);
    }

    const suffix = params.toString() ? `?${params.toString()}` : "";
    return this.request<unknown>("GET", `/api/history/period/${encodeURIComponent(startTimestamp)}${suffix}`);
  }

  public async getLogbook(startTimestamp: string, entityId?: string, endTimestamp?: string): Promise<unknown> {
    const params = new URLSearchParams();
    if (entityId) {
      params.set("entity", entityId);
    }
    if (endTimestamp) {
      params.set("end_time", endTimestamp);
    }

    const suffix = params.toString() ? `?${params.toString()}` : "";
    return this.request<unknown>("GET", `/api/logbook/${encodeURIComponent(startTimestamp)}${suffix}`);
  }

  public async renderTemplate(template: string, variables: JsonMap = {}): Promise<unknown> {
    return this.request<unknown>("POST", "/api/template", { template, ...variables });
  }

  public async fireEvent(eventType: string, eventData: JsonMap = {}): Promise<unknown> {
    return this.request<unknown>("POST", `/api/events/${encodeURIComponent(eventType)}`, eventData);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json"
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(`Home Assistant HTTP ${response.status}: ${raw}`);
    }

    if (raw.length === 0) {
      return {} as T;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as T;
    }
  }
}
