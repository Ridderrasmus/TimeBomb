using TimeBomb.Server.Classes;

namespace TimeBomb.Server.Tests;

public class LobbyStoreReconnectTests
{
    [Fact]
    public void TryJoin_AllowsExistingPlayerToRejoin_WhenGameIsInProgress()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Reconnect Lobby", "Host", "host-id");

        store.TryJoin(lobby.LobbyCode, "P2", "p2", out _, out _);
        store.TryJoin(lobby.LobbyCode, "P3", "p3", out _, out _);
        store.TryJoin(lobby.LobbyCode, "P4", "p4", out _, out _);
        store.TryStart(lobby.LobbyCode, "host-id", out _, out _);

        var success = store.TryJoin(
            lobby.LobbyCode,
            "P2 Reconnected",
            "p2",
            out var updatedLobby,
            out var error);

        Assert.True(success);
        Assert.Null(error);
        Assert.NotNull(updatedLobby);
        Assert.Equal(4, updatedLobby.Players.Count);
        Assert.Equal(
            "P2 Reconnected",
            updatedLobby.Players.Single(player => player.Id == "p2").Name);
    }

    [Fact]
    public void TryJoin_RejectsNewPlayer_WhenGameIsInProgress()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Reconnect Lobby", "Host", "host-id");

        store.TryJoin(lobby.LobbyCode, "P2", "p2", out _, out _);
        store.TryJoin(lobby.LobbyCode, "P3", "p3", out _, out _);
        store.TryJoin(lobby.LobbyCode, "P4", "p4", out _, out _);
        store.TryStart(lobby.LobbyCode, "host-id", out _, out _);

        var success = store.TryJoin(
            lobby.LobbyCode,
            "Late Joiner",
            "p5",
            out var updatedLobby,
            out var error);

        Assert.False(success);
        Assert.Null(updatedLobby);
        Assert.Equal("Cannot join a lobby that is already in progress.", error);
    }
}
