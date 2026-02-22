using TimeBomb.Server.Classes;

namespace TimeBomb.Server.Hubs;

public sealed record PlayerPrivateStateDto(
    string LobbyCode,
    string PlayerId,
    TeamAlignment? Team,
    bool IsRoundPreparation,
    bool IsReadyForRound,
    IReadOnlyList<WireCard> VisibleHand);

public static class PlayerPrivateStateMapper
{
    public static PlayerPrivateStateDto ToDto(GameLobby lobby, string playerId)
    {
        if (lobby.ActiveGame is null)
        {
            return new PlayerPrivateStateDto(
                lobby.LobbyCode,
                playerId,
                null,
                false,
                false,
                []);
        }

        var player = lobby.ActiveGame.Players.FirstOrDefault(current => current.Id == playerId)
            ?? throw new InvalidOperationException("Player not found.");

        return new PlayerPrivateStateDto(
            lobby.LobbyCode,
            playerId,
            player.Team,
            lobby.ActiveGame.IsRoundPreparation,
            lobby.ActiveGame.IsPlayerReadyForRound(playerId),
            lobby.ActiveGame.GetVisibleHandForPlayer(playerId));
    }
}
