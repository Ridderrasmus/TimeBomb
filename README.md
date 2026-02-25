# TimeBomb

Digital implementation of **Time Bomb** (with Evolution rules support) built with:

- **Backend:** ASP.NET Core + SignalR
- **Frontend:** React + Vite + TypeScript
- **Orchestration:** .NET Aspire AppHost

The project provides a multiplayer social-deduction game flow with a real-time lobby and in-game state updates.

## Repository layout

- `TimeBomb.AppHost/` - Aspire orchestrator (starts backend + frontend together)
- `TimeBomb.Server/` - ASP.NET Core API + SignalR hub + game domain logic
- `frontend/` - React/Vite client app
- `TimeBomb.Server.Tests/` - xUnit test project for backend behavior
- `docs/` - rules and QA runbook documentation

## Prerequisites

- .NET SDK 10+
- Node.js 20+
- npm
- Aspire CLI (`aspire --version`)

## Quick start (recommended)

From the repository root:

```bash
aspire run
```

The Aspire dashboard and resource endpoints are printed in the terminal.

To stop:

```bash
aspire stop
```

## Alternative run mode for agent/isolated sessions

```bash
aspire run --detach --isolated
```

Relaunching with the same command is safe if AppHost configuration changes.

## Build, test, and lint

From repository root:

```bash
dotnet build TimeBomb.sln
dotnet test TimeBomb.Server.Tests
```

Frontend commands (from `frontend/`):

```bash
npm install
npm run dev
npm run build
npm run lint
```

## API and real-time endpoints

- Controllers are hosted by `TimeBomb.Server`
- SignalR hub endpoint: `/hubs/game`

When running via AppHost, frontend and backend are wired automatically through Aspire service references.

## Documentation

- Rules reference: `docs/rules.md`
- QA + smoke workflow: `docs/qa-runbook.md`
- Frontend in-app rules content:
  - `frontend/public/rules/standard-game-rules.md`
  - `frontend/public/rules/evolution-game-rules.md`

## Notes

- The backend serves static files (`wwwroot`) for published builds.
- In development, the AppHost uses Vite app hosting for the frontend resource.