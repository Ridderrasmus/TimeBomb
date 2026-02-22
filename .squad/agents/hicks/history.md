# Hicks History

## Project Seed
- User: Rasmus Tanggaard
- Product: Time Bomb Evolution online play
- Stack: .NET services (TimeBomb.Server, TimeBomb.AppHost) and web frontend (frontend)
- Team focus: advanced in-game UI, backend gameplay flexibility, and robust game-logic testing

## Learnings
- Initial charter and context seeded during squad bootstrap.
- **2026-02-22: UI Backlog Mapping Completed**
  - Analyzed monolithic App.tsx (972 lines) and identified 5 key gaps: no reusable components, no animation framework, no accessibility structure, brittle responsive layout, no effect toast system
  - Mapped current architecture: React hooks state management, inline interfaces, SignalR real-time updates, CSS variable theming
  - Decomposed Phase 1–3 roadmap into 14 concrete tasks with exact file targets, component responsibilities, UX behaviors, and acceptance criteria
  - Identified zero backend breaking changes required; Parker only needs to confirm SignalR flow reliability
  - Established dependencies: p1-wireframe gates all Phase 1 component development; p1-integration gates Phase 2; responsive redesign required before animation refactor (layout must stabilize first)
  - Key decision: WireCard, WireHistory, PlayerStatusCard as separate modules (not inline); DecisionModal as overlay (not inline dialog); EffectToast as queue-managed component (not individual notifications)
  - Tool: Created SQL backlog tracker (ui_tasks, ui_component_refs, ui_dependencies tables) for cross-phase visibility and dependency querying

## 2026-02-22: Phase 1–3 Task Assignments (from Ripley briefing)
**Status:** Ready to start
- **Phase 1 (Weeks 1–2)**: 6 tasks covering wire card animation, history panel, player status cards, turn banner
  - Task 1.1: Wireframes due EOD Day 1 (animation timings, responsive breakpoints)
  - Task 1.2: WireCard component due EOD Day 3 (flip animation 400ms, hover state)
  - Task 1.3: Wire history panel due EOD Day 5 (grid layout, color-coded)
  - Task 1.4: Player status card due EOD Day 7 (active turn indicator, quick-cut button)
  - Task 1.5: Turn banner due EOD Day 8 (animated glow, "YOUR TURN" / "Waiting for...")
  - Task 1.6: Integration & testing due EOD Day 10 (full Phase 1 flow, 2-player test, responsive check)
- **Phase 2 (Weeks 2–3)**: 3 tasks for pending decision modal, effect toasts, color picker
- **Phase 3 (Weeks 3–4)**: Responsive redesign, full animation suite, dark/light theme polish
- **Review Gates:** Ripley gates Phase 1 code review before merge (Week 2, Day 3)
- **Backend dependency:** Parker API review (no code changes expected)
- **File structure:** Organize components by Phase (Phase1/, Phase2/, Phase3/ subdirs)

## 2026-02-22: Implementation-Ready Backlog Finalized
**Status:** Ready for Day 1 execution

**Deliverable:** `orchestration-log/20260222-182608-hicks.md` + merged to decisions.md

**Key Outcomes:**
- 14-task frontend backlog fully detailed with acceptance criteria, target files, UX behaviors, and backend dependencies
- Phase 1 (Weeks 1–2): 6 tasks (wireframes → 5 components → integration); gates wireframes approval (Day 1), code review (Week 2 Day 3)
- Phase 2 (Weeks 2–3): 3 tasks (decision modal, toasts, color picker) parallel with QA edge case testing
- Phase 3 (Weeks 3–4): 5 tasks (responsive, animation suite, theme, a11y, regression doc)
- **Critical Path:** H1.1 wireframe gate (Day 1) → H1.2–H1.5 parallel (Days 2–8) → H1.6 integration (Day 10 gate)
- Technical decisions locked: React hooks, CSS Modules, GPU acceleration, useAnimationFrame hook, 3-tier responsive (1920, 768, 375), semantic HTML + aria-labels
- **Zero backend breaking changes.** Parker confirms API contracts ready (LobbyStateDto, SignalR hub methods, RevealedWire effect field all present)
- Dependencies: H1.1 gates all Phase 1 component work; Phase 1 integration gates Phase 2; responsive layout must stabilize before animation refactor (Phase 3)
- Risk: H1.1 design complexity → Ripley decision Day 1 → defer complex animations if timeline blocked

## 2026-02-22: Phase 2 Decision UX Implementation Complete
**Status:** ✅ Implementation approved

**Deliverable:** Phase 2 UI slice with pending-decision modal, effect cue rendering, and forced-target metadata integration

**Key Outcomes:**
- Pending-decision modal uses explicit two-step interaction (select color + confirm CTA) to prevent accidental instant resolves
- Effect cue rendering prioritizes `game.recentEffectCue` with fallback to latest revealed wire `effect` field
- Forced-target label integrated using backend `forcedTargetPlayerNameForNextTurn` with ID/name fallback for compatibility
- Frontend build clean; lint warnings unchanged (2 baseline `react-hooks/exhaustive-deps` in App.tsx)
- Phase 2 slice contract-compatible; no breaking changes to backend DTOs
- Ripley approved; Phase 2 production-ready

## 2026-02-22: Phase 1 Gameplay UI Polish — Execution Slice 1
- Implemented reusable in-match UI components in `frontend/src/components`:
  - `TurnStateProminence` for high-visibility round/turn/active-player state
  - `PlayerStatusCards` with clearer active and forced-target cues
  - `RevealedWireHistory` for structured revealed-wire timeline presentation
- Integrated all three components into `frontend/src/App.tsx` while preserving existing game rules, REST calls, and SignalR flow.
- Added CSS polish in `frontend/src/App.css` for hierarchy, spacing, subtle animations/transitions, and mobile-safe behavior.
- Validation completed:
  - `npm --prefix .\frontend run build` ✅
  - `npm --prefix .\frontend run lint` ✅ (baseline 2 hook warnings in `App.tsx`, unchanged)

## 2026-02-22: Phase 2 Decision + Effect UX Launch Slice
- Reworked pending decision UX into a modal-style decision panel with explicit select-then-confirm flow, fixing the accidental one-click resolve behavior and giving clear selected-color feedback before submit.
- Added a dedicated in-match effect cue surface that prefers backend `recentEffectCue` metadata and falls back to latest revealed wire effect data, including forced-target name/id cue details when available.
- Kept all gameplay/network logic untouched (`ResolvePendingDecision`, reveal flow, hub contracts unchanged); changes are strictly UI-layer and mobile-safe.
- Validation completed:
  - `npm --prefix .\frontend run lint` ✅ (same 2 baseline hook warnings in `App.tsx`)
  - `npm --prefix .\frontend run build` ✅
