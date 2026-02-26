using TimeBomb.Server.Classes;

namespace TimeBomb.Server.Tests;

public class LobbyStoreRulesAndKickTests
{
    [Fact]
    public void TryKickPlayer_Succeeds_ForCreator()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Kick Lobby", "Host", "host-id");
        store.TryJoin(lobby.LobbyCode, "P2", "p2", out _, out _);

        var success = store.TryKickPlayer(
            lobby.LobbyCode,
            "host-id",
            "p2",
            out var updatedLobby,
            out var error);

        Assert.True(success);
        Assert.Null(error);
        Assert.NotNull(updatedLobby);
        Assert.DoesNotContain(updatedLobby.Players, player => player.Id == "p2");
    }

    [Fact]
    public void TryKickPlayer_Fails_ForNonCreator()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Kick Lobby", "Host", "host-id");
        store.TryJoin(lobby.LobbyCode, "P2", "p2", out _, out _);

        var success = store.TryKickPlayer(
            lobby.LobbyCode,
            "p2",
            "host-id",
            out var updatedLobby,
            out var error);

        Assert.False(success);
        Assert.Null(updatedLobby);
        Assert.Equal("Only the lobby creator can kick players.", error);
    }

    [Fact]
    public void TryKickPlayer_Fails_WhenCreatorTriesToKickSelf()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Kick Lobby", "Host", "host-id");

        var success = store.TryKickPlayer(
            lobby.LobbyCode,
            "host-id",
            "host-id",
            out var updatedLobby,
            out var error);

        Assert.False(success);
        Assert.Null(updatedLobby);
        Assert.Equal("Lobby creator cannot kick themselves.", error);
    }

    [Fact]
    public void TryUpdateRules_AllowsIncompleteManualColorSelection()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Rules Lobby", "Host", "host-id");
        store.TryJoin(lobby.LobbyCode, "P2", "p2", out _, out _);
        store.TryJoin(lobby.LobbyCode, "P3", "p3", out _, out _);
        store.TryJoin(lobby.LobbyCode, "P4", "p4", out _, out _);

        var success = store.TryUpdateRules(
            lobby.LobbyCode,
            "host-id",
            new LobbyRulesSettings
            {
                Variant = GameVariant.Standard,
                RandomizeCardColors = false,
                SelectedBombColors = [WireColor.Blue, WireColor.Green]
            },
            out var updatedLobby,
            out var error);

        Assert.True(success);
        Assert.Null(error);
        Assert.NotNull(updatedLobby);
        Assert.False(updatedLobby.Rules.RandomizeCardColors);
        Assert.Equal(2, updatedLobby.Rules.SelectedBombColors?.Count);
    }

    [Fact]
    public void TryStart_Fails_WhenManualColorSelectionCountIsInvalid()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Rules Lobby", "Host", "host-id");
        store.TryJoin(lobby.LobbyCode, "P2", "p2", out _, out _);
        store.TryJoin(lobby.LobbyCode, "P3", "p3", out _, out _);
        store.TryJoin(lobby.LobbyCode, "P4", "p4", out _, out _);

        store.TryUpdateRules(
            lobby.LobbyCode,
            "host-id",
            new LobbyRulesSettings
            {
                Variant = GameVariant.Standard,
                RandomizeCardColors = false,
                SelectedBombColors = [WireColor.Blue, WireColor.Green]
            },
            out _,
            out _);

        var success = store.TryStart(lobby.LobbyCode, "host-id", out var updatedLobby, out var error);

        Assert.False(success);
        Assert.Null(updatedLobby);
        Assert.Equal("Select exactly 4 bomb colors when randomization is disabled.", error);
    }
}
