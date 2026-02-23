using Microsoft.AspNetCore.SignalR;
using TimeBomb.Server.Classes;

namespace TimeBomb.Server.Hubs;

public class GameHub : Hub
{
	private readonly LobbyStore _lobbyStore;

	public GameHub(LobbyStore lobbyStore)
	{
		_lobbyStore = lobbyStore;
	}

	public async Task JoinLobbyChannel(string lobbyCode)
	{
		var lobby = _lobbyStore.GetByCode(lobbyCode);
		if (lobby is null)
		{
			throw new HubException("Lobby not found.");
		}

		await Groups.AddToGroupAsync(Context.ConnectionId, HubGroups.Lobby(lobbyCode));
		await Clients.Group(HubGroups.Lobby(lobbyCode)).SendAsync("LobbyStateUpdated", LobbyStateMapper.ToDto(lobby));
	}

	public Task<PlayerPrivateStateDto> RequestPrivateState(string lobbyCode, string playerId)
	{
		var lobby = _lobbyStore.GetByCode(lobbyCode);
		if (lobby is null)
		{
			throw new HubException("Lobby not found.");
		}

		return Task.FromResult(PlayerPrivateStateMapper.ToDto(lobby, playerId));
	}

	public Task LeaveLobbyChannel(string lobbyCode)
	{
		return Groups.RemoveFromGroupAsync(Context.ConnectionId, HubGroups.Lobby(lobbyCode));
	}

	public async Task RequestLobbyState(string lobbyCode)
	{
		var lobby = _lobbyStore.GetByCode(lobbyCode);
		if (lobby is null)
		{
			throw new HubException("Lobby not found.");
		}

		await Clients.Caller.SendAsync("LobbyStateUpdated", LobbyStateMapper.ToDto(lobby));
	}

	public async Task StartGame(string lobbyCode, string playerId)
	{
		var success = _lobbyStore.TryStart(lobbyCode, playerId, out var updatedLobby, out var error);
		if (!success)
		{
			throw new HubException(error ?? "Unable to start game.");
		}

		await Clients.Group(HubGroups.Lobby(lobbyCode)).SendAsync("LobbyStateUpdated", LobbyStateMapper.ToDto(updatedLobby!));
	}

	public async Task RevealWire(
		string lobbyCode,
		string playerId,
		string targetPlayerId)
	{
		var success = _lobbyStore.TryRevealWire(
			lobbyCode,
			playerId,
			targetPlayerId,
			out var updatedLobby,
			out var actionResult,
			out var error);

		if (!success)
		{
			throw new HubException(error ?? "Unable to reveal wire.");
		}

		var group = HubGroups.Lobby(lobbyCode);
		if (actionResult?.RevealedWire is not null)
		{
			await Clients.Group(group).SendAsync("WireRevealed", actionResult.RevealedWire);
		}

		await Clients.Group(group).SendAsync("LobbyStateUpdated", LobbyStateMapper.ToDto(updatedLobby!));
	}

	public async Task ResolvePendingDecision(string lobbyCode, string playerId, WireColor selectedColor)
	{
		var success = _lobbyStore.TryResolvePendingDecision(
			lobbyCode,
			playerId,
			selectedColor,
			out var updatedLobby,
			out var actionResult,
			out var error);

		if (!success)
		{
			throw new HubException(error ?? "Unable to resolve decision.");
		}

		var group = HubGroups.Lobby(lobbyCode);
		if (actionResult?.RevealedWire is not null)
		{
			await Clients.Group(group).SendAsync("WireResolved", actionResult.RevealedWire);
		}

		await Clients.Group(group).SendAsync("LobbyStateUpdated", LobbyStateMapper.ToDto(updatedLobby!));
	}

	public async Task MarkRoundReady(string lobbyCode, string playerId)
	{
		var success = _lobbyStore.TryMarkRoundReady(
			lobbyCode,
			playerId,
			out var updatedLobby,
			out var error);

		if (!success)
		{
			throw new HubException(error ?? "Unable to mark round ready.");
		}

		await Clients.Group(HubGroups.Lobby(lobbyCode)).SendAsync("LobbyStateUpdated", LobbyStateMapper.ToDto(updatedLobby!));
	}

	public async Task RestartGame(string lobbyCode, string playerId)
	{
		var success = _lobbyStore.TryRestartGame(
			lobbyCode,
			playerId,
			out var updatedLobby,
			out var error);

		if (!success)
		{
			throw new HubException(error ?? "Unable to restart game.");
		}

		await Clients.Group(HubGroups.Lobby(lobbyCode)).SendAsync("GameRestarted", LobbyStateMapper.ToDto(updatedLobby!));
		await Clients.Group(HubGroups.Lobby(lobbyCode)).SendAsync("LobbyStateUpdated", LobbyStateMapper.ToDto(updatedLobby!));
	}
}
