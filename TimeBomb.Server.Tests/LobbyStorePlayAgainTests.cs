using TimeBomb.Server.Classes;

namespace TimeBomb.Server.Tests;

public class LobbyStorePlayAgainTests
{
    [Fact]
    public void TryStart_AllowsRestart_WhenLobbyStateIsCompleted()
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Replay Lobby", "Host");

        lobbyStore.TryJoin(lobby.LobbyCode, "P2", null, out _, out _);
        lobbyStore.TryJoin(lobby.LobbyCode, "P3", null, out _, out _);
        lobbyStore.TryJoin(lobby.LobbyCode, "P4", null, out _, out _);

        var startSucceeded = lobbyStore.TryStart(
            lobby.LobbyCode,
            lobby.CreatedByPlayerId,
            out var inProgressLobby,
            out var startError);

        Assert.True(startSucceeded);
        Assert.Null(startError);
        Assert.NotNull(inProgressLobby);

        var lobbiesField = typeof(LobbyStore).GetField(
            "_lobbiesByCode",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
        Assert.NotNull(lobbiesField);

        var lobbiesByCode = lobbiesField!.GetValue(lobbyStore) as Dictionary<string, GameLobby>;
        Assert.NotNull(lobbiesByCode);
        Assert.True(lobbiesByCode!.TryGetValue(lobby.LobbyCode, out var storedLobby));
        Assert.NotNull(storedLobby);

        storedLobby!.CurrentState = GameState.Completed;
        storedLobby.ActiveGame = null;

        var replaySucceeded = lobbyStore.TryStart(
            lobby.LobbyCode,
            lobby.CreatedByPlayerId,
            out var restartedLobby,
            out var replayError);

        Assert.True(replaySucceeded);
        Assert.Null(replayError);
        Assert.NotNull(restartedLobby);
        Assert.Equal(GameState.InProgress, restartedLobby.CurrentState);
        Assert.NotNull(restartedLobby.ActiveGame);
    }
}