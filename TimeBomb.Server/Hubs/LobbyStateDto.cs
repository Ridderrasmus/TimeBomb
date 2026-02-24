using TimeBomb.Server.Classes;

namespace TimeBomb.Server.Hubs;

public sealed record LobbyStateDto(
    int Version,
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
    GameOutcome Outcome,
    string? ForcedTargetPlayerNameForNextTurn = null,
    RecentEffectCueDto? RecentEffectCue = null,
    IReadOnlyDictionary<string, int>? RevealedPileTotalsByPlayer = null,
    string? PreviousActivePlayerId = null);

public sealed record PendingDecisionDto(
    PendingDecisionType Type,
    string RequestedByPlayerId,
    IReadOnlyList<WireColor> AvailableColors);

public sealed record RecentEffectCueDto(
    int Round,
    int Turn,
    string Effect,
    string ActivePlayerId,
    string RevealedFromPlayerId,
    string? ForcedTargetPlayerId,
    string? ForcedTargetPlayerName);

public static class LobbyStateMapper
{
    public const int SchemaVersion = 1;

    public static LobbyStateDto ToDto(GameLobby lobby)
    {
        var game = lobby.ActiveGame;
        var forcedTargetPlayerIdForNextTurn = game is null ? null : NormalizeNullableValue(game.ForcedTargetPlayerIdForNextTurn);
        var forcedTargetPlayerNameForNextTurn = game is null ? null : ResolveForcedTargetPlayerNameForNextTurn(game);
        var recentEffectCue = game is null ? null : ResolveRecentEffectCue(game);
        var revealedPileTotalsByPlayer = game is null ? null : ResolveRevealedPileTotalsByPlayer(game);
        var previousActivePlayerId = game is null ? null : ResolvePreviousActivePlayerId(game);

        return new LobbyStateDto(
            SchemaVersion,
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
                    forcedTargetPlayerIdForNextTurn,
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
                    },
                    forcedTargetPlayerNameForNextTurn,
                    recentEffectCue,
                    revealedPileTotalsByPlayer,
                    previousActivePlayerId));
    }

    private static IReadOnlyDictionary<string, int> ResolveRevealedPileTotalsByPlayer(TimeBombGame game)
    {
        var revealedPileTotals = game.RevealedWires
            .GroupBy(wire => wire.RevealedFromPlayerId)
            .ToDictionary(group => group.Key, group => group.Count());

        foreach (var player in game.Players)
        {
            revealedPileTotals.TryAdd(player.Id, 0);
        }

        return revealedPileTotals;
    }

    private static string? ResolveForcedTargetPlayerNameForNextTurn(TimeBombGame game)
    {
        var forcedTargetPlayerId = game.ForcedTargetPlayerIdForNextTurn;
        if (string.IsNullOrWhiteSpace(forcedTargetPlayerId))
        {
            return null;
        }

        return game.Players.FirstOrDefault(player => player.Id == forcedTargetPlayerId)?.Name ?? forcedTargetPlayerId;
    }

    private static RecentEffectCueDto? ResolveRecentEffectCue(TimeBombGame game)
    {
        var recentEffectWire = game.RevealedWires.LastOrDefault(wire => !string.IsNullOrWhiteSpace(wire.Effect));
        if (recentEffectWire is null || string.IsNullOrWhiteSpace(recentEffectWire.Effect))
        {
            return null;
        }

        return new RecentEffectCueDto(
            recentEffectWire.Round,
            recentEffectWire.Turn,
            recentEffectWire.Effect,
            recentEffectWire.ActivePlayerId,
            recentEffectWire.RevealedFromPlayerId,
            NormalizeNullableValue(recentEffectWire.ForcedTargetPlayerId),
            NormalizeNullableValue(recentEffectWire.ForcedTargetPlayerName));
    }

    private static string? ResolvePreviousActivePlayerId(TimeBombGame game)
    {
        var lastRevealedWire = game.RevealedWires.LastOrDefault();
        return lastRevealedWire?.ActivePlayerId;
    }

    private static string? NormalizeNullableValue(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }
}
