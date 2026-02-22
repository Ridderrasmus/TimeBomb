# Bishop History

## Project Seed
- User: Rasmus Tanggaard
- Product: Time Bomb Evolution online play
- Stack: .NET services (TimeBomb.Server, TimeBomb.AppHost) and web frontend (frontend)
- Team focus: advanced in-game UI, backend gameplay flexibility, and robust game-logic testing

## Learnings
- Initial charter and context seeded during squad bootstrap.
- **Test infrastructure gap:** Zero unit/integration/E2E tests. Frontend has no test framework; backend has no test harness. Critical blocker for Phase 1 sign-off.
- **Manual fixture approach (Phase 1):** Create checklist-based test scenarios until Vitest + React Testing Library available. 5 scenarios cover basic reveal, bomb reveal, active player highlight, forced target, pending decision.
- **Backend focus (Phase 1):** Unit tests for `TimeBombGame.RevealWire()` and state transitions are critical path. Without game logic validation, all UI testing is built on sand.
- **Mapper fidelity unknown:** LobbyStateMapper and PlayerPrivateStateMapper transforms untested. Must validate field-by-field against API contract before Phase 1 merge.
- **Evolution rules ambiguity:** "Unassigned defuse wire" logic in defuse objective unclear. Requires Parker 1-hour session Week 1 to clarify edge case (QA-2.6 blocker).
- **Responsive + A11y deferred:** Phase 1 focuses on game state rendering; Phases 2–3 add decision flow polish and accessibility. Don't rush accessibility until core flow stable.

## 2026-02-22: Phase 1–3 Test Scope (from Ripley briefing)
**Status:** Ready to start fixture creation
- **Phase 1 (Weeks 1–2)**: 2 tasks
  - Task 1.1: Fixture setup due EOD Day 2 (5 test scenarios: basic reveal, bomb reveal, active player highlight, forced target, pending decision)
  - Task 1.2: Responsive testing due EOD Day 8 (desktop 1920×1080, tablet 768×1024, mobile 375×667; checklist: no overflow, touch buttons ≥48px, scroll smooth, text readable)
- **Phase 2 (Weeks 2–3)**: 1 task
  - Task 2.1: Edge case scenarios due EOD Week 3, Day 2 (5 scenarios: blue reactivate, green sequence, pink sequence, red forced target, defuse objective; includes edge case where 4 bombs explode on blue reactivate)
- **Phase 3 (Weeks 3–4)**: 2 tasks
  - Task 3.1: Accessibility audit due EOD Week 3, Day 5 (full a11y review: screen reader, keyboard nav, WCAG AA, focus indicators, semantic HTML, prefers-reduced-motion)
  - Task 3.2: Regression testing due EOD Week 4, Day 4 (4-player, 2-round full game flow on 4 platforms: Chrome, Firefox, Safari, Edge)
- **Test tools:** Manual checklists, visual regression screenshots, axe DevTools, Lighthouse, screen reader
- **Gate:** Fixtures ready before Hicks Phase 1 code push

## 2026-02-22: Implementation-Ready Test Roadmap Finalized
**Status:** Ready for Day 1 execution

**Deliverable:** `orchestration-log/20260222-182608-bishop.md` + merged to decisions.md

**Key Outcomes:**
- 13-task QA backlog fully detailed with acceptance criteria matrices, review gates (4 total), blocker risks + mitigations
- Current gaps: 9 critical/high priorities (backend logic, SignalR mapper, frontend UI, E2E integration, Evolution rules, responsive, accessibility)
- Phase 1 (Weeks 1–2): 4 tasks (backend unit tests ≥80%, SignalR mapper ≥90%, frontend fixtures 5 scenarios, responsive 3-viewport); gate Day 10
- Phase 2 (Weeks 2–3): 6 tasks (4-player E2E, 5 edge cases: Blue reactivate, Green 3-bomb, Pink consecutive, Red forced target, defuse objective); gate Week 3 Day 2
- Phase 3 (Weeks 3–4): 3 tasks (Evolution E2E, WCAG AA a11y audit, 4-browser regression); gate Week 4 Day 4
- **Critical Blockers:** None on Day 1. B1.1 (backend tests) can start immediately (test framework setup Day 1); B1.2 (mapper tests) requires LobbyStore harness (setup Day 1); B1.3 (fixtures) requires Hicks design approval + dev server
- Blocker risks (6): Test framework setup, Aspire harness, Evolution rules ambiguity (Parker 1-hr session Week 1), random seed determinism (use TimeBombGameOptions.RandomSeed), multi-browser automation (Playwright GitHub Actions), screen reader availability (axe + manual NVDA/VoiceOver)
- Gate rollback rules: Phase 1 (≥2 failures → extend 2 weeks), Phase 2 (>1 edge case fail → Parker review), Phase 3 (Lighthouse <85 or A11y >3 fails → hold deployment)
- **Success Metrics:** All 13 tasks on schedule, ≥80% backend coverage, WCAG AA pass, zero new bugs, all 4 gates approved
