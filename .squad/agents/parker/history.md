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
