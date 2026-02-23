# Backend Restart Strategy: New Instance vs State Reset

## Date
2026-02-23

## Context
Issue #5 required implementing game restart functionality. Two approaches were considered:
1. Reset existing TimeBombGame instance state
2. Create new TimeBombGame instance

## Decision
Chose to create a new `TimeBombGame` instance on restart rather than resetting existing state.

## Implementation
```csharp
// In LobbyStore.TryRestartGame:
var options = new TimeBombGameOptions
{
    Variant = lobby.Rules.Variant,
    SelectedBombColors = ResolveSelectedColorsForGameStart(lobby)
};

lobby.ActiveGame = new TimeBombGame(lobby.Players, options);
lobby.CurrentState = GameState.InProgress;
```

## Rationale
1. **Immutability Pattern**: Consistent with existing game architecture where `TimeBombGame` doesn't expose state mutators
2. **Lower Risk**: Avoids partial state reset bugs (e.g., forgotten fields, unclear reset order)
3. **Clean Slate**: Constructor handles all initialization logic in one place
4. **Testability**: Game ID changes on restart, making it detectable in tests and frontend
5. **Simplicity**: No need to add new reset methods to GameState class

## Implications
- **Game ID Changes**: Frontend can detect restart by game ID change
- **Memory**: Creates new object (negligible for small game instances)
- **Threading**: Same lock-based thread-safety in LobbyStore
- **Players Preserved**: Players list copied to new game instance, maintaining membership
- **Rules Preserved**: Lobby rules (variant, bomb colors) used to initialize new game

## Alternatives Considered
- **State Reset Method**: Would require adding `Reset()` method to `TimeBombGame` and carefully resetting all fields
  - Risk: Easier to miss fields or create inconsistent state
  - Complexity: Would need comprehensive testing to ensure clean reset
  - Breaking Change: Would expand public API surface

## Team Impact
- Frontend: No breaking changes; restart appears as new game with LobbyStateUpdated event
- Testing: Existing test patterns work perfectly with new instance approach
- Future: If restart variations needed (partial reset, restart from round X), new instance pattern remains flexible
