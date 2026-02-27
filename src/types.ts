export interface PluginConfig {
  url: string;
  token: string;
  allowedDomains?: string[];
  readOnly?: boolean;
}

export interface HomeAssistantConfig {
  latitude: number;
  longitude: number;
  elevation: number;
  unit_system: Record<string, unknown>;
  location_name: string;
  time_zone: string;
  components: string[];
  version: string;
  [key: string]: unknown;
}

export interface HAEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
  context?: Record<string, unknown>;
}

export interface HAServiceField {
  name: string;
  description?: string;
  example?: unknown;
  required?: boolean;
  selector?: Record<string, unknown>;
}

export interface HAService {
  name: string;
  description?: string;
  target?: Record<string, unknown>;
  fields?: Record<string, HAServiceField>;
}

export interface HAServiceDomain {
  domain: string;
  services: Record<string, HAService>;
}

export interface ToolDeps {
  client: HAClientLike;
  config: PluginConfig;
}

export type JsonMap = Record<string, unknown>;

export interface OpenClawApi {
  config?: unknown;
  registerTool?: (name: string, handler: (input: unknown) => Promise<unknown>) => void;
  tool?: (name: string, handler: (input: unknown) => Promise<unknown>) => void;
}

export interface HAClientLike {
  getConfig(): Promise<HomeAssistantConfig>;
  getStates(): Promise<HAEntityState[]>;
  getState(entityId: string): Promise<HAEntityState>;
  getServices(): Promise<HAServiceDomain[]>;
  callService(domain: string, service: string, serviceData?: JsonMap): Promise<unknown>;
  getHistory(startTimestamp: string, entityId?: string, endTimestamp?: string): Promise<unknown>;
  getLogbook(startTimestamp: string, entityId?: string, endTimestamp?: string): Promise<unknown>;
  renderTemplate(template: string, variables?: JsonMap): Promise<unknown>;
  fireEvent(eventType: string, eventData?: JsonMap): Promise<unknown>;
  checkConnection(): Promise<boolean>;
}

export class HAClientError extends Error {
  public readonly statusCode: number;
  public readonly body: string;

  constructor(statusCode: number, body: string) {
    super(`Home Assistant HTTP ${statusCode}: ${body}`);
    this.name = "HAClientError";
    this.statusCode = statusCode;
    this.body = body;
  }
}
