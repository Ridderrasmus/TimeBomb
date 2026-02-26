using TimeBomb.Server.Classes;

namespace TimeBomb.Server.Tests;

public class LobbyStoreReturnToLobbyTests
{
    [Fact]
    public void TryReturnToLobby_Succeeds_ForCreator_WhenLobbyCompleted()
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Return Lobby", "Host", "host-id");

        lobbyStore.TryJoin(lobby.LobbyCode, "P2", "p2", out _, out _);
        lobbyStore.TryJoin(lobby.LobbyCode, "P3", "p3", out _, out _);
        lobbyStore.TryJoin(lobby.LobbyCode, "P4", "p4", out _, out _);
        lobbyStore.TryStart(lobby.LobbyCode, "host-id", out _, out _);

        var lobbiesField = typeof(LobbyStore).GetField(
            "_lobbiesByCode",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
        Assert.NotNull(lobbiesField);

        var lobbiesByCode = lobbiesField!.GetValue(lobbyStore) as Dictionary<string, GameLobby>;
        Assert.NotNull(lobbiesByCode);
        Assert.True(lobbiesByCode!.TryGetValue(lobby.LobbyCode, out var storedLobby));
        Assert.NotNull(storedLobby);

        storedLobby!.CurrentState = GameState.Completed;
        Assert.NotNull(storedLobby.ActiveGame);

        var success = lobbyStore.TryReturnToLobby(lobby.LobbyCode, "host-id", out var updatedLobby, out var error);

        Assert.True(success);
        Assert.Null(error);
        Assert.NotNull(updatedLobby);
        Assert.Equal(GameState.Lobby, updatedLobby.CurrentState);
        Assert.Null(updatedLobby.ActiveGame);
    }

    [Fact]
    public void TryReturnToLobby_Fails_ForNonCreator()
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Return Lobby", "Host", "host-id");

        lobbyStore.TryJoin(lobby.LobbyCode, "P2", "p2", out _, out _);
        lobbyStore.TryJoin(lobby.LobbyCode, "P3", "p3", out _, out _);
        lobbyStore.TryJoin(lobby.LobbyCode, "P4", "p4", out _, out _);
        lobbyStore.TryStart(lobby.LobbyCode, "host-id", out _, out _);

        var lobbiesField = typeof(LobbyStore).GetField(
            "_lobbiesByCode",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
        Assert.NotNull(lobbiesField);

        var lobbiesByCode = lobbiesField!.GetValue(lobbyStore) as Dictionary<string, GameLobby>;
        Assert.NotNull(lobbiesByCode);
        Assert.True(lobbiesByCode!.TryGetValue(lobby.LobbyCode, out var storedLobby));
        Assert.NotNull(storedLobby);
        storedLobby!.CurrentState = GameState.Completed;

        var success = lobbyStore.TryReturnToLobby(lobby.LobbyCode, "p2", out var updatedLobby, out var error);

        Assert.False(success);
        Assert.Null(updatedLobby);
        Assert.Equal("Only the lobby creator can move the game back to lobby.", error);
    }
}