# Hudson History

## Project Context
- User: Rasmus Tanggaard
- Product: Time Bomb Evolution online card game support
- Current ask: richer in-game UI, backend-edit readiness, and strong gameplay-logic testing

## Learnings
- Added QA runbook at docs/qa-runbook.md covering Aspire CLI boot and Playwright smoke steps.
- AppHost orchestration: server + Vite webfrontend + dev tunnel in TimeBomb.AppHost/AppHost.cs.
- Frontend scripts available: dev/build/lint/preview in frontend/package.json.
- Server wiring: /health check, /hubs/game SignalR hub, OpenAPI in dev in TimeBomb.Server/Program.cs.
- QA runbook now follows Aspire skill guidance: Aspire workload obsolete, use `aspire run --detach --isolated` in agent environments, stop via `aspire stop`, verify via Aspire MCP tools.
