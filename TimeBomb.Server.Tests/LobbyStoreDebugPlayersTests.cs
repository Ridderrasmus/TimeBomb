using TimeBomb.Server.Classes;

namespace TimeBomb.Server.Tests;

public class LobbyStoreDebugPlayersTests
{
    private const int MinPlayers = 4;
    private const int MaxPlayers = 6;

    // ===== Happy Path Tests: Adding Debug Players to Lobbies with Space =====

    [Fact]
    public void TryAddDebugPlayers_Successfully_AddsPlayersWhenLobbyHasOnePlayer()
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Test Lobby", "Host Player");
        var lobbyCode = lobby.LobbyCode;

        var success = lobbyStore.TryAddDebugPlayers(lobbyCode, out var updatedLobby, out var error);

        Assert.True(success);
        Assert.Null(error);
        Assert.NotNull(updatedLobby);
        Assert.Equal(MinPlayers, updatedLobby.Players.Count); // 1 existing + 3 debug = 4 total
        Assert.All(updatedLobby.Players.Skip(1), player =>
            Assert.StartsWith("Debug Player", player.Name));
    }

    [Fact]
    public void TryAddDebugPlayers_Successfully_AddsPlayersWhenLobbyHasTwoPlayers()
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Test Lobby", "Host Player");
        var lobbyCode = lobby.LobbyCode;
        lobbyStore.TryJoin(lobbyCode, "Player 2", null, out _, out _);

        var success = lobbyStore.TryAddDebugPlayers(lobbyCode, out var updatedLobby, out var error);

        Assert.True(success);
        Assert.Null(error);
        Assert.NotNull(updatedLobby);
        Assert.Equal(MinPlayers, updatedLobby.Players.Count); // 2 existing + 2 debug = 4 total
    }

    [Fact]
    public void TryAddDebugPlayers_Successfully_AddsPlayersWhenLobbyHasThreePlayers()
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Test Lobby", "Host Player");
        var lobbyCode = lobby.LobbyCode;
        lobbyStore.TryJoin(lobbyCode, "Player 2", null, out _, out _);
        lobbyStore.TryJoin(lobbyCode, "Player 3", null, out _, out _);

        var success = lobbyStore.TryAddDebugPlayers(lobbyCode, out var updatedLobby, out var error);

        Assert.True(success);
        Assert.Null(error);
        Assert.NotNull(updatedLobby);
        Assert.Equal(MinPlayers, updatedLobby.Players.Count); // 3 existing + 1 debug = 4 total
    }

    // ===== Edge Cases: Game State Validation =====

    [Fact]
    public void TryAddDebugPlayers_Fails_WhenLobbyNotFound()
    {
        var lobbyStore = new LobbyStore();

        var success = lobbyStore.TryAddDebugPlayers("NONEXISTENT", out var updatedLobby, out var error);

        Assert.False(success);
        Assert.Null(updatedLobby);
        Assert.Equal("Lobby not found.", error);
    }

    [Fact]
    public void TryAddDebugPlayers_Fails_WhenLobbyAlreadyInProgress()
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Test Lobby", "Host Player");
        var lobbyCode = lobby.LobbyCode;

        // Add more players to allow starting the game
        for (int i = 0; i < MinPlayers - 1; i++)
        {
            lobbyStore.TryJoin(lobbyCode, $"Player {i + 2}", null, out _, out _);
        }

        // Start the game
        lobbyStore.TryStart(lobbyCode, lobby.CreatedByPlayerId, out _, out _);

        var success = lobbyStore.TryAddDebugPlayers(lobbyCode, out var updatedLobby, out var error);

        Assert.False(success);
        Assert.Null(updatedLobby);
        Assert.Equal("Cannot add debug players after the game has started.", error);
    }

    // ===== Edge Cases: Player Count Boundaries =====

    [Fact]
    public void TryAddDebugPlayers_Fails_WhenLobbyAlreadyHasMinimumPlayers()
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Test Lobby", "Host Player");
        var lobbyCode = lobby.LobbyCode;

        // Fill to MinPlayers
        for (int i = 0; i < MinPlayers - 1; i++)
        {
            lobbyStore.TryJoin(lobbyCode, $"Player {i + 2}", null, out _, out _);
        }

        var success = lobbyStore.TryAddDebugPlayers(lobbyCode, out var updatedLobby, out var error);

        Assert.False(success);
        Assert.Null(updatedLobby);
        Assert.Equal("Lobby already has enough players to start.", error);
    }

    [Fact]
    public void TryAddDebugPlayers_Fails_WhenLobbyIsFull()
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Test Lobby", "Host Player");
        var lobbyCode = lobby.LobbyCode;

        // Fill to MaxPlayers
        for (int i = 0; i < MaxPlayers - 1; i++)
        {
            lobbyStore.TryJoin(lobbyCode, $"Player {i + 2}", null, out _, out _);
        }

        var success = lobbyStore.TryAddDebugPlayers(lobbyCode, out var updatedLobby, out var error);

        Assert.False(success);
        Assert.Null(updatedLobby);
        Assert.Equal("Lobby is full.", error);
    }

    // ===== Player Naming and State Validation =====

    [Fact]
    public void TryAddDebugPlayers_CreatesPlayersWithUniqueNames()
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Test Lobby", "Host Player");
        var lobbyCode = lobby.LobbyCode;

        var success = lobbyStore.TryAddDebugPlayers(lobbyCode, out var updatedLobby, out _);

        Assert.True(success);
        Assert.NotNull(updatedLobby);
        var playerNames = updatedLobby.Players.Select(p => p.Name).ToList();
        var uniqueNames = new HashSet<string>(playerNames);
        Assert.Equal(playerNames.Count, uniqueNames.Count); // All names should be unique
    }

    [Fact]
    public void TryAddDebugPlayers_CreatesPlayersWithUniqueIds()
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Test Lobby", "Host Player");
        var lobbyCode = lobby.LobbyCode;

        var success = lobbyStore.TryAddDebugPlayers(lobbyCode, out var updatedLobby, out _);

        Assert.True(success);
        Assert.NotNull(updatedLobby);
        var playerIds = updatedLobby.Players.Select(p => p.Id).ToList();
        var uniqueIds = new HashSet<string>(playerIds);
        Assert.Equal(playerIds.Count, uniqueIds.Count); // All IDs should be unique
    }

    [Fact]
    public void TryAddDebugPlayers_MaintainsLobbyState()
    {
        var lobbyStore = new LobbyStore();
        var originalLobby = lobbyStore.Create("Test Lobby", "Host Player");
        var lobbyCode = originalLobby.LobbyCode;
        var hostPlayerId = originalLobby.CreatedByPlayerId;

        var success = lobbyStore.TryAddDebugPlayers(lobbyCode, out var updatedLobby, out _);

        Assert.True(success);
        Assert.NotNull(updatedLobby);
        Assert.Equal(GameState.Lobby, updatedLobby.CurrentState);
        Assert.Equal(hostPlayerId, updatedLobby.CreatedByPlayerId);
        Assert.Equal(originalLobby.LobbyCode, updatedLobby.LobbyCode);
        Assert.Equal(originalLobby.Name, updatedLobby.Name);
    }

    [Fact]
    public void TryAddDebugPlayers_PreservesExistingPlayers()
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Test Lobby", "Host");
        var lobbyCode = lobby.LobbyCode;
        var hostPlayerId = lobby.CreatedByPlayerId;
        
        lobbyStore.TryJoin(lobbyCode, "Real Player 2", "player-2", out _, out _);

        var success = lobbyStore.TryAddDebugPlayers(lobbyCode, out var updatedLobby, out _);

        Assert.True(success);
        Assert.NotNull(updatedLobby);
        Assert.Contains(updatedLobby.Players, p => p.Id == hostPlayerId && p.Name == "Host");
        Assert.Contains(updatedLobby.Players, p => p.Id == "player-2" && p.Name == "Real Player 2");
    }

    // ===== Integration Tests: Multiple Calls and State Interactions =====

    [Fact]
    public void TryAddDebugPlayers_RetrievedLobbyHasUpdatedPlayerCount()
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Test Lobby", "Host");
        var lobbyCode = lobby.LobbyCode;

        lobbyStore.TryAddDebugPlayers(lobbyCode, out _, out _);
        var retrievedLobby = lobbyStore.GetByCode(lobbyCode);

        Assert.NotNull(retrievedLobby);
        Assert.Equal(MinPlayers, retrievedLobby.Players.Count);
    }

    [Fact]
    public void TryAddDebugPlayers_AllDebugPlayerNamesStartWithDebugPlayerPrefix()
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Test Lobby", "Host");
        var lobbyCode = lobby.LobbyCode;

        lobbyStore.TryAddDebugPlayers(lobbyCode, out var updatedLobby, out _);

        Assert.NotNull(updatedLobby);
        var addedPlayers = updatedLobby.Players.Skip(1); // Skip the original host
        Assert.All(addedPlayers, player =>
            Assert.StartsWith("Debug Player", player.Name));
    }

    [Fact]
    public void TryAddDebugPlayers_AllDebugPlayersHaveValidIds()
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Test Lobby", "Host");
        var lobbyCode = lobby.LobbyCode;

        lobbyStore.TryAddDebugPlayers(lobbyCode, out var updatedLobby, out _);

        Assert.NotNull(updatedLobby);
        var addedPlayers = updatedLobby.Players.Skip(1); // Skip the original host
        Assert.All(addedPlayers, player =>
        {
            Assert.NotNull(player.Id);
            Assert.NotEmpty(player.Id);
        });
    }

    // ===== Edge Case: Idempotence and Error Handling =====

    [Fact]
    public void TryAddDebugPlayers_DoesNotModifyLobbyWhenItFails()
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Test Lobby", "Host");
        var lobbyCode = lobby.LobbyCode;
        var originalPlayerCount = lobby.Players.Count;

        // Try to add debug players to a non-existent lobby
        var success = lobbyStore.TryAddDebugPlayers("NONEXISTENT", out _, out _);

        Assert.False(success);
        var existingLobby = lobbyStore.GetByCode(lobbyCode);
        Assert.NotNull(existingLobby);
        Assert.Equal(originalPlayerCount, existingLobby.Players.Count);
    }

    [Fact]
    public void TryAddDebugPlayers_CannotBeCalledTwiceOnSameLobby()
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Test Lobby", "Host");
        var lobbyCode = lobby.LobbyCode;

        // First call should succeed
        var firstSuccess = lobbyStore.TryAddDebugPlayers(lobbyCode, out _, out _);
        Assert.True(firstSuccess);

        // Second call should fail because lobby now has MinPlayers
        var secondSuccess = lobbyStore.TryAddDebugPlayers(lobbyCode, out var secondLobby, out var secondError);
        
        Assert.False(secondSuccess);
        Assert.Null(secondLobby);
        Assert.Equal("Lobby already has enough players to start.", secondError);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    public void TryAddDebugPlayers_RespectsDifferentPlayerCountScenarios(int initialPlayers)
    {
        var lobbyStore = new LobbyStore();
        var lobby = lobbyStore.Create("Test Lobby", "Host");
        var lobbyCode = lobby.LobbyCode;

        // Add players to initial count
        for (int i = 1; i < initialPlayers; i++)
        {
            var playerNum = i + 1;
            var playerName = "Player " + playerNum;
            lobbyStore.TryJoin(lobbyCode, playerName, null, out _, out _);
        }

        var success = lobbyStore.TryAddDebugPlayers(lobbyCode, out var updatedLobby, out _);

        Assert.True(success, "Failed for initialPlayers=" + initialPlayers);
        Assert.NotNull(updatedLobby);
        var expectedCount = MinPlayers;
        var actualCount = updatedLobby.Players.Count;
        Assert.Equal(expectedCount, actualCount);
    }
}
