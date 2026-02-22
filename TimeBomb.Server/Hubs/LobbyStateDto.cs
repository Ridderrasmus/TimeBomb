using TimeBomb.Server.Classes;

namespace TimeBomb.Server.Hubs;

public sealed record LobbyStateDto(
    string LobbyCode,
    string Name,
    GameState State,
    string CreatedByPlayerId,
    LobbyRulesDto Rules,
    IReadOnlyList<LobbyPlayerDto> Players,
    GameRuntimeDto? Game);

public sealed record LobbyRulesDto(
    GameVariant Variant,
    bool RandomizeCardColors,
    IReadOnlyList<WireColor>? SelectedBombColors);

public sealed record LobbyPlayerDto(
    string Id,
    string Name,
    int RemainingWireCount,
    bool IsActiveTurnPlayer);

public sealed record GameRuntimeDto(
    string GameId,
    GameVariant Variant,
    int CurrentRound,
    int RoundTurnLimit,
    int TurnsTakenInRound,
    int MaxRounds,
    string ActivePlayerId,
    bool IsRoundPreparation,
    IReadOnlyList<string> ReadyPlayerIds,
    string? ForcedTargetPlayerIdForNextTurn,
    int RevealedDefuseWireCount,
    IReadOnlyDictionary<WireColor, int> RevealedBombsByColor,
    IReadOnlyList<WireColor> DefusedColors,
    IReadOnlyList<WireColor> SelectedBombColors,
    PendingDecisionDto? PendingDecision,
    IReadOnlyList<RevealedWire> RevealedWires,
    GameOutcome Outcome);

public sealed record PendingDecisionDto(
    PendingDecisionType Type,
    string RequestedByPlayerId,
    IReadOnlyList<WireColor> AvailableColors);

public static class LobbyStateMapper
{
    public static LobbyStateDto ToDto(GameLobby lobby)
    {
        var game = lobby.ActiveGame;

        return new LobbyStateDto(
            lobby.LobbyCode,
            lobby.Name,
            lobby.CurrentState,
            lobby.CreatedByPlayerId,
            new LobbyRulesDto(
                lobby.Rules.Variant,
                lobby.Rules.RandomizeCardColors,
                lobby.Rules.SelectedBombColors?.ToList()),
            lobby.Players
                .Select(player => new LobbyPlayerDto(
                    player.Id,
                    player.Name,
                    game?.Players.FirstOrDefault(gamePlayer => gamePlayer.Id == player.Id)?.WirePile.Count ?? 0,
                    game is not null && game.GetActivePlayerId() == player.Id))
                .ToList(),
            game is null
                ? null
                : new GameRuntimeDto(
                    game.Id,
                    game.Variant,
                    game.CurrentRound,
                    game.GetCurrentRoundTurnLimit(),
                    game.TurnsTakenInRound,
                    game.MaxRounds,
                    game.GetActivePlayerId(),
                    game.IsRoundPreparation,
                    game.ReadyPlayerIds,
                    game.ForcedTargetPlayerIdForNextTurn,
                    game.RevealedDefuseWireCount,
                    new Dictionary<WireColor, int>(game.RevealedBombsByColor),
                    game.DefusedColors.ToList(),
                    game.SelectedBombColors.ToList(),
                    game.CurrentPendingDecision is null
                        ? null
                        : new PendingDecisionDto(
                            game.CurrentPendingDecision.Type,
                            game.CurrentPendingDecision.RequestedByPlayerId,
                            game.CurrentPendingDecision.AvailableColors),
                    game.RevealedWires.ToList(),
                    new GameOutcome
                    {
                        Winner = game.Outcome.Winner,
                        Reason = game.Outcome.Reason
                    }));
    }
}
