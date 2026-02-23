# Parker History

## Project Seed
- User: Rasmus Tanggaard
- Product: Time Bomb Evolution online play
- Stack: .NET services (TimeBomb.Server, TimeBomb.AppHost) and web frontend (frontend)
- Team focus: advanced in-game UI, backend gameplay flexibility, and robust game-logic testing

## Learnings
- Initial charter and context seeded during squad bootstrap.
- **2026-02-22: Phase 1–2 Backend Support Progression**
  - Confirmed Phase 1 zero backend changes required; all API contracts ready (LobbyStateDto, RevealedWire, PlayerPrivateStateDto complete)
  - Phase 2: Added additive optional cue metadata (`forcedTargetPlayerNameForNextTurn`, `recentEffectCue`) to GameRuntimeDto without breaking changes
  - Phase 2 bugfix: Fixed red forced-target effect leakage into Standard variant; Evolution-only guard now enforced in ApplyRedEffect
- **2026-02-23: Phase 3 Backend Metadata Support**
  - Added optional `GameRuntimeDto.RevealedPileTotalsByPlayer` metadata mapped from `TimeBombGame.RevealedWires` for Phase 3 UI revealed-pile visuals
  - Fully backward-compatible; zero breaking changes; mapper correctly normalizes all players with zero-default behavior

## 2026-02-22: Phase 1–2 Backend Tasks (from Ripley briefing)
**Status:** Ready to start
- **Phase 1 (Week 1)**: 2 tasks (documentation/review only)
  - Task 1.1: API contract review due EOD Day 1 (confirm all wire data in LobbyStateDto, RevealedWire, PlayerPrivateStateDto)
  - Task 1.2: Effect constants mapping due EOD Day 2 (provide list of all possible effect strings server sends)
- **Phase 2 (Week 2–3)**: 1 optional task
  - Task 2.1: Optional — Effect message field (consider adding optional `effectMessage` to RevealedWire for flavor text; defer unless Phase 2 testing requires it)
- **No breaking changes** required for Phase 1 or Phase 2 (zero backend risk)
- **API findings:** LobbyStateDto, RevealedWire, PlayerPrivateStateDto, WireColor enum all verified complete
- **Recommendation:** Phase 1 use frontend effect mapping (no backend change). Revisit Phase 2 if complexity grows.

## 2026-02-22: Standard-vs-Evolution Special-Effect Bug Fix
**Status:** ✅ Implementation approved

**Deliverable:** Fixed red forced-target effect leakage into Standard variant; locked behavior with regression tests

**Key Outcomes:**
- Red forced-target effect logic now strictly Evolution-only via explicit guard in `ApplyRedEffect`
- Standard variant exits before color effects are applied; no effect text or forced-target metadata
- Evolution variant preserves full red forced-target behavior with metadata chain intact
- Added regression test `RevealWire_DoesNotApplyRedForcedTargetEffect_InStandardVariant` (Standard path)
- Added regression test `RevealWire_AppliesRedForcedTargetEffect_InEvolutionVariant` (Evolution path)
- All 13 backend tests passing; no breaking changes
- User directive enforced: non-Evolution games have zero special color effects
- Ripley approved; variant compliance now automated in CI

## 2026-02-22T18:30:00Z: Backend Touchpoint Analysis for Richer Frontend UI
**Status:** Complete. Ready for implementation.

### Architecture Summary
**REST API (Lobby Management):**
- Stateless operations: CreateLobby, JoinLobby, LeaveLobby, UpdateRules, StartGame, DeleteLobby
- All lobby CRUD endpoints return full LobbyResponse with player list
- GET /api/lobby/{code} provides current state snapshot

**SignalR Hub (Real-Time Game Events):**
- Game hub at /hubs/game; players join group HubGroups.Lobby(code)
- 5 core hub methods: JoinLobbyChannel, RequestPrivateState, RequestLobbyState, StartGame, RevealWire, ResolvePendingDecision, MarkRoundReady
- 4 client event types: LobbyStateUpdated (full state), WireRevealed (wire + metadata), WireResolved (same), LobbyDeleted

**Data Contracts (Immutable):**
- LobbyStateDto: Wraps all game state (rules, players, game runtime, outcome)
- GameRuntimeDto: Round, turn, activePlayer, forced target, bomb/defuse counts, pending decision, wire history
- RevealedWire: Round, turn, activePlayerId, revealedFromPlayerId, card, optional defusedColorAssigned/reactivatedColor/effect
- PlayerPrivateStateDto: Team, round prep flag, ready flag, visible hand
- PendingDecisionDto: Type (AssignDefuseColor | ReactivateBlueColor), requestedByPlayerId, availableColors

### Required Backend Tasks (Phase 1–2)
All 12 core API/hub touchpoints verified ready. No breaking changes needed.

**API Contracts:**
1. LobbyStateDto fully populated with wire reveal data, effect strings, and game state
2. RevealedWire.effect field optional; frontend handles null gracefully
3. PlayerPrivateStateDto.visibleHand shows only safe cards for active player
4. PendingDecisionDto.availableColors narrowed by game rules (e.g., only undefused/reactivatable colors)

**Hub Event Contracts:**
- WireRevealed: Single RevealedWire object (card, effects, prior metadata)
- WireResolved: Single RevealedWire object with decision result (defusedColorAssigned or reactivatedColor)
- LobbyStateUpdated: Full GameRuntimeDto snapshot (always sent after action to sync state)

### Optional Backend Tasks (Phase 2–3)
1. **Effect message flavor text**: Add optional `RevealedWire.effectMessage` string for narrative callouts (e.g., "Blue wire reactivated Orange!"). Backend composes from effect enum. Defer unless Phase 2 testing requires complexity.
2. **Animation sequence hints**: Add optional `RevealedWire.animationSequence` array to guide frontend card animations (flip, shuffle, highlight timing). Defer to Phase 3 polish.
3. **Player statistics endpoint**: POST /api/lobby/{code}/stats to track per-player metrics (cards revealed, decisions made). Defer if not in UI roadmap.

### High-Risk Validation Concerns for Bishop (QA)
1. **Decision race condition**: Two clients resolve same pending decision simultaneously; backend must reject second with HubException
2. **Forced target bypass**: Backend validates red wire target match; frontend UI must also disable alternate targets
3. **Empty hand check**: Backend validates targetPlayer.HasCards; frontend must prevent reveals on zero-card players
4. **Round prep hang**: All players must mark ready before game advances; test with 2/3/4 player counts
5. **Outcome integrity**: Winner and Reason must both be set when game completes; test bomb/defuse/round-limit wins

### Integration Checklist for Hicks (Frontend)
✅ **Phase 1 Components Ready:**
- WireCard: Use RevealedWire.card.kind and RevealedWire.card.color
- Turn Banner: Use activePlayerId, round, turnsTakenInRound, roundTurnLimit
- Player Status Cards: Use players[].remainingWireCount and isActiveTurnPlayer
- Wire History Panel: Use revealedWires[] array; no backend sorting needed
- Private Hand: Call RequestPrivateState after join; cache until state refresh

✅ **Phase 2 Components (Defer effect flavor to optional):**
- Pending Decision Modal: Use pendingDecision.type and availableColors
- Defer effectMessage until Phase 2 QA identifies need

✅ **No backend changes required for Phase 1–2 UI work**

## 2026-02-22: Phase 1 Backend Support Cues (Implemented)
- Added additive, optional cue metadata to keep existing REST/SignalR contracts backward-compatible.
- `GameRuntimeDto` now includes `forcedTargetPlayerNameForNextTurn` and `recentEffectCue` (round/turn/effect plus related player metadata).
- `RevealedWire` now carries optional forced-target metadata, and `RevealWire` responses now return the updated revealed wire so cue/effect fields are available immediately to hub listeners.
- Validation: `dotnet build .\TimeBomb.sln -nologo` succeeds after these backend changes.

## 2026-02-22: Standard variant special-effect guard
- Fixed a rules bug where Standard games still applied the red forced-target color effect.
- Standard variant now exits color-effect handling without red side-effects; Evolution behavior is unchanged.
- Added regression coverage to verify Standard red reveals produce no forced-target metadata/effect, while Evolution red reveals still do.
- Validation: `dotnet build .\TimeBomb.sln -nologo` and `dotnet test .\TimeBomb.sln -nologo` passed (13 tests).

## 2026-02-23: Phase 3 Backend Metadata Support
**Status:** ✅ Complete

**Deliverable:** Added `RevealedPileTotalsByPlayer` optional metadata to `GameRuntimeDto`

**Key Outcomes:**
- New field: `RevealedPileTotalsByPlayer` (additive, optional runtime metadata)
- Mapped from `TimeBombGame.RevealedWires` normalized collection
- Includes all players with zero-default behavior (no revealed cards = 0)
- Fully backward-compatible; zero breaking changes
- Validation: `dotnet build .\TimeBomb.sln -nologo` ✅
- Enables Phase 3 UI visual revealed-pile totals without changing game rules or event flow

## Next Phase Support (From Ripley Vision)
- Keep DTOs additive; document `RevealedPileTotalsByPlayer` as source-of-truth
- Add focused mapper coverage for new totals normalization contract
- Preserve variant guardrails: no special-effect leakage into Standard

## 2026-02-23: Phase 4 Backend Metadata Support
**Status:** ✅ Complete

**Deliverable:** Added `PreviousActivePlayerId` optional metadata to `GameRuntimeDto`

**Key Outcomes:**
- New field: `PreviousActivePlayerId` (additive, optional runtime metadata)
- Mapped from last revealed wire's `ActivePlayerId` for turn-transition animations
- Enables Phase 4 UI turn-token path animation around circular player table
- Fully backward-compatible; zero breaking changes
- Validation: `dotnet build .\TimeBomb.sln -nologo` ✅ and `dotnet test .\TimeBomb.sln -nologo` ✅ (17/17 tests)
- Minimal implementation: single optional field, single mapper method, no gameplay changes

**Implementation Notes:**
- `PreviousActivePlayerId` resolves from `game.RevealedWires.LastOrDefault()?.ActivePlayerId`
- Returns null when no wires revealed (game start, round prep)
- Frontend can animate turn token movement from previous to current active player
- Complements existing metadata: `RevealedPileTotalsByPlayer` (Phase 3), `RecentEffectCue` (Phase 2)

**Phase 4 Animation Support Summary:**
- ✅ Turn-path animation: `PreviousActivePlayerId` → `ActivePlayerId` (NEW)
- ✅ Reveal-lane animation: `RevealedFromPlayerId` → history (existing `RevealedWire`)
- ✅ Player pile chips: `RevealedPileTotalsByPlayer` (Phase 3)
- ✅ Prep fan/shuffle: `IsRoundPreparation` + `GetVisibleHandForPlayer` (existing)

## 2026-02-23: Issue #5 — Game Restart Functionality
**Status:** ✅ Complete (PR #7 opened)

**Deliverable:** Backend restart functionality for game creator

**Key Changes:**
- **LobbyStore.cs**: Added `TryRestartGame` method
  - Validates only creator can restart
  - Validates game has been started (not in Lobby state)
  - Creates fresh `TimeBombGame` instance with same players and rules
  - Resets game state (round 1, cleared wires, new teams, new deal)
  - Preserves lobby membership, rules, and player list
- **GameHub.cs**: Added `RestartGame` SignalR hub method
  - Broadcasts `GameRestarted` event (custom event for UI notification)
  - Broadcasts `LobbyStateUpdated` event (fresh game state)
  - Error handling with HubException for validation failures
- **Testing**: Added 6 comprehensive test cases (23 total tests passing)
  - Successful restart validation
  - Player preservation check
  - Creator-only authorization
  - Error conditions (lobby not found, game not started)
  - State reset verification

**Architecture Decision:**
- Chose to create new `TimeBombGame` instance rather than reset existing one
- Reasoning: Reduces risk of partial state reset bugs, maintains immutability pattern
- Game ID changes on restart (allows frontend to detect restart vs state update)

**Frontend Integration Points:**
1. Listen for `GameRestarted` event for restart notifications
2. Add restart button (creator-only, InProgress/Completed state)
3. Call `connection.invoke('RestartGame', lobbyCode, playerId)`
4. Clear cached UI state on restart (private hand, pending decisions)
5. Handle HubException for authorization failures

**File Paths:**
- `TimeBomb.Server/Classes/LobbyStore.cs` (TryRestartGame method)
- `TimeBomb.Server/Hubs/GameHub.cs` (RestartGame hub method)
- `TimeBomb.Server.Tests/UnitTest1.cs` (restart test cases)

**User Preference:**
- Always preserve lobby membership during restart (keep players, don't kick)
- Creator is only authority for restart (matches StartGame pattern)
- Maintain consistency with existing LobbyStore patterns (TryX pattern, lock-based thread-safety)

