# Bishop History

## Project Seed
- User: Rasmus Tanggaard
- Product: Time Bomb Evolution online play
- Stack: .NET services (TimeBomb.Server, TimeBomb.AppHost) and web frontend (frontend)
- Team focus: advanced in-game UI, backend gameplay flexibility, and robust game-logic testing

## Learnings
- Initial charter and context seeded during squad bootstrap.

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
