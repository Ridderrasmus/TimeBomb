# Decisions

### 2026-02-22T17:04:57Z: Squad initialized for Time Bomb Evolution
**By:** Rasmus Tanggaard (via Copilot)
**What:** Established a six-member squad with focused roles for lead, game UI, backend, testing, Scribe, and Ralph.
**Why:** The project needs advanced in-game UI and ongoing support for backend gameplay edits with test coverage.

---

## 2026-02-22: Ripley Briefing — Frontend UI Enhancement Plan

### 2026-02-22T17:17:56Z: Phase 1–3 UI Roadmap Approved
**By:** Ripley (Lead) — Initial planning session
**What:** Three-phase frontend enhancement roadmap with 15 tasks across Hicks (Frontend), Parker (Backend), and Bishop (QA).
- Phase 1 (Weeks 1–2): Game state visualization (wire card animations, turn banner, player status cards, wire history panel)
- Phase 2 (Weeks 2–3): Decision flow UX (pending decision modal, effect callouts, color picker)
- Phase 3 (Weeks 3–4): Polish & mobile (responsive redesign, animation suite, accessibility audit)

**Why:** Current UI is functional but bare. Improvements are pure presentation-layer; no breaking backend changes.

**Key constraints:** None identified. Backend already provides all required data (round, turn, activePlayer, card, effect).

**Success Criteria:** All 3 phases completed on time, 60fps animation performance, responsive testing (desktop/tablet/mobile), zero new bugs vs. baseline.

**Review Gates:**
- Week 1, Day 1: Approve Hicks wireframes + Parker API contract review
- Week 2, Day 3: Phase 1 code review
- Week 3, Day 4: Phase 2 code review
- Week 4, Day 4: Phase 3 completion + a11y audit + regression test

---

### 2026-02-22T17:17:56Z: Architecture Reference Documented
**By:** Ripley (Lead)
**What:** Comprehensive architecture map including system diagram, data flow sequences (5 flows: create lobby, join, start game, reveal wire, pending decision), TypeScript interface definitions, and scalability analysis.

**Why:** Squad members need a shared mental model of system boundaries and data structures to coordinate effectively.

**Key findings:**
- Aspire orchestration correctly binds frontend and backend
- SignalR provides real-time sync (5-7 LobbyStateUpdated events per turn)
- Backend supports Standard and Evolution variants
- No persistence layer (in-memory store; <50 concurrent lobbies max)

---

### 2026-02-22T17:17:56Z: Backend Decision — No Phase 1 Changes Required
**By:** Parker (Backend) — Task 1.1 (API Contract Review)
**What:** Confirmed all API responses have fields needed for Phase 1 UI:
- ✅ LobbyStateDto has all wire data (round, turn, card, effect)
- ✅ RevealedWire.effect field populated (e.g., "Green bomb primed")
- ✅ PlayerPrivateStateDto correct for private hand visibility
- ✅ WireColor enum complete (6 colors: Green, Orange, Pink, Yellow, Blue, Red)
- ✅ ActivePlayerId set correctly during turns
- ✅ forcedTargetPlayerIdForNextTurn populated for red wire effect

**Why:** Zero backend risk for Phase 1 frontend work. UI improvements are self-contained.

**Phase 2 optional:** Consider adding optional `effectMessage` field to RevealedWire for flavor text (e.g., "Blue wire reactivated Orange!") — decided to defer unless Phase 2 testing requires it.

---

### 2026-02-22T17:17:56Z: Phase 1 Task Assignments (Hicks)
**By:** Ripley (Lead)
**What:** Hicks assigned 6 tasks in Phase 1 (Weeks 1–2):
1. Task 1.1: Wireframe & animation design (DUE: EOD Day 1)
2. Task 1.2: WireCard component (DUE: EOD Day 3)
3. Task 1.3: Wire history panel (DUE: EOD Day 5)
4. Task 1.4: Player status card (DUE: EOD Day 7)
5. Task 1.5: Turn banner enhancement (DUE: EOD Day 8)
6. Task 1.6: Integration & testing (DUE: EOD Day 10)

**Why:** Phase 1 is critical path. Dependencies: wireframes gate component development; components gate integration.

---

### 2026-02-22T17:17:56Z: QA Test Scope (Bishop)
**By:** Ripley (Lead)
**What:** Bishop assigned test fixture setup and responsive testing:
- Phase 1: Basic reveal, bomb reveal, active player highlight, forced target, pending decision scenarios
- Phase 1: Responsive testing (desktop 1920×1080, tablet 768×1024, mobile 375×667)
- Phase 2: Edge case scenarios (blue reactivate, green sequence, pink sequence, red forced target, defuse objective)
- Phase 3: Full accessibility audit (screen reader, keyboard nav, WCAG AA) + regression test on 4 platforms (Chrome, Firefox, Safari, Edge)

**Why:** QA gates code review. Fixtures ready before Hicks pushes Phase 1.

---

## 2026-02-22: Squad Execution Launch — Implementation-Ready Backlog Finalized

### 2026-02-22T18:26:08Z: Hicks — UI Implementation Backlog Approved
**By:** Hicks (Frontend UI Dev)
**What:** 14-task implementation-ready frontend roadmap across 3 phases:
- **Phase 1 (Weeks 1–2):** 6 tasks (wireframes → WireCard, WireHistory, PlayerStatusCard, TurnBanner → integration)
- **Phase 2 (Weeks 2–3):** 3 tasks (decision modal, effect toasts, color picker)
- **Phase 3 (Weeks 3–4):** 5 tasks (responsive redesign, animation suite, dark/light theme, a11y audit, regression doc)

**Technical Stack:**
- React 19 + TypeScript + Vite (existing monolithic App.tsx)
- CSS Modules + GPU acceleration (transform + opacity only)
- 3-tier responsive: 1920×1080 desktop, 768×1024 tablet, 375×667 mobile
- useAnimationFrame hook + @keyframes for 60fps consistency
- Semantic HTML + aria-labels (accessibility-first)

**Key Decisions:**
- Keep monolithic App.tsx; add reusable components (WireCard.tsx, etc.)
- No Redux (React hooks sufficient)
- CSS Grid subgrid for responsive layouts (Phase 3)
- Defer theme switcher UI to post-Phase 3

**Success Criteria:** All 14 tasks on schedule, 60fps animations (Lighthouse ≥90), responsive 3-viewport + 4-browser (Chrome, Firefox, Safari, Edge), WCAG 2.1 AA compliance, zero new bugs vs baseline.

**Backend Dependencies:** None for Phase 1–2; optional effectMessage field on RevealedWire for Phase 2 flavor text (defer unless Phase 2 QA testing requires).

**Review Gates:**
- Phase 1 Fixture (Day 10): Wireframes approved, components render, fixtures documented
- Phase 1 Code (Week 2 Day 3): Components integrate, responsive confirmed, 60fps verified
- Phase 2 Edge Cases (Week 3 Day 2): Modal/toasts/picker integrate, edge cases pass
- Phase 3 Completion (Week 4 Day 4): All Polish complete, WCAG AA pass, 4-browser regression pass

---

### 2026-02-22T18:26:08Z: Parker — Backend Contracts Finalized (Zero Changes)
**By:** Parker (Backend Specialist)
**What:** Comprehensive API audit + QA risk matrix. All backend contracts production-ready for Phase 1–2 frontend work.

**REST Endpoints Verified (5 core):**
- ✅ `POST /api/lobby` — CreateLobby
- ✅ `GET /api/lobby/{code}` — GetByCode
- ✅ `POST /api/lobby/{code}/join` — JoinLobby (broadcasts LobbyStateUpdated)
- ✅ `PUT /api/lobby/{code}/rules` — UpdateRules
- ✅ `POST /api/lobby/{code}/start` — StartGame

**SignalR Hub Methods Verified (6 core):**
- ✅ `JoinLobbyChannel` — Subscribe to lobby updates
- ✅ `RequestPrivateState` — Fetch player hand + prep state
- ✅ `RevealWire` — Execute turn (broadcasts WireRevealed → LobbyStateUpdated)
- ✅ `ResolvePendingDecision` — Submit modal choice (broadcasts WireResolved → LobbyStateUpdated)
- ✅ `MarkRoundReady` — Signal ready for next round
- ✅ Hub events: LobbyStateUpdated, WireRevealed, WireResolved, LobbyDeleted

**Data Contracts Verified (All Fields Present):**
- ✅ `LobbyStateDto` — game state + players + rules + outcome
- ✅ `GameRuntimeDto` — round, turn, activePlayer, forcedTargetPlayerIdForNextTurn, bomb/defuse counts, wire history
- ✅ `RevealedWire` — round, turn, card, effect (optional), decision results
- ✅ `PlayerPrivateStateDto` — team, hand, ready flag, prep state
- ✅ `PendingDecisionDto` — type, requestor, available colors

**Zero Breaking Changes Required:** Hicks frontend development can proceed independently.

**Parker Backend Tasks (3 defensive, non-blocking):**
- **P1.1:** API contract review & sign-off (EOD Day 1) — Document zero changes; baseline confirmed
- **P1.2:** SignalR flow validation (EOD Day 3) — Multi-player test, verify event ordering (5–7 LobbyStateUpdated/turn)
- **P1.3:** Error message audit (EOD Day 7) — Ensure hub exceptions have clear context for frontend error handling

**QA Risk Matrix (For Bishop):**
5 critical blockers + 6 high-risk concerns documented with mitigations:
- Decision race condition: Validate second ResolvePendingDecision rejected with HubException
- Forced target bypass: Validate backend rejects invalid targets
- Empty hand reveal: Validate targetPlayer.HasCards() check
- Outcome corruption: Validate Winner + Reason both set on game end
- Round prep hang: Validate all-ready check before advancing
- State sync lag: Verify full LobbyStateDto broadcast (no partial updates)
- Null effect handling: Verify frontend handles RevealedWire.effect=null gracefully
- Active player invalid: Verify GetActivePlayerId() valid after player leaves
- Bomb color mismatch: Verify SelectedBombColors matches player count (Evolution)
- Mobile backlog: Verify frame rate ≥50fps under rapid events

**Optional Enhancements (Phase 2+, defer):**
- Add `RevealedWire.effectMessage: string?` for flavor text (e.g., "Blue reactivated Orange!") — assess Phase 2 QA need
- Add animation sequence hints (Phase 3 polish)
- Add player statistics endpoint (post-Phase 3)

**Success Criteria:** All required endpoints + hub methods + DTOs validated and confirmed production-ready. P1.1–P1.3 tasks on schedule. Bishop QA tests pass without backend blockers.

---

### 2026-02-22T18:26:08Z: Bishop — QA Test Roadmap Finalized (13 Tasks, 4 Gates)
**By:** Bishop (QA Specialist)
**What:** 13 implementation-ready QA tasks across 3 phases, covering backend unit tests, SignalR integration, frontend fixtures, E2E flows, edge cases, and accessibility audit.

**Current Test Coverage Gaps (9 Critical/High):**
| Layer | Gap | Priority |
|-------|-----|----------|
| Backend Game Logic | Core loop (RevealWire, outcomes, edge cases) untested | **CRITICAL** |
| Backend SignalR | Mapper transforms, data sync untested | **HIGH** |
| Frontend UI | No test framework; rendering/state untested | **HIGH** |
| Integration (4-player) | Full game flow unvalidated | **CRITICAL** |
| Evolution Rules (5 effects) | All effects untested; interactions unknown | **HIGH** |
| Responsive Design | 3 viewports untested | **MEDIUM** |
| Accessibility | Keyboard nav, screen reader, WCAG AA untested | **MEDIUM** |

**Phase 1 (Weeks 1–2) — 4 Tasks:**
- **B1.1:** Backend game logic unit tests (EOD Day 2)  
  Target: TimeBombGame.cs, GameState.cs; ≥80% coverage
- **B1.2:** Backend SignalR mapper integration tests (EOD Day 5)  
  Target: LobbyStateMapper.cs, PlayerPrivateStateMapper.cs; ≥90% coverage
- **B1.3:** Frontend test fixture setup (EOD Day 7)  
  Target: 5 manual scenarios (basic reveal, bomb, active highlight, forced target, error handling)
- **B1.4:** Responsive testing (EOD Day 8)  
  Target: 3 viewports (1920×1080, 768×1024, 375×667); screenshots, no overflow, ≥48px touch targets

**Phase 2 (Weeks 2–3) — 6 Tasks:**
- **B2.1:** 4-player game full flow E2E (EOD Week 2 Day 3) — Happy path: create, join, ready, 15+ reveals, verify outcome
- **B2.2:** Blue reactivate sequence (EOD Week 2 Day 5) — Modal appears, color selection resolves, state correct
- **B2.3:** Green bomb 3-count explosion (EOD Week 3 Day 1) — Reveal 3rd Green → auto-defuse → verify outcome
- **B2.4:** Pink consecutive-reveal explosion (EOD Week 3 Day 1) — LastRevealedWire tracking; bomb on 2nd consecutive Pink
- **B2.5:** Red wire forced target (EOD Week 3 Day 2) — Red reveals → badge → next turn forced to target (deterministic seed)
- **B2.6:** Defuse objective + unassigned wires (EOD Week 3 Day 2) — Clarify rules with Parker; verify win condition

**Phase 3 (Weeks 3–4) — 3 Tasks:**
- **B3.1:** Evolution 5-effect E2E (EOD Week 3 Day 2) — All effects: Green 3, Orange R4, Pink consecutive, Blue reactivate, Red forced target
- **B3.2:** Accessibility audit WCAG AA (EOD Week 3 Day 5) — Keyboard nav, focus (≥2px, ≥4.5:1 contrast), semantic HTML, screen reader, prefers-reduced-motion
- **B3.3:** Regression on 4 browsers (EOD Week 4 Day 4) — Chrome, Firefox, Safari, Edge; full game flow, no visual glitches

**Review Gate Criteria:**
- **Gate 1 (Day 10):** B1.1–B1.4 all passing; ≥80% backend coverage; 5 fixtures documented; 3 viewports stable
- **Gate 2 (Week 2 Day 3):** H1.2–H1.6 components render; responsive confirmed; 60fps verified; no regressions
- **Gate 3 (Week 3 Day 2):** B2.1–B2.6 all edge cases pass; no new bugs; H2.1–H2.3 integrate
- **Gate 4 (Week 4 Day 4):** B3.1–B3.3 complete; WCAG AA pass; Lighthouse ≥90 desktop ≥80 mobile; ready for production

**Blocker Risks & Mitigations (6 Key):**
1. No test framework (Jest/Vitest) → Day 1 setup; fallback Playwright E2E
2. Test harness (Aspire multi-player) → Pre-stage 4-player Aspire; document setup
3. Evolution rules ambiguity → Week 1 Parker 1-hour session for clarification
4. Random seed non-determinism → Use `TimeBombGameOptions.RandomSeed` in tests
5. Multi-browser testing → Set up Playwright GitHub Actions; auto-test all 4 browsers
6. Screen reader unavailable → axe DevTools (automated); manual NVDA (Windows) + VoiceOver (macOS)

**Acceptance Criteria Matrices:** Documented for 6 feature areas (game state viz, decision flow, forced target, responsive, accessibility).

**Success Criteria:** All 13 tasks on schedule, ≥80% backend coverage, ≥90% mapper coverage, WCAG AA pass, zero new bugs, all 4 gates approved, Ripley sign-off.

---

### 2026-02-22T18:26:08Z: Ripley — Unified Implementation-Ready Execution Backlog
**By:** Ripley (Lead Coordinator)
**What:** Consolidated 14-task execution backlog synthesizing Hicks (6 frontend Phase 1, 3 Phase 2, 5 Phase 3), Parker (3 backend Phase 1), and Bishop (4 QA Phase 1, 6 Phase 2, 3 Phase 3). Unified timeline (4 weeks), explicit dependencies, risk matrix (7 risks), rollback posture, daily standup template, owner role definitions.

**14 Total Implementation-Ready Tasks:**
- **Phase 1 (Weeks 1–2):** 6 Hicks + 3 Parker + 4 Bishop = **13 parallel tasks**
- **Phase 2 (Weeks 2–3):** 3 Hicks + 0 Parker + 6 Bishop = **9 parallel tasks**
- **Phase 3 (Weeks 3–4):** 5 Hicks + 0 Parker + 3 Bishop = **8 parallel tasks**

**Phase 1 Critical Path:**
1. **Day 1 Parallel Launch:** H1.1 (wireframes) + P1.1 (API contract) + B1.1 (backend tests)
2. **Ripley Gate 1 (Day 1):** Approve H1.1 wireframes → [Approve → H1.2–H1.5 proceed] or [Revise → H1.1 extends]
3. **Days 2–8:** H1.2–H1.5 components + B1.2–B1.4 tests in parallel
4. **Day 10 Gate Review:** Criteria: H1.1–H1.5 approved, B1.1–B1.4 ≥80% coverage, P1.1–P1.2 validated
   → APPROVE → Phase 2 OR REVISE → Phase 1 rework

**4 Mandatory Review Gates:**
1. **Phase 1 Fixture Approval (EOD Day 10)** — Blocks Hicks component merge
   - Criteria: Components render, fixtures documented (5 scenarios), responsive stable (3 viewports), ≥80% test coverage
   - Decision: APPROVE (→ Phase 2) or REVISE (→ Phase 1 extends)
2. **Phase 1 Code Review (EOD Week 2 Day 3)** — Blocks merge to main
   - Criteria: No console errors, visual regression <5%, responsive confirmed, 60fps (Lighthouse ≥90)
   - Decision: APPROVE (→ Phase 2) or REVISE (→ components rework)
3. **Phase 2 Edge Case Approval (EOD Week 3 Day 2)** — Blocks Phase 2 merge; triggers Phase 3
   - Criteria: B2.1–B2.6 all edge cases pass, no new bugs, H2.1–H2.3 integrate
   - Decision: APPROVE (→ Phase 3) or ESCALATE (→ Parker game logic review)
4. **Phase 3 Completion + A11y + Regression (EOD Week 4 Day 4)** — Blocks deployment
   - Criteria: All Phase 3 tasks complete, WCAG AA pass, 4-browser regression pass, Lighthouse ≥90 desktop ≥80 mobile
   - Decision: APPROVE (→ Production) or HOLD (→ Phase 3 rework)

**Risk Controls (7 Key Risks):**
| Risk | Severity | Control | Rollback |
|------|----------|---------|----------|
| H1.1 design infeasible | HIGH | Ripley challenges Day 1; defer complex animations | Simplify to static transitions; Phase 3 backfill |
| SignalR race condition | HIGH | Bishop B1.2 stress test (10 reveals/sec) | Revert to full-state only; extend Phase 1 by 2 days |
| Responsive layout thrashing | MEDIUM | Test on actual devices; capture video | Revert to single 760px breakpoint; Phase 3 retry |
| A11y contrast fails | MEDIUM | Contrast checker before Phase 3 approval | Increase wire color saturation; defer light mode |
| Animation <60fps | MEDIUM | DevTools profile; check will-change/transform | Simplify to 30fps; Phase 3 retry with optimization |
| Test harness setup delay | LOW | Pre-stage Aspire with local DNS | Use 4-browser-tab manual simulation |
| Mobile animation backlog | LOW | Frontend event queue + debounce + 60fps cap | Mobile testing Phase 3; non-blocking |

**Rollback Rules:**
- **Phase 1 Gate:** If ≥2 criteria fail → roll back to Day 1; extend timeline 2 weeks. **No partial merge.**
- **Phase 2 Gate:** If edge case >1 failure → Parker investigates game logic; rollback H2 until fixed.
- **Phase 3 Gate:** If Lighthouse <85 desktop or A11y >3 failures → hold deployment; Phase 3 rework.

**Branch Strategy:**
- Feature branches: `feature/phase{N}-{task-id}` (e.g., `feature/phase1-h1-2-wirecard`)
- Code review required before merge to main
- Each merge includes smoke test (basic 2-player game flow)
- Performance baseline at Phase 1 merge; Phase 3 must not regress >5%

**Owner Roles & Responsibilities:**
- **Hicks (Frontend Dev):** Build components, optimize 60fps, collaborate on error messages
- **Parker (Backend):** Validate contracts, clarify edge cases, support test harness if needed
- **Bishop (QA):** Execute tests, capture evidence, escalate failures
- **Ripley (Lead):** Gate decisions (final authority), daily standup sync, blocker resolution within 24h, scope guard

**Daily Standup Template:**
```
[Owner]: [Task-ID] — Status

Hicks:
- H1.X: [Completed / In Progress / Blocked]
- Blockers: [None / List issues]
- Next 24h: [Next task]

Parker:
- P1.X: [Status]
- Blockers: [None / List issues]
- Next 24h: [Next task]

Bishop:
- B1.X: [Status]
- Blockers: [None / List issues]
- Next 24h: [Next task]

Ripley:
- Gate decisions: [Approved / Pending / Revise]
- Escalations: [If any]
- Next 24h: [Gate review / blocker resolution]
```

**Success Metrics (Phase 1–3):**
✅ All 14 tasks on schedule  
✅ 60fps animation performance (Lighthouse ≥90)  
✅ Responsive testing on 3 viewports, 4 browsers  
✅ WCAG 2.1 AA accessibility compliance  
✅ Zero new bugs vs baseline  
✅ Ripley approval at all 4 gates  

**Dependencies Met:**
- ✅ Hicks frontend roadmap (14 components identified, 3-tier responsive)
- ✅ Parker backend validation (zero changes, API surfaces ready)
- ✅ Bishop QA roadmap (13 test tasks, 4 gates, acceptance criteria)

**Immediate Next Steps:**
1. Ripley presents unified backlog to Rasmus (Team Root)
2. Rasmus greenlight → all tasks approved
3. Day 1 execution: H1.1, P1.1, B1.1 start in parallel
4. Ripley monitors daily standups, manages gates, escalates to Rasmus only for scope disputes

---

## 2026-02-22: Phase 1 Implementation Batch — Execution Complete and Approved

### 2026-02-22T18:26:08Z: Bishop — Test Baseline Implementation Complete
**By:** Bishop (QA Specialist)

**Decision:** Implement deterministic backend game-logic test baseline in dedicated `TimeBomb.Server.Tests` project.

**Scope Implemented:**
- Created `TimeBomb.Server.Tests` (xUnit, net10.0), integrated into `TimeBomb.sln`
- Deterministic tests covering:
  - Player count validation (4–6 only)
  - Bomb-color validation (count + uniqueness)
  - Round turn-limit behavior (standard and Evolution orange reduction)
  - Round preparation readiness transition
  - Pending-decision color validation
- Validation: `dotnet test .\TimeBomb.sln -nologo` — **11 passed, 0 failed** ✅

**Why:** Core `TimeBombGame` rules had zero automated coverage, leaving regressions unguarded.

**Impact:** Stable backend regression baseline enables CI-ready test execution from solution root.

---

### 2026-02-22T18:26:08Z: Hicks — Phase 1 UI Implementation Slice Complete
**By:** Hicks (Frontend UI Developer)

**Decision:** Implement Phase 1 execution slice as reusable presentation components without changing gameplay or networking.

**Scope Implemented:**
- Added `TurnStateProminence` for prominent active-turn, round, and turn-limit context
- Added `PlayerStatusCards` for card-like player summaries with explicit Active and Forced target visual cues
- Added `RevealedWireHistory` for richer, player-attributed history entries
- Integrated components into `App.tsx` in place of inline sections
- Applied responsive UI polish in `App.css` (spacing hierarchy, chip/badge emphasis, transitions)
- Hub methods, REST requests, state contracts **unchanged**

**Why:** Incremental Phase 1 progress with lower risk; improves readability and decision speed with stronger state prominence.

**Impact:** Frontend remains contract-compatible with existing backend DTOs/events; UI structure more maintainable for Phase 1/2 follow-up.

---

### 2026-02-22T18:26:08Z: Parker — Phase 1 Backend Support (Additive Metadata Only)
**By:** Parker (Backend Specialist)

**Decision:** Ship additive, optional cue metadata in existing DTOs/events without breaking changes.

**Scope Implemented:**
- Added `forcedTargetPlayerNameForNextTurn` and `recentEffectCue` to `GameRuntimeDto`
- Added optional forced-target metadata to `RevealedWire`
- `RevealWire` returns updated revealed-wire snapshot (including effect/cue data) after effect evaluation
- **Zero breaking changes; full backward compatibility maintained**

**Why:** Supports richer UI cues without frontend-breaking contract changes; keeps core gameplay rules unchanged and risk low.

**Impact:** Existing consumers continue working unchanged; new frontend cue implementations can read normalized metadata directly.

---

### 2026-02-22T18:26:08Z: Ripley — Phase 1 Implementation Review (APPROVED)
**By:** Ripley (Lead Coordinator)

**Review Scope:**
- Frontend: `App.tsx`, `App.css`, `src/components/*`
- Backend: `GameModels.cs`, `TimeBombGame.cs`, `LobbyStateDto.cs`
- Tests/Solution: `TimeBomb.Server.Tests/*`, `TimeBomb.sln`

**Validation Results:**
- `dotnet build .\TimeBomb.sln` ✅
- `dotnet test .\TimeBomb.sln --no-build` ✅ (11 passed, 0 failed)
- `npm --prefix .\frontend run build` ✅
- `npm --prefix .\frontend run lint` ✅ (2 baseline warnings: `react-hooks/exhaustive-deps` in `App.tsx`)

**Review Findings:**
1. **Cross-stream coherence:** Frontend UI decomposition aligns with existing lobby/game contracts; does not alter gameplay/network flow
2. **Backend contract quality:** Cue metadata additions are additive/optional and backward-compatible; `RevealWire` returns post-effect snapshots consistently
3. **Test stream:** xUnit project integrated; provides deterministic baseline for validation guards and turn-limit behavior

**Non-Blocking Risks:**
- New cue mapping paths (`ForcedTargetPlayerNameForNextTurn`, `RecentEffectCue`, forced-target fields on `RevealedWire`) not yet covered by mapper/game tests
- Frontend does not yet consume `recentEffectCue`; cue data exists in both structured and free-text forms (drift risk over time)

**Verdict:** ✅ **APPROVED** — Phase 2 launch enabled

**Next Batch Recommendations:**
- **Bishop:** Add focused tests for red-wire forced-target metadata and `RecentEffectCue` mapping output
- **Hicks:** Use `recentEffectCue` for transient in-game cue surface with reduced-motion and screen-reader handling
- **Parker:** Document source-of-truth expectations between structured cue metadata and free-form `Effect` text

**Phase 2 Ready:** All agents cleared; Phase 2 tasks H2.1–H2.3 + B2.1–B2.6 scheduled for launch

---

## 2026-02-22: Phase 2 + Bugfix Batch — Implementation Complete and Approved

### 2026-02-22T19:12:55Z: Hicks — Phase 2 Decision UX Implementation Complete
**By:** Hicks (Frontend UI Developer)
**What:** Implemented pending-decision modal UX with two-step interaction and effect cue visibility enhancement.
**Decisions:**
1. Pending decisions use modal-style UI with explicit select-color + confirm-CTA flow to prevent accidental instant resolves
2. Effect cue rendering prioritizes `game.recentEffectCue` with fallback to latest revealed wire `effect` field
3. Forced-target label uses backend `forcedTargetPlayerNameForNextTurn` with ID/name fallback for compatibility
**Why:** Improves decision confidence and readability under turn pressure; uses additive backend metadata as source-of-truth.
**Impact:** Frontend remains contract-compatible; Phase 2 UX slice production-ready.

---

### 2026-02-22T19:12:55Z: Parker — Standard-vs-Evolution Special-Effect Bug Fix
**By:** Parker (Backend Specialist)
**What:** Fixed standard-variant special-effect bug where red forced-target effect was incorrectly applied to non-Evolution games.
**Decision:** Red forced-target effect logic now strictly Evolution-only via explicit guard in `ApplyRedEffect`; no effect text or forced-target metadata in Standard variant.
**Why:** Enforce user directive that non-Evolution games must have zero special color effects.
**Implementation:**
- Updated `TimeBombGame.EvaluateRevealAndPrepareDecision` to exit before color effects in Standard path
- Added regression test `RevealWire_DoesNotApplyRedForcedTargetEffect_InStandardVariant`
- Preserved full Evolution behavior with complete metadata chain
**Impact:** No breaking changes; backward-compatible; variant compliance now automated in CI.

---

### 2026-02-22T19:12:55Z: Bishop — Standard-vs-Evolution Regression Test Lock
**By:** Bishop (QA Specialist)
**What:** Implemented deterministic regression tests to lock standard-vs-evolution variant behavior.
**Tests Added:**
1. `RevealWire_DoesNotApplyRedForcedTargetEffect_InStandardVariant` — Confirms no effect metadata in Standard
2. `RevealWire_AppliesRedForcedTargetEffect_InEvolutionVariant` — Confirms red forced-target behavior in Evolution
**Why:** Prevent future regressions; enforce automated compliance in test suite.
**Result:** All 13 tests passing; variant behavior locked.

---

### 2026-02-22T19:12:55Z: Ripley — Phase 2 + Bugfix Batch Review (APPROVED)
**By:** Ripley (Lead Coordinator)
**Review Scope:**
- Frontend Phase 2: `App.tsx` pending-decision modal, effect cue rendering
- Backend bugfix: `TimeBombGame` red-effect Evolution guard
- QA regression: Standard-vs-Evolution deterministic test pairs
**Validation:**
- `dotnet build .\TimeBomb.sln -nologo` ✅
- `dotnet test .\TimeBomb.sln -nologo` ✅ (13 passed, 0 failed)
- `npm --prefix .\frontend run build` ✅
- `npm --prefix .\frontend run lint` ✅ (2 baseline warnings unchanged)
**Findings:**
1. Standard bugfix correct: Red forced-target strictly Evolution-only
2. Evolution behavior preserved: Full metadata chain intact
3. Phase 2 UI coherent: Decision flow + cues non-breaking, contract-compatible
4. Regression tests locked: Variant compliance automated
**Non-Blocking Observations:**
- `recentEffectCue` mapped but not yet consumed by frontend (drift risk; Phase 3 opportunity)
- Forced-target fallback chain resilient but could benefit from mapper tests
**Verdict:** ✅ **APPROVED** — Phase 2 production-ready; directive enforced
**Next Recommendations:**
- Add mapper/contract tests for `recentEffectCue` projection
- Add UI integration tests for pending-decision confirm flow
- Consider Evolution scenario: red forced-target chained across multiple turns

---

## 2026-02-23: Phase 3 Fun UI Batch — Implementation Complete and Approved

### 2026-02-23T09:02:45Z: Hicks — Phase 3 Fun UI Implementation Complete
**By:** Hicks (Frontend UI Developer)
**What:** Added additive frontend-only Phase 3 UX upgrades in `frontend/src`: reusable wire card visuals, revealed-pile totals by kind/color, circular in-game player table layout with responsive fallback, and visual pre-shuffle hand cards.
**Why:** Deliver a more playful/readable in-match experience while preserving existing game logic, API contracts, and SignalR flow.
**Implementation:**
- Added reusable `WireVisualCard` rendering component for wire display
- Replaced text-only wire displays in revealed history and pre-shuffle hand preview with card visuals
- Implemented `RevealedPileTotals` surface showing aggregate (total, Bomb/Defuse split, per-color)
- Shifted player cards to circular table layout with responsive fallback to stacked grid
- All changes frontend-only; zero game logic or contract changes
**Validation:**
- `npm --prefix .\frontend run build` ✅
- `npm --prefix .\frontend run lint` ✅ (2 baseline warnings in App.tsx only)
- Contract compatibility preserved with existing backend DTOs
**Impact:** Phase 3 UI slice production-ready; no breaking changes.

---

### 2026-02-23T09:02:45Z: Parker — Phase 3 Backend Metadata Support
**By:** Parker (Backend Specialist)
**What:** Added additive optional runtime metadata `RevealedPileTotalsByPlayer` to `GameRuntimeDto` in `TimeBomb.Server\Hubs\LobbyStateDto.cs`, mapped from `TimeBombGame.RevealedWires` and normalized to include all players (0 when no revealed cards).
**Why:** Enables Phase 3 visual revealed-pile totals in a card-centric UI without changing game rules, event flow, or existing client contracts.
**Implementation:**
- New field: `RevealedPileTotalsByPlayer` (additive, optional)
- Mapper normalizes all players with zero-default behavior
- Fully backward-compatible; zero breaking changes
**Validation:**
- `dotnet build .\TimeBomb.sln -nologo` ✅
- Metadata correctly populated and accessible to frontend consumers
- Zero impact on existing REST/SignalR event flow
**Impact:** Backend phase 3 support production-ready.

---

### 2026-02-23T09:02:45Z: Bishop — Phase 3 Regression Lock Expansion
**By:** Bishop (QA Specialist)
**What:** Implemented deterministic mapper-focused regression coverage to validate additive `LobbyStateDto` metadata (`ForcedTargetPlayerNameForNextTurn`, `RecentEffectCue`, and player remaining wire counts) while preserving existing standard-vs-evolution red-effect game behavior locks.
**Why:** Phase 3 UI/features depend on stable backend cue metadata; mapper assertions prevent silent contract drift after additive DTO changes.
**Implementation:**
- Added mapper regression tests for `RevealedPileTotalsByPlayer` normalization
- Confirmed standard-vs-evolution red-effect locks still enforced
- Verified all players present with zero-default mapping
**Validation:**
- `dotnet test .\TimeBomb.sln -nologo --no-build` ✅ (15 tests passing)
- Variant behavior locked; no cross-variant leakage
- All mapper assertions passing
**Impact:** Phase 3 regression locks validated; DTO integrity maintained.

---

### 2026-02-23T09:02:45Z: Ripley — Phase 3 Review Gate (APPROVED)
**By:** Ripley (Lead Coordinator)
**Review Scope:**
- Frontend: Phase 3 card visuals, revealed totals, circular layout, pre-shuffle hand
- Backend: `RevealedPileTotalsByPlayer` metadata addition
- Tests: Mapper regression coverage expansion
- Integration: Cross-agent coherence check
**Validation Checkpoints:**
- `dotnet build .\TimeBomb.sln -nologo` ✅
- `dotnet test .\TimeBomb.sln -nologo --no-build` ✅ (15/15 passed)
- `npm --prefix .\frontend run build` ✅
- `npm --prefix .\frontend run lint` ✅ (2 baseline warnings only)
**Findings:**
1. Frontend coherence: Card-first visuals, revealed totals, circular layout all cleanly integrated without gameplay changes
2. Backend quality: Metadata additive and fully backward-compatible; mapper correctly normalized
3. Test coverage: Regression locks maintained; mapper assertions validate DTO integrity
4. Variant protection: Standard-vs-evolution guardrails intact; no cross-variant leakage
**Non-Blocking Observations:**
- Next phase should deepen tabletop feel through motion/state choreography
- Reduced-motion and accessibility handling key for animation enhancements
- Consider player-attributed pile chips and reveal-lane animation
**Verdict:** ✅ **APPROVED** — Phase 3 production-ready

---

### 2026-02-23T09:02:45Z: Next-Phase Vision Direction
**By:** Ripley (Lead Coordinator)
**Vision Statement:** Shift from "read game state" to "feel the table": keep card-first visuals, then layer motion and spatial cues so reveals, forced-target pressure, and prep-to-shuffle flow are legible in under a second.

**Four Anchors:**
1. **Revealed pile totals:** Keep totals visible at a glance; tie them to player/table context
2. **Card visuals over text:** Use visual cards/chips as primary signal; text as secondary context
3. **Circle/table feel:** Preserve circular seating; add table-centric turn/target movement cues
4. **Pre-shuffle hand preview:** Make prep hands feel tactile; transition clearly into hidden play

**Hicks Recommendations (Next Batch):**
1. Add **table-center reveal lane** animating each cut card into history/pile totals (reduced-motion fallback required)
2. Upgrade pile totals into **player-attributed pile chips** (quick "who-has-cut-most" signal)
3. Add **turn-token + forced-target path animation** around the circular layout (<500ms, non-blocking)
4. Enhance prep with **fan + shuffle-away transition** (visible before shuffle is explicit and memorable)

**Parker Recommendations (Next Batch):**
1. Keep DTOs additive; document `RevealedPileTotalsByPlayer` as source-of-truth
2. Add focused mapper coverage for new totals normalization contract
3. Preserve variant guardrails; no special-effect leakage into Standard

**Bishop Recommendations (Next Batch):**
1. Add regression tests for new mapper totals contracts
2. Run frontend fixture checks for circular/table layouts at desktop/tablet/mobile
3. Validate reduced-motion behavior and keyboard/screen-reader flow
4. Add visual regression checklist for card-first surfaces

---

## 2026-02-23: Phase 4 Board Polish Batch — Implementation Complete and Approved

### 2026-02-23T15:47:00Z: Hicks — Phase 4 Board Polish Implementation Complete
**By:** Hicks (Frontend UI Developer)
**What:** Delivered Phase 4 board-game polish enhancements: reveal lane presentation, revealed-pile analytics upgrade, circular table turn-path clarity, and tactile round-prep hand transition.

**Decisions:**
1. **Reveal lane as first-class visual surface:** Recent-reveal lane above history list prioritizes `WireVisualCard` rendering with minimal text (`R/T` + attribution).
2. **Revealed pile readability upgrade:** Added Bomb/Defuse progress bars, color-level micro meters, and top-contributor chips. Data strategy: derive from existing `revealedWires` first, consume optional `revealedPileTotalsByPlayer` when present.
3. **Circular table turn-path clarity:** Active-turn ring arc + token emphasis around circular seats. Forced-target visual pressure cue through ring styling. Responsive/mobile fallback preserved.
4. **Round-prep hand transition made tactile:** Subtle prep fan settle animation and ready-state shuffle-away visual cue. Reduced-motion fallback included.

**Constraints Confirmed:**
- No gameplay/network/rules logic changes
- Frontend changes additive and behavior-safe
- Mobile-safe and reduced-motion fallbacks included

**Validation:**
- `npm --prefix .\frontend run lint` ✅ (2 baseline App.tsx hook warnings)
- `npm --prefix .\frontend run build` ✅

**Impact:** Phase 4 UI slice production-ready; board-game feel achieved without breaking changes.

---

### 2026-02-23T15:47:00Z: Parker — Phase 4 Turn-Transition Metadata Support
**By:** Parker (Backend Specialist)
**What:** Added optional `PreviousActivePlayerId` field to `GameRuntimeDto` to enable Phase 4 turn-token path animations.

**Decision:** Track previous active player from most recent revealed wire to support smooth turn-token transition animations without changing gameplay logic.

**Implementation:**
- New field: `PreviousActivePlayerId` (optional, nullable)
- Mapper logic: `ResolvePreviousActivePlayerId` returns `ActivePlayerId` from last revealed wire
- Behavior: Returns `null` when no wires revealed (game start, round prep)
- Fully backward-compatible

**Animation Support Matrix:**
| Animation Feature | Backend Support | Status |
|------------------|----------------|--------|
| Turn-token path | `PreviousActivePlayerId` → `ActivePlayerId` | ✅ NEW |
| Reveal-lane | `RevealedFromPlayerId`, `ActivePlayerId` in `RevealedWire` | ✅ Existing |
| Player pile chips | `RevealedPileTotalsByPlayer` (Phase 3) | ✅ Existing |
| Prep fan/shuffle | `IsRoundPreparation` + `GetVisibleHandForPlayer` | ✅ Existing |

**Validation:**
- `dotnet build .\TimeBomb.sln -nologo` ✅
- `dotnet test .\TimeBomb.sln -nologo` ✅ (17/17 tests)
- Zero breaking changes; backward-compatible optional field
- No gameplay logic changes; variant guardrails preserved

**Impact:** Minimal implementation (1 field, 1 mapper method); maintains additive-only DTO pattern from Phases 2–3.

---

### 2026-02-23T15:47:00Z: Ripley — Phase 4 Lead Review Gate (APPROVED)
**By:** Ripley (Lead Coordinator)

**Review Criteria:**

1. **UI Clearly More Board-Like/Fun and Less Wall-of-Text** ✅ PASS
   - Circular table layout with turn-token indicator and forced-target path highlighting (>980px)
   - Card-centric wire visuals via `WireVisualCard` component replace raw text
   - Revealed-pile analytics: top-3 contributors, Defuse/Bomb progress bars, per-color breakdowns (6 colors)
   - Recent reveals lane: Top-3 wires with latest-item pulse animation
   - Visual hand fan with card grid and subtle rotation (disabled at <760px)

2. **Changes Remain Additive and Low-Risk** ✅ PASS
   - Frontend: New components added without modifying game logic or API contracts
   - Backend: `LobbyStateDto` extended with optional fields (`revealedPileTotalsByPlayer`, `previousActivePlayerId`)
   - Mapper logic: Additive helper methods with null fallback
   - No breaking changes; all existing contracts and behavior preserved

3. **Standard-vs-Evolution Behavior Locks Remain Intact** ✅ PASS
   - Red forced-target effect still Evolution-only (validated in UnitTest1.cs lines 136–275)
   - Mapper assertions confirm Standard variant leaves forced-target metadata null
   - No new variant-conditional code in Phase 4

4. **Validation Evidence Supports Readiness** ✅ PASS
   - `dotnet build .\TimeBomb.sln` ✅
   - `dotnet test .\TimeBomb.sln` ✅ (17 passing tests, including 4 new mapper tests)
   - `npm --prefix .\frontend run build` ✅
   - `npm --prefix .\frontend run lint` ✅ (2 baseline warnings only)

5. **Must-Fix Issues** NONE

**Verdict:** ✅ **APPROVED** — Phase 4 production-ready. Recommend merge and progression to next slice.

**Next Slice Targets (Week 5):**
1. **Animation polish:** Smooth wire reveal transitions, pile update animations, card flip effects
2. **Turn choreography:** Active-player highlight sequence refinement, forced-target path animation tuning
3. **Accessibility audit:** ARIA labels for progress bars, circular layout semantics, screen-reader testing

**Follow-up (Week 6):**
4. **Responsive layout stress-testing:** Verify <760px breakpoint with 6-player games and long names
5. **Performance profiling:** Measure re-render costs for circular layout with CSS animations
6. **E2E visual regression:** Capture baseline screenshots and validate future changes
