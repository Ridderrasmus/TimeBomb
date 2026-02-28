# Copilot Instructions for TimeBomb

## Build, test, and lint commands

### Preferred run mode (Aspire)
- From repo root: `aspire run`
- For agent/isolated sessions: `aspire run --detach --isolated`
- Stop all resources: `aspire stop`

### .NET backend
- Restore and build from repo root:
  - `dotnet restore`
  - `dotnet build TimeBomb.sln`
- Run backend test suite:
  - `dotnet test TimeBomb.Server.Tests`
- Run a single backend test method:
  - `dotnet test TimeBomb.Server.Tests --filter "FullyQualifiedName~TimeBomb.Server.Tests.TimeBombGameTests.GetRoundTurnLimit_ReturnsPlayerCount_ForStandardVariant"`
- Run a focused test class:
  - `dotnet test TimeBomb.Server.Tests --filter "FullyQualifiedName~LobbyStoreDebugPlayersTests"`

### Frontend (`frontend\`)
- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build production assets: `npm run build`
- Lint: `npm run lint`
- Note: there is currently no frontend test script in `frontend/package.json`.

### Gallery verification workflow (Aspire + Playwright)
- Start the full app in the background from repo root:
  - `aspire run --detach --isolated --apphost TimeBomb.AppHost\TimeBomb.AppHost.csproj`
- Confirm the apphost is running:
  - `aspire ps --format Table`
- Get the frontend resource endpoint:
  - `aspire describe webfrontend --apphost TimeBomb.AppHost\TimeBomb.AppHost.csproj --format Table`
  - (use `--format Json` when automation needs machine-readable endpoint data)
- Open gallery mode at the frontend URL with `?mode=gallery` appended, e.g. `https://<frontend-url>/?mode=gallery`.
- Use Playwright (CLI or MCP) to open that gallery URL and visually verify UI/component behavior.

## High-level architecture

- `TimeBomb.AppHost/AppHost.cs` is the orchestrator: it starts the ASP.NET backend (`server`) and Vite frontend (`webfrontend`), waits on server health (`/health`), and wires service references.
- `TimeBomb.Server/Program.cs` hosts both REST controllers (`/api/lobby/...`) and SignalR hub (`/hubs/game`) with enum-as-string JSON serialization for both HTTP and SignalR payloads.
- Core state is in-memory in singleton `LobbyStore` (`TimeBomb.Server/Classes/LobbyStore.cs`) keyed by lobby code and guarded by a lock; game rules/turn progression are implemented in `TimeBombGame`.
- Frontend state is centralized in `useLobbySession` + `useGameActions` (`frontend/src/hooks`) and then mapped to presentation props via selectors (`frontend/src/selectors/appSelectors.ts`).
- Transport split is intentional: lobby lifecycle/rule mutations use REST (`frontend/src/services/lobbyApi.ts`), while live game state and actions use SignalR (`frontend/src/services/gameHubService.ts`).

## Key conventions

- Treat `LobbyStateUpdated` as the shared authoritative state for lobby/game UI; fetch `PlayerPrivateStateDto` separately for per-player hidden data (team and visible hand during round preparation).
- Keep rule enforcement in `LobbyStore`/`TimeBombGame`; controllers and hub methods should validate inputs and delegate to store/game logic.
- When adding or changing backend/API game logic in `TimeBomb.Server`, add or update corresponding tests in `TimeBomb.Server.Tests` (unit or integration, matching the touched behavior).
- Preserve enum name parity between backend (`TimeBomb.Server/Classes/GameModels.cs`) and frontend (`frontend/src/types/game.ts`), since enum values are serialized as strings.
- Preserve lobby constraints already encoded in `LobbyStore`: 4-6 players to start, creator-only operations (start/kick/update rules/return to lobby), and dev/QA-only debug player spawning.
- Follow existing session persistence behavior in `useLobbySession`: `playerName`, `playerId`, and active lobby code are stored in `sessionStorage`; leaving a lobby regenerates player ID.
- `LobbyStore` methods return cloned lobby snapshots (`CloneLobby`) instead of exposing internal mutable lobby instances; keep this pattern when adding state-changing operations.
- When adding UI/component functionality, add or update a `frontend/src/TestGallery.tsx` visualization path so the behavior can be quickly verified in gallery mode during development.
