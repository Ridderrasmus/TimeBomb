# Ripley History

## Project Seed
- User: Rasmus Tanggaard
- Product: Time Bomb Evolution online play
- Stack: .NET services (TimeBomb.Server, TimeBomb.AppHost) and web frontend (frontend)
- Team focus: advanced in-game UI, backend gameplay flexibility, and robust game-logic testing

## Learnings

### 2026-02-22: Initial Architecture Review
- **Architecture validated**: Aspire orchestration clean. Frontend ← REST + SignalR (real-time) → Backend. Signal syncs game state ~5-7x per turn.
- **Key finding**: Backend game logic is feature-complete (Standard + Evolution). UI is functional but sparse.
- **UI gap**: No animations, monolithic layout, text-heavy wire history, weak visual feedback on whose turn / pending decisions.
- **Backend stability**: No breaking changes needed for UI enhancements. Data model is rich; presentation is the upgrade path.
- **Team structure**: Hicks (UI), Parker (Backend), Bishop (QA) can work in parallel on Phases 1 & 2. Phase 3 is final polish.
- **No blocker risks**: Phase 1 (animation/layout) has zero backend dependencies. Parker review is documentation-only.

### 2026-02-22: Implementation-Ready Backlog Synthesis
- **Synthesis completed:** Merged Hicks UI backlog (14 tasks, Phase 1–3), Parker backend touchpoints (10 tasks, 12 optional), and Bishop QA plan (10 tasks across 3 gates) into single execution backlog.
- **Prioritization:** P0 (critical path, Weeks 1–2), P1 (feature build, Weeks 2–3), P2 (polish, Weeks 3–4).
- **Parallel launch batch (Day 1–3):** H1.1 (wireframes) + P1.1 (API review) + B1.1 (unit tests) all start immediately; no blockers.
- **Four review gates:** Day 10 (Phase 1 fixtures), Week 2 Day 3 (Phase 1 code), Week 3 Day 2 (Phase 2 edge cases), Week 4 Day 4 (Phase 3 completion).
- **Risk controls identified:** 6 critical risks with mitigation and rollback posture (simplify animations, revert to 760px breakpoint, manual E2E if harness fails).
- **Owner clarity:** Hicks (component dev + optimization), Parker (API validation + error clarity), Bishop (test infrastructure + E2E), Ripley (gate authority + blocker resolution).
- **Success metrics:** 14 tasks on schedule, 60fps animations, WCAG AA a11y, zero new bugs, Ripley approval at gates.
- **Documentation:** Backlog written to `.squad/decisions/inbox/ripley-implementation-ready-backlog.md`; ready for Rasmus greenlight.

### 2026-02-22: Implementation Batch Lead Review Gate
- **Verdict:** APPROVED. Cross-stream batch is coherent: frontend components integrated cleanly, backend cue metadata stayed additive, and solution/test wiring is healthy.
- **Validation:** `dotnet build` passed, `dotnet test` passed (11/11), frontend build passed, and lint returned only two pre-existing exhaustive-deps warnings in `App.tsx`.
- **Risk to track:** New cue fields (`RecentEffectCue`, forced-target name metadata) are not yet directly asserted in mapper tests and are not yet consumed in frontend rendering, creating potential contract drift if evolved.

### 2026-02-22: Phase2 + Standard Red-Effect Bugfix Review Gate
- **Verdict:** APPROVED. Standard variant no longer applies red forced-target effect metadata; Evolution keeps red forced-target behavior and metadata intact.
- **Validation:** `dotnet build` passed, `dotnet test` passed (13/13), frontend build passed, and lint remained at the same two existing exhaustive-deps warnings in `App.tsx`.
- **Learning:** Guarding variant logic before effect routing and returning the post-evaluation revealed-wire snapshot prevents cross-variant leakage while preserving Evolution UX cues.

### 2026-02-22: Phase 2 + Bugfix Batch Orchestration Complete
- **Verdict:** APPROVED. Phase 2 UX slice production-ready; standard-vs-evolution bug fix enforced; all regression tests passing.
- **Validation:** Frontend: Phase 2 modal/cues contract-compatible. Backend: Red effect strictly Evolution-only. Tests: 13/13 passing (11 original + 2 new regression pairs).
- **Cross-agent coherence:** Hicks Phase 2 UX depends on Parker backend cue metadata; Parker enforces Evolution-only guard; Bishop tests lock variant compliance. All coordinated and approved.
- **Decisions merged:** `decisions/inbox/` fully consolidated into `decisions.md` (5 files merged + deduped); inbox purged.
- **Orchestration logs:** Written for Hicks (Phase 2 UX), Parker (bugfix), Bishop (regression tests). Session log captured.
- **Recommendation:** Prioritize mapper/contract tests for `recentEffectCue` projection and forced-target metadata to prevent DTO drift in Phase 3.

### 2026-02-23: Phase 3 Fun-UI Batch Review Gate
- **Verdict:** ✅ APPROVED. Phase 3 delivered additive fun-UI upgrades (revealed-pile totals, wire-card visuals, circular table-feel player layout, and pre-shuffle visual hand preview) without gameplay or contract breakage.
- **Validation:** `dotnet build .\TimeBomb.sln -nologo` passed, `dotnet test .\TimeBomb.sln -nologo --no-build` passed (15/15), `npm --prefix .\frontend run build` passed, and lint stayed at 2 existing `react-hooks/exhaustive-deps` warnings in `frontend/src/App.tsx`.
- **Bugfix protection:** Standard-vs-Evolution red-effect guard remains intact in game logic and is still locked by deterministic tests (`RevealWire_DoesNotApplyRedForcedTargetEffect_InStandardVariant` and `RevealWire_AppliesRedForcedTargetEffect_InEvolutionVariant`), plus mapper assertions for standard null special-effect metadata.
- **Learning:** Fun readability gains came from card-first surfaces and spatial player positioning; next phase should deepen the tabletop feel through motion/state choreography while preserving variant isolation and additive contracts.

### 2026-02-23: Phase 3 Orchestration Complete + Next-Phase Vision Captured
- **Orchestration logs:** Written for Hicks (Phase 3 UI), Parker (Phase 3 metadata), Bishop (Phase 3 regression expansion), Ripley (Phase 3 review gate)
- **Session log:** Captured Phase 3 approval and next-phase vision direction
- **Decision consolidation:** Merged 5 inbox files into centralized decisions.md; inbox purged
- **Agent histories:** Updated Hicks, Parker, Bishop, Ripley, Scribe with Phase 3 batch summaries
- **Next-phase direction documented:** 4 anchors (pile totals, card visuals, circle/table feel, pre-shuffle preview) + recommendations for Hicks/Parker/Bishop
- **Cross-agent coherence maintained:** Frontend card visuals ← backend pile metadata ← mapper assertions ← variant guards all locked and validated

### 2026-02-23: Phase 4 Lead Review Gate — APPROVED
- **Verdict:** ✅ APPROVED. Phase 4 delivers dramatic UI readability and board-game feel via circular player layout, card-centric wire visuals, revealed-pile analytics (color/player breakdowns, progress bars), and visual hand-fan previews. Changes remain fully additive and low-risk.
- **UI transformation:** Wall-of-text wire history replaced with visual card components and top-3 recent reveals. Players arranged in circular table layout with turn-token animation and forced-target highlighting. Pile totals display player contribution chips and defuse/bomb progress bars.
- **Validation:** `dotnet build .\TimeBomb.sln` passed, `dotnet test .\TimeBomb.sln` passed (17/17), `npm --prefix .\frontend run build` passed, lint remains at 2 pre-existing exhaustive-deps warnings in `frontend/src/App.tsx`.
- **Standard-vs-Evolution guards intact:** Red forced-target effect still Evolution-only; assertions for Standard variant null metadata remain in mapper tests. No new variant cross-contamination introduced.
- **Risk assessment:** Low. All changes are presentation-layer only. No game logic modified. Backend DTO additions (`revealedPileTotalsByPlayer`, `previousActivePlayerId`) are additive and optional fields with fallback handling.
- **Next slice targets:** Animation polish (smooth wire reveal transitions, pile update animations), turn choreography (active-player highlight sequence, forced-target path animation refinement), accessibility audit (ARIA labels for progress bars and circular layout), responsive layout stress-testing at <760px breakpoint.

### 2026-02-24: Debug Spawn Endpoint for QA
- **Decision:** Added a dev/QA-only endpoint to quickly reach 4 players for smoke testing: `POST /api/lobby/{code}/debug/spawn-players`.
- **Implementation:** `LobbyStore.TryAddDebugPlayers` adds enough `Debug Player N` entries to reach the 4-player minimum while respecting the 6-player cap.
- **Docs:** QA runbook now references the debug spawn endpoint for faster 4-player starts.
