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
