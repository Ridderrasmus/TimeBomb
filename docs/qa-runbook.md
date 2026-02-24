# QA Runbook - Aspire + Playwright Smoke

## Prerequisites
- .NET SDK 10 or newer
- Aspire CLI installed (verify with `aspire --version`)
- Node.js 20+ with npm
- Repo dependencies restored (first time): `dotnet restore` from repo root
- Aspire workload is obsolete; do not install or use it.

## Start the app with Aspire CLI
From repo root:

```bash
aspire run
```

Agent environments should use detached mode:

```bash
aspire run --detach --isolated
```

This prints the Dashboard URL and resource endpoints.

## Relaunch rules (AppHost changes)
- If AppHost code changes, run `aspire run --detach --isolated` again.
- Relaunching is safe; it stops the prior instance automatically.
- Do not keep multiple AppHost instances running.

## Verify services
- Use Aspire MCP tools to list resources and confirm `server` and `webfrontend` are Running/Healthy.
- Use MCP logs tools (structured/console) to debug if a resource is unhealthy.
- Use the endpoints returned by list resources to open the health check and UI.

## Playwright UI smoke checks (concise)
- Use the Playwright MCP server to open the `webfrontend` endpoint from Aspire resources.
- Game start requires 4 players. Preferred approach: use a debug mode to spawn 3 additional players before starting.
- Fallback if debug spawning is unavailable: open three extra isolated sessions (incognito contexts/tabs) and join the lobby.
- Smoke flow: load UI, create lobby, add players until 4 present, start game, reveal a wire, resolve any pending decision.

## Stop
```bash
aspire stop
```
