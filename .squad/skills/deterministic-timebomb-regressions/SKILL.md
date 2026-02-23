---
name: deterministic-timebomb-regressions
description: Reusable pattern for deterministic Time Bomb variant + mapper regression tests
---

## Pattern
- Lock gameplay rules at `TimeBombGame` level first (standard/evolution behavior).
- Immediately pair with `LobbyStateMapper.ToDto` assertions for additive metadata fields consumed by UI.
- Keep forced-target tests deterministic by constraining red-effect candidates to a single player with cards.

## Example
1. Set target pile to `WireCard.Bomb(WireColor.Red)`.
2. Leave exactly one non-active, non-target player with one card; empty everyone else.
3. Reveal wire, map to `LobbyStateDto`, assert:
   - `ForcedTargetPlayerIdForNextTurn` / `ForcedTargetPlayerNameForNextTurn`
   - `RecentEffectCue` round/turn/effect/forced-target fields
   - player `RemainingWireCount` values match runtime piles
