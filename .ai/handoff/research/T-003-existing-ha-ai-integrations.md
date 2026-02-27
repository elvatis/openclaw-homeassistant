# T-003: Research - Existing HA + AI Assistant Integrations (Gaps to Fill)

> Completed: 2026-02-27

## Executive Summary

The Home Assistant + AI ecosystem splits into two categories: (1) **HA-native conversation agents** that run inside HA and use its Assist pipeline, and (2) **external MCP servers** that expose HA to AI tools outside HA. openclaw-homeassistant is category 2 - an external plugin that gives an AI agent (OpenClaw) direct HA control via REST. This document maps the landscape and identifies gaps our plugin uniquely fills.

---

## Category 1: HA-Native Conversation Agents

These integrations run inside Home Assistant as conversation agents, using the built-in Assist pipeline and intent system.

### 1.1 Built-in Assist (No LLM)

- **What it does**: HA's built-in voice/text assistant powered by intent matching (no AI model).
- **47 built-in intents**: HassTurnOn, HassTurnOff, HassGetState, HassLightSet, HassClimateSetTemperature, HassMediaPause, HassSetPosition, timer management, shopping lists, weather, etc.
- **Limitations**:
  - Pattern-matching only - no natural language understanding beyond sentence templates
  - No reasoning, no context, no multi-step planning
  - Custom sentences require YAML definitions per language
  - Cannot answer "why" questions or explain device states

### 1.2 OpenAI Conversation (Official Integration)

| Aspect | Details |
|---|---|
| Model | GPT-4o-mini (default), configurable |
| Transport | Cloud API (OpenAI servers) |
| HA access | Via Assist API intents on exposed entities only |
| Features | Custom instructions, image generation, web search (GPT-4o+), camera image analysis |
| Limitations | Cloud-only, no sentence triggers, cost monitoring required, limited to exposed entities |

### 1.3 Anthropic/Claude Conversation (Official Integration)

| Aspect | Details |
|---|---|
| Model | Claude (various versions), configurable |
| Transport | Cloud API (Anthropic servers) |
| HA access | Via Assist API intents on exposed entities only |
| Features | Custom instructions, extended thinking, web search, AI task entities |
| Limitations | Cloud-only, no sentence triggers, paid API, limited to exposed entities |

### 1.4 Google Gemini Conversation (Official Integration)

| Aspect | Details |
|---|---|
| Model | Gemini (various versions) |
| Transport | Cloud API (Google servers) |
| HA access | Via Assist API intents on exposed entities only |
| Features | STT, TTS, content generation, camera analysis |
| Limitations | Regional restrictions, Google Search cannot coexist with device control tools, rate-limited free tier |

### 1.5 Ollama Conversation (Official Integration)

| Aspect | Details |
|---|---|
| Model | Local models (Llama, Mistral, etc.) |
| Transport | Local network (Ollama server) |
| HA access | Via Assist API intents on exposed entities only |
| Features | Fully local/private, custom instructions, thinking capability |
| Limitations | Recommends <25 exposed entities, smaller models unreliable, only tool-supporting models work, no cloud features |

### 1.6 Extended OpenAI Conversation (HACS Custom Component)

| Aspect | Details |
|---|---|
| Repo | github.com/jekalmin/extended_openai_conversation |
| Model | OpenAI models via function calling |
| Key extras beyond official | `execute_service` (call any HA service), `add_automation` (create automations), `get_history` (entity history), external API/web scraping, composite functions |
| Significance | Most popular custom integration for HA + AI because it exposes raw service calls, not just intents |

### Key Limitation of ALL HA-Native Agents

All HA-native conversation agents share one fundamental constraint: **they operate through the Assist API intent system**, which means:
- Access is limited to entities explicitly exposed by the user
- Control is mediated by predefined intents (47 built-in)
- No direct REST API access, no raw service calls (except Extended OpenAI Conversation)
- No programmatic use by external AI systems
- Designed for interactive chat, not agent tool-calling patterns

---

## Category 2: External MCP Servers for HA

These run outside Home Assistant and expose HA functionality to AI tools/IDEs via the Model Context Protocol.

### 2.1 tevonsb/homeassistant-mcp (547 stars)

| Aspect | Details |
|---|---|
| Language | TypeScript / Node.js |
| License | Apache-2.0 |
| Tools | 4 tool categories: Control (turn_on/off/toggle), Addon management, HACS packages, Automation config |
| Transport | REST + WebSocket (SSE) |
| Safety | Token auth, rate limiting, state validation |
| Domains | Lights, climate, covers, switches, sensors, media, fans, locks, vacuums, cameras |
| Focus | General-purpose MCP bridge; most popular in the space |

**Gaps**: Limited to 4 coarse-grained tools. No entity search/filtering, no history/logbook, no template rendering, no event firing, no notifications. No readOnly mode. No domain-level allowlist.

### 2.2 Coolver/home-assistant-vibecode-agent (454 stars)

| Aspect | Details |
|---|---|
| Language | Python |
| Focus | IDE-oriented (Cursor, VS Code, Claude Code) for HA configuration management |
| Architecture | Two-module: HA add-on + local MCP server |
| Key features | Automation creation, YAML config management, git versioning, HACS browsing, log analysis, rollback |
| Safety | Path-restricted file access, token auth, backups, config validation |

**Gaps**: Focused on configuration/development, not runtime device control for AI agents. Not suitable as a tool-calling bridge for conversational AI.

### 2.3 jango-blockchained/advanced-homeassistant-mcp (47 stars)

| Aspect | Details |
|---|---|
| Language | JavaScript / Bun runtime |
| Tools | 34 tools across 5 categories: Aurora sound-to-light (10), device control (13), automation/scenes (3), system management (6), smart features (2) |
| Transport | HTTP REST, WebSocket, stdio |
| Safety | Rate limiting, input sanitization, JWT auth, security headers |
| Unique features | Aurora sound-to-light sync, intelligent maintenance detection, scenario generation |

**Gaps**: Heavyweight (Bun runtime, Docker, optional speech containers). Aurora feature is niche. JWT auth adds complexity vs. simple LLAT. No readOnly mode. No domain allowlist.

### 2.4 hekmon8/Homeassistant-server-mcp (47 stars)

| Aspect | Details |
|---|---|
| Language | JavaScript |
| Tools | 4 tools: Get device state, toggle device state, trigger automation, list entities |
| Focus | Minimal MCP bridge |

**Gaps**: Very limited tool set. No service calls, no history, no templates, no events, no notifications.

### 2.5 Other smaller projects

- **c1pher-cn/ha-mcp-for-xiaozhi** (209 stars) - Python, specialized for xiaozhi AI (Chinese market)
- **cronus42/homeassistant-mcp** (4 stars) - Python, "comprehensive API coverage"
- **zorak1103/ha-mcp** (3 stars) - Go, basic HA access

---

## Category 3: Our Position - openclaw-homeassistant

openclaw-homeassistant is an **OpenClaw plugin** (not a generic MCP server) that provides HA control as AI agent tools. It fills a specific niche:

### What We Already Have (34 tools)

| Category | Tools | Count |
|---|---|---|
| Status/Discovery | ha_status, ha_list_entities, ha_get_state, ha_search_entities, ha_list_services | 5 |
| Lights | ha_light_on, ha_light_off, ha_light_toggle, ha_light_list | 4 |
| Switches | ha_switch_on, ha_switch_off, ha_switch_toggle | 3 |
| Climate | ha_climate_set_temp, ha_climate_set_mode, ha_climate_set_preset, ha_climate_list | 4 |
| Media | ha_media_play, ha_media_pause, ha_media_stop, ha_media_volume, ha_media_play_media | 5 |
| Covers | ha_cover_open, ha_cover_close, ha_cover_position | 3 |
| Scenes/Scripts | ha_scene_activate, ha_script_run, ha_automation_trigger | 3 |
| Sensors | ha_sensor_list | 1 |
| History | ha_history, ha_logbook | 2 |
| Generic | ha_call_service, ha_fire_event, ha_render_template | 3 |
| Notifications | ha_notify | 1 |

---

## Gap Analysis: What We Do That Others Don't

### Unique Strengths of openclaw-homeassistant

| Gap | tevonsb (547*) | advanced (47*) | hekmon8 (47*) | HA native agents | **Us** |
|---|---|---|---|---|---|
| **readOnly mode** | No | No | No | N/A (entity exposure) | Yes |
| **allowedDomains filter** | No | No | No | Entity exposure only | Yes |
| **entity_id validation** | Basic | Basic | No | Via intents | Strict regex |
| **Domain-typed tools** (light/switch/climate/media/cover) | Single generic control | 13 device tools | Single toggle | Via intents | 20 domain-typed tools |
| **History/logbook** | No | Yes (1 tool) | No | No | Yes (2 tools) |
| **Template rendering** | No | No | No | No (except Extended OAI) | Yes |
| **Event firing** | No | No | No | No | Yes |
| **Notifications** | No | Yes | No | No | Yes |
| **Entity search** (pattern matching) | No | No | No | No | Yes |
| **Service listing** | No | No | No | Via intents | Yes |
| **Zero dependencies** | Has deps | Bun + many | Has deps | N/A | Zero (native fetch) |
| **OpenClaw native** | No (generic MCP) | No (generic MCP) | No (generic MCP) | No (HA internal) | Yes |

### What Others Have That We Don't (Potential Future Gaps)

| Feature | Who has it | Priority for us |
|---|---|---|
| HACS package management | tevonsb, vibecode | Low - admin task, not AI agent use case |
| Add-on management | tevonsb, vibecode | Low - admin task |
| Automation creation/editing | tevonsb, Extended OAI, vibecode | Medium - could be useful but risky |
| Real-time state subscriptions (WebSocket) | tevonsb, advanced | Low - covered by T-002 decision (REST-first) |
| Configuration file management | vibecode | None - IDE tool, not agent tool |
| Git versioning of changes | vibecode | None - IDE tool |
| Sound-to-light sync | advanced | None - niche feature |
| Intelligent maintenance detection | advanced | Low - interesting but niche |
| Camera image capture | tevonsb | Medium - useful for multimodal AI |
| Web search | HA native (OpenAI, Claude, Gemini) | None - not HA-specific |

---

## Recommendations

### 1. Our core differentiator is safety + granularity

No other external HA bridge offers `readOnly` mode + `allowedDomains` allowlist + strict entity validation. This is our competitive advantage for production AI agents where uncontrolled HA access is dangerous.

### 2. Keep the OpenClaw plugin model

We are not a generic MCP server. We are an OpenClaw plugin with typed tools. This means:
- Tools are registered via OpenClaw's plugin API, not stdio/SSE
- Config comes from OpenClaw's plugin config, not env vars
- Safety is built into every tool, not bolted on

### 3. Consider adding in future phases

| Feature | Rationale | Effort |
|---|---|---|
| `ha_camera_snapshot` | Multimodal AI can analyze camera feeds; high value for security/monitoring use cases | Medium |
| `ha_create_automation` | Let AI create automations; needs extra safety guards (write-mode only, validation) | High |
| `ha_set_state` | Override entity states for testing/simulation; needs safety guards | Low |
| Area/floor-aware filtering | HA supports areas and floors; useful for "turn off all lights in kitchen" | Low |

### 4. Do NOT add

- HACS/add-on management (admin tasks, not agent tools)
- Configuration file editing (IDE tool territory)
- Sound-to-light features (niche, unrelated to AI agent use case)
- WebSocket subscriptions (per T-002 decision - REST is sufficient for request-response)

---

## Conclusion

openclaw-homeassistant occupies a distinct niche: **a safety-first, zero-dependency, OpenClaw-native HA bridge with 34 fine-grained typed tools**. The existing MCP servers are either too coarse (4 generic tools), too heavyweight (Bun + Docker + JWT), or focused on IDE use cases (config management). The HA-native conversation agents are limited to the Assist intent system and cannot be used by external AI agents.

Our gaps are minor (camera snapshots, automation creation) and can be addressed in future phases without changing the architecture. The core value proposition - safe, granular, typed HA control for AI agents - is unmatched in the current ecosystem.
