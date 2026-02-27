# openclaw-homeassistant - Next Actions

## P1 - Research (Sonar)
- [ ] Research: Home Assistant REST API + WebSocket API docs
- [ ] Research: home-assistant-js-websocket npm package (official HA WS client)
- [ ] Research: existing HA + AI assistant integrations (gaps to fill)
- [ ] Research: OpenClaw plugin agent tool best practices

## P2 - Architecture (Opus)
- [ ] Define config schema (url, token, allowedDomains, readOnly)
- [ ] Define agent tool signatures (get_state, list_entities, call_service, trigger_automation)
- [ ] Decide: REST-only vs. WebSocket (for real-time state updates)

## P3 - Implementation (Sonnet)
- [ ] Create package.json + tsconfig.json + openclaw.plugin.json
- [ ] Implement HA REST client (fetch wrapper with LLAT auth)
- [ ] Implement ha_get_state tool
- [ ] Implement ha_list_entities tool (filter by domain)
- [ ] Implement ha_call_service tool (with readOnly guard)
- [ ] Implement ha_trigger_automation tool
- [ ] Write tests (mock HA API)

## P4 - Docs + Publish
- [ ] Update README.md with final setup guide
- [ ] npm publish @elvatis/openclaw-homeassistant
- [ ] Blog article: "Controlling Home Assistant with natural language via OpenClaw"
- [ ] Submit to OpenClaw community plugins page (PR)
