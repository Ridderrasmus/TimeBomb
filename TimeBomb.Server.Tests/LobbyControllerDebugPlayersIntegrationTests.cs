using TimeBomb.Server.Classes;
using Moq;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.SignalR;
using TimeBomb.Server.Controllers;
using TimeBomb.Server.Hubs;
using Microsoft.AspNetCore.Mvc;

namespace TimeBomb.Server.Tests;

/// <summary>
/// Integration tests for the LobbyController.DebugSpawnPlayers endpoint.
/// These tests verify the endpoint's behavior with the LobbyStore and verify response handling.
/// </summary>
public class LobbyControllerDebugPlayersIntegrationTests
{
    /// <summary>
    /// Test double for IClientProxy that allows SignalR SendAsync calls without actual SignalR infrastructure.
    /// </summary>
    private class TestClientProxy : IClientProxy
    {
        public Task SendAsync(string method, object?[]? args = null, CancellationToken cancellationToken = default)
        {
            // No-op: just return a completed task for testing
            return Task.CompletedTask;
        }

        public Task SendCoreAsync(string method, object?[]? args = null, CancellationToken cancellationToken = default)
        {
            // No-op: just return a completed task for testing
            return Task.CompletedTask;
        }
    }

    private LobbyController CreateController(LobbyStore store, string? environmentName = "Development")
    {
        var mockHubContext = new Mock<IHubContext<GameHub>>();
        var mockClients = new Mock<IHubClients>();
        var testClientProxy = new TestClientProxy();

        // Configure the mock chain for _hubContext.Clients.Group(...)
        mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(testClientProxy);
        mockHubContext.Setup(h => h.Clients).Returns(mockClients.Object);

        var mockEnv = new Mock<IWebHostEnvironment>();
        mockEnv.Setup(e => e.EnvironmentName).Returns(environmentName ?? "Development");

        return new LobbyController(store, mockHubContext.Object, mockEnv.Object);
    }

    // ===== Happy Path: Endpoint Responds Successfully with Valid Lobby =====

    [Fact]
    public async Task DebugSpawnPlayers_Returns200_WhenLobbyExists()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Test Lobby", "Host");
        var controller = CreateController(store);

        var result = await controller.DebugSpawnPlayers(lobby.LobbyCode);

        Assert.IsType<ActionResult<LobbyController.LobbyResponse>>(result);
        var okResult = result.Result as OkObjectResult;
        Assert.NotNull(okResult);
        Assert.Equal(200, okResult.StatusCode);
    }

    [Fact]
    public async Task DebugSpawnPlayers_UpdatesLobbyState()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Test Lobby", "Host");
        var lobbyCode = lobby.LobbyCode;
        var controller = CreateController(store);

        await controller.DebugSpawnPlayers(lobbyCode);

        var updatedLobby = store.GetByCode(lobbyCode);
        Assert.NotNull(updatedLobby);
        Assert.Equal(4, updatedLobby.Players.Count);
    }

    [Fact]
    public async Task DebugSpawnPlayers_ReturnsLobbyResponse()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Test Lobby", "Host");
        var controller = CreateController(store);

        var result = await controller.DebugSpawnPlayers(lobby.LobbyCode);

        var okResult = result.Result as OkObjectResult;
        Assert.NotNull(okResult?.Value);
    }

    // ===== Error Cases: Invalid Lobbies =====

    [Fact]
    public async Task DebugSpawnPlayers_Returns400_WhenLobbyNotFound()
    {
        var store = new LobbyStore();
        var controller = CreateController(store);

        var result = await controller.DebugSpawnPlayers("NONEXISTENT");

        var problemResult = result.Result as ObjectResult;
        Assert.NotNull(problemResult);
        Assert.Equal(400, problemResult.StatusCode);
    }

    [Fact]
    public async Task DebugSpawnPlayers_Returns400_WhenLobbyAlreadyStarted()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Test Lobby", "Host");
        
        // Add enough players to start the game
        for (int i = 0; i < 3; i++)
        {
            store.TryJoin(lobby.LobbyCode, $"Player {i + 2}", null, out _, out _);
        }
        
        // Start the game
        store.TryStart(lobby.LobbyCode, lobby.CreatedByPlayerId, out _, out _);

        var controller = CreateController(store);
        var result = await controller.DebugSpawnPlayers(lobby.LobbyCode);

        var problemResult = result.Result as ObjectResult;
        Assert.NotNull(problemResult);
        Assert.Equal(400, problemResult.StatusCode);
    }

    [Fact]
    public async Task DebugSpawnPlayers_Returns400_WhenLobbyAlreadyHasMinimumPlayers()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Test Lobby", "Host");
        
        // Fill lobby to minimum required players
        for (int i = 0; i < 3; i++)
        {
            store.TryJoin(lobby.LobbyCode, $"Player {i + 2}", null, out _, out _);
        }

        var controller = CreateController(store);
        var result = await controller.DebugSpawnPlayers(lobby.LobbyCode);

        var problemResult = result.Result as ObjectResult;
        Assert.NotNull(problemResult);
        Assert.Equal(400, problemResult.StatusCode);
    }

    // ===== Error Cases: Debug Environment Restrictions =====

    [Fact]
    public async Task DebugSpawnPlayers_Returns404_InProduction()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Test Lobby", "Host");
        var controller = CreateController(store, "Production");

        var result = await controller.DebugSpawnPlayers(lobby.LobbyCode);

        var notFoundResult = result.Result as NotFoundResult;
        Assert.NotNull(notFoundResult);
        Assert.Equal(404, notFoundResult.StatusCode);
    }

    [Fact]
    public async Task DebugSpawnPlayers_Returns200_InQAEnvironment()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Test Lobby", "Host");
        var controller = CreateController(store, "QA");

        var result = await controller.DebugSpawnPlayers(lobby.LobbyCode);

        var okResult = result.Result as OkObjectResult;
        Assert.NotNull(okResult);
        Assert.Equal(200, okResult.StatusCode);
    }

    // ===== Game State Validation: Verify Debug Players Function Correctly =====

    [Fact]
    public async Task DebugSpawnPlayers_CreatesPlayersWithDebugNames()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Test Lobby", "Host");
        var controller = CreateController(store);

        await controller.DebugSpawnPlayers(lobby.LobbyCode);
        var updatedLobby = store.GetByCode(lobby.LobbyCode);

        Assert.NotNull(updatedLobby);
        var debugPlayers = updatedLobby.Players.Where(p => p.Name.StartsWith("Debug Player")).ToList();
        Assert.NotEmpty(debugPlayers);
    }

    [Fact]
    public async Task DebugSpawnPlayers_FillsLobbyToMinimumPlayers()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Test Lobby", "Host");
        var controller = CreateController(store);

        await controller.DebugSpawnPlayers(lobby.LobbyCode);
        var updatedLobby = store.GetByCode(lobby.LobbyCode);

        Assert.NotNull(updatedLobby);
        Assert.Equal(4, updatedLobby.Players.Count);
    }

    [Fact]
    public async Task DebugSpawnPlayers_MaintainsLobbyState()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Test Lobby", "Host");
        var controller = CreateController(store);

        await controller.DebugSpawnPlayers(lobby.LobbyCode);
        var updatedLobby = store.GetByCode(lobby.LobbyCode);

        Assert.NotNull(updatedLobby);
        Assert.Equal(GameState.Lobby, updatedLobby.CurrentState);
    }

    [Fact]
    public async Task DebugSpawnPlayers_PreservesLobbyMetadata()
    {
        var store = new LobbyStore();
        var originalLobby = store.Create("Test Lobby", "Host");
        var originalCode = originalLobby.LobbyCode;
        var originalName = originalLobby.Name;
        var controller = CreateController(store);

        await controller.DebugSpawnPlayers(originalCode);
        var updatedLobby = store.GetByCode(originalCode);

        Assert.NotNull(updatedLobby);
        Assert.Equal(originalCode, updatedLobby.LobbyCode);
        Assert.Equal(originalName, updatedLobby.Name);
    }

    // ===== Integration: Multiple Sequential Calls =====

    [Fact]
    public async Task DebugSpawnPlayers_SecondCallFails_WhenAlreadyEnoughPlayers()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Test Lobby", "Host");
        var controller = CreateController(store);

        // First call should succeed
        var firstResult = await controller.DebugSpawnPlayers(lobby.LobbyCode);
        var firstOkResult = firstResult.Result as OkObjectResult;
        Assert.NotNull(firstOkResult);

        // Second call should fail
        var secondResult = await controller.DebugSpawnPlayers(lobby.LobbyCode);
        var problemResult = secondResult.Result as ObjectResult;
        Assert.NotNull(problemResult);
        Assert.Equal(400, problemResult.StatusCode);
    }

    [Fact]
    public async Task DebugSpawnPlayers_AllowsGameToStart_AfterAddingPlayers()
    {
        var store = new LobbyStore();
        var lobby = store.Create("Test Lobby", "Host");
        var controller = CreateController(store);

        // Add debug players to reach minimum
        await controller.DebugSpawnPlayers(lobby.LobbyCode);
        var updatedLobby = store.GetByCode(lobby.LobbyCode);

        Assert.NotNull(updatedLobby);
        Assert.True(store.CanStart(lobby.LobbyCode, lobby.CreatedByPlayerId, out var error));
        Assert.Null(error);
    }
}
