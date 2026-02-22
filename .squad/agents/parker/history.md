# Parker History

## Project Seed
- User: Rasmus Tanggaard
- Product: Time Bomb Evolution online play
- Stack: .NET services (TimeBomb.Server, TimeBomb.AppHost) and web frontend (frontend)
- Team focus: advanced in-game UI, backend gameplay flexibility, and robust game-logic testing

## Learnings
- Initial charter and context seeded during squad bootstrap.

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
