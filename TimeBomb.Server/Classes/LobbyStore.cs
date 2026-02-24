namespace TimeBomb.Server.Classes;

public class LobbyStore
{
    private const int MinPlayers = 4;
    private const int MaxPlayers = 6;
    private readonly Lock _gate = new();
    private readonly Dictionary<string, GameLobby> _lobbiesByCode = new(StringComparer.OrdinalIgnoreCase);

    public IReadOnlyList<GameLobby> GetAll()
    {
        lock (_gate)
        {
            return _lobbiesByCode.Values
                .OrderBy(lobby => lobby.Name)
                .Select(CloneLobby)
                .ToList();
        }
    }

    public GameLobby? GetByCode(string lobbyCode)
    {
        lock (_gate)
        {
            return _lobbiesByCode.TryGetValue(lobbyCode, out var lobby)
                ? CloneLobby(lobby)
                : null;
        }
    }

    public GameLobby Create(string lobbyName, string hostPlayerName, string? hostPlayerId = null)
    {
        lock (_gate)
        {
            var normalizedHostPlayerId = string.IsNullOrWhiteSpace(hostPlayerId)
                ? Guid.NewGuid().ToString("N")
                : hostPlayerId;

            var lobby = new GameLobby
            {
                Name = string.IsNullOrWhiteSpace(lobbyName) ? "New Lobby" : lobbyName.Trim(),
                LobbyCode = GenerateUniqueLobbyCode(),
                CreatedByPlayerId = normalizedHostPlayerId
            };

            lobby.Players.Add(new Player
            {
                Id = normalizedHostPlayerId,
                Name = hostPlayerName.Trim()
            });

            _lobbiesByCode[lobby.LobbyCode] = lobby;
            return CloneLobby(lobby);
        }
    }

    public bool TryJoin(string lobbyCode, string playerName, string? playerId, out GameLobby? updatedLobby, out string? error)
    {
        lock (_gate)
        {
            updatedLobby = null;
            error = null;

            if (!_lobbiesByCode.TryGetValue(lobbyCode, out var lobby))
            {
                error = "Lobby not found.";
                return false;
            }

            if (lobby.CurrentState != GameState.Lobby)
            {
                error = "Cannot join a lobby that is already in progress.";
                return false;
            }

            if (lobby.Players.Count >= MaxPlayers)
            {
                error = "Lobby is full.";
                return false;
            }

            var normalizedPlayerId = string.IsNullOrWhiteSpace(playerId)
                ? Guid.NewGuid().ToString("N")
                : playerId;

            var existingById = lobby.Players.FirstOrDefault(player => player.Id == normalizedPlayerId);
            if (existingById is not null)
            {
                existingById.Name = playerName.Trim();
                updatedLobby = CloneLobby(lobby);
                return true;
            }

            lobby.Players.Add(new Player
            {
                Id = normalizedPlayerId,
                Name = playerName.Trim()
            });

            updatedLobby = CloneLobby(lobby);
            return true;
        }
    }

    public bool TryAddDebugPlayers(string lobbyCode, out GameLobby? updatedLobby, out string? error)
    {
        lock (_gate)
        {
            updatedLobby = null;
            error = null;

            if (!_lobbiesByCode.TryGetValue(lobbyCode, out var lobby))
            {
                error = "Lobby not found.";
                return false;
            }

            if (lobby.CurrentState != GameState.Lobby)
            {
                error = "Cannot add debug players after the game has started.";
                return false;
            }

            var remainingSlots = MaxPlayers - lobby.Players.Count;
            var neededPlayers = MinPlayers - lobby.Players.Count;
            
            // Check if lobby is full before checking if it has enough players
            if (remainingSlots <= 0)
            {
                error = "Lobby is full.";
                return false;
            }

            if (lobby.Players.Count >= MinPlayers)
            {
                error = "Lobby already has enough players to start.";
                return false;
            }

            var playersToAdd = Math.Min(neededPlayers, remainingSlots);
            if (playersToAdd <= 0)
            {
                error = "Lobby is full.";
                return false;
            }

            var nameIndex = 1;
            for (var i = 0; i < playersToAdd; i++)
            {
                string playerName;
                do
                {
                    playerName = $"Debug Player {nameIndex++}";
                }
                while (lobby.Players.Any(player => string.Equals(player.Name, playerName, StringComparison.OrdinalIgnoreCase)));

                lobby.Players.Add(new Player
                {
                    Id = Guid.NewGuid().ToString("N"),
                    Name = playerName
                });
            }

            updatedLobby = CloneLobby(lobby);
            return true;
        }
    }

    public bool TryLeave(string lobbyCode, string playerId, out GameLobby? updatedLobby, out string? error)
    {
        lock (_gate)
        {
            updatedLobby = null;
            error = null;

            if (!_lobbiesByCode.TryGetValue(lobbyCode, out var lobby))
            {
                error = "Lobby not found.";
                return false;
            }

            var removed = lobby.Players.RemoveAll(player => player.Id == playerId);
            if (removed == 0)
            {
                error = "Player not found in lobby.";
                return false;
            }

            if (lobby.Players.Count == 0)
            {
                _lobbiesByCode.Remove(lobbyCode);
                return true;
            }

            if (lobby.CreatedByPlayerId == playerId)
            {
                lobby.CreatedByPlayerId = lobby.Players[0].Id;
            }

            updatedLobby = CloneLobby(lobby);
            return true;
        }
    }

    public bool Delete(string lobbyCode)
    {
        lock (_gate)
        {
            return _lobbiesByCode.Remove(lobbyCode);
        }
    }

    public bool CanStart(string lobbyCode, string? requesterPlayerId, out string? error)
    {
        lock (_gate)
        {
            error = null;
            if (!_lobbiesByCode.TryGetValue(lobbyCode, out var lobby))
            {
                error = "Lobby not found.";
                return false;
            }

            if (lobby.CurrentState != GameState.Lobby)
            {
                error = "Game has already started.";
                return false;
            }

            if (lobby.Players.Count < MinPlayers || lobby.Players.Count > MaxPlayers)
            {
                error = "Lobby must have 4 to 6 players to start.";
                return false;
            }

            if (!string.IsNullOrWhiteSpace(requesterPlayerId) && requesterPlayerId != lobby.CreatedByPlayerId)
            {
                error = "Only the lobby creator can start the game.";
                return false;
            }

            return true;
        }
    }

    public bool TryUpdateRules(string lobbyCode, string requesterPlayerId, LobbyRulesSettings rules, out GameLobby? updatedLobby, out string? error)
    {
        lock (_gate)
        {
            updatedLobby = null;
            error = null;

            if (!_lobbiesByCode.TryGetValue(lobbyCode, out var lobby))
            {
                error = "Lobby not found.";
                return false;
            }

            if (lobby.CurrentState != GameState.Lobby)
            {
                error = "Cannot change rules after the game has started.";
                return false;
            }

            if (lobby.CreatedByPlayerId != requesterPlayerId)
            {
                error = "Only the lobby creator can change rules.";
                return false;
            }

            if (!rules.RandomizeCardColors)
            {
                if (rules.SelectedBombColors is null || rules.SelectedBombColors.Count != lobby.Players.Count)
                {
                    error = $"Select exactly {lobby.Players.Count} bomb colors when randomization is disabled.";
                    return false;
                }

                if (rules.SelectedBombColors.Distinct().Count() != rules.SelectedBombColors.Count)
                {
                    error = "Selected bomb colors must be unique.";
                    return false;
                }
            }

            lobby.Rules = new LobbyRulesSettings
            {
                Variant = rules.Variant,
                RandomizeCardColors = rules.RandomizeCardColors,
                SelectedBombColors = rules.SelectedBombColors?.Distinct().ToList()
            };

            updatedLobby = CloneLobby(lobby);
            return true;
        }
    }

    public bool TryStart(string lobbyCode, string requesterPlayerId, out GameLobby? updatedLobby, out string? error)
    {
        lock (_gate)
        {
            updatedLobby = null;

            if (!CanStart(lobbyCode, requesterPlayerId, out error))
            {
                return false;
            }

            var lobby = _lobbiesByCode[lobbyCode];
            if (lobby.CurrentState != GameState.Lobby)
            {
                error = "Game has already started.";
                return false;
            }

            var options = new TimeBombGameOptions
            {
                Variant = lobby.Rules.Variant,
                SelectedBombColors = ResolveSelectedColorsForGameStart(lobby)
            };

            try
            {
                lobby.ActiveGame = new TimeBombGame(lobby.Players, options);
                lobby.CurrentState = GameState.InProgress;
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }

            updatedLobby = CloneLobby(lobby);
            return true;
        }
    }

    public bool TryRevealWire(
        string lobbyCode,
        string requesterPlayerId,
        string targetPlayerId,
        out GameLobby? updatedLobby,
        out GameActionResult? actionResult,
        out string? error)
    {
        lock (_gate)
        {
            updatedLobby = null;
            actionResult = null;
            error = null;

            if (!_lobbiesByCode.TryGetValue(lobbyCode, out var lobby))
            {
                error = "Lobby not found.";
                return false;
            }

            if (lobby.CurrentState != GameState.InProgress || lobby.ActiveGame is null)
            {
                error = "Game is not in progress.";
                return false;
            }

            if (lobby.Players.All(player => player.Id != requesterPlayerId))
            {
                error = "Player is not part of this lobby.";
                return false;
            }

            try
            {
                actionResult = lobby.ActiveGame.RevealWire(requesterPlayerId, targetPlayerId);
                if (lobby.ActiveGame.Outcome.IsComplete)
                {
                    lobby.CurrentState = GameState.Completed;
                }
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }

            updatedLobby = CloneLobby(lobby);
            return true;
        }
    }

    public bool TryResolvePendingDecision(
        string lobbyCode,
        string requesterPlayerId,
        WireColor selectedColor,
        out GameLobby? updatedLobby,
        out GameActionResult? actionResult,
        out string? error)
    {
        lock (_gate)
        {
            updatedLobby = null;
            actionResult = null;
            error = null;

            if (!_lobbiesByCode.TryGetValue(lobbyCode, out var lobby))
            {
                error = "Lobby not found.";
                return false;
            }

            if (lobby.CurrentState != GameState.InProgress || lobby.ActiveGame is null)
            {
                error = "Game is not in progress.";
                return false;
            }

            try
            {
                actionResult = lobby.ActiveGame.ResolvePendingDecision(requesterPlayerId, selectedColor);
                if (lobby.ActiveGame.Outcome.IsComplete)
                {
                    lobby.CurrentState = GameState.Completed;
                }
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }

            updatedLobby = CloneLobby(lobby);
            return true;
        }
    }

    public bool TryMarkRoundReady(
        string lobbyCode,
        string requesterPlayerId,
        out GameLobby? updatedLobby,
        out string? error)
    {
        lock (_gate)
        {
            updatedLobby = null;
            error = null;

            if (!_lobbiesByCode.TryGetValue(lobbyCode, out var lobby))
            {
                error = "Lobby not found.";
                return false;
            }

            if (lobby.CurrentState != GameState.InProgress || lobby.ActiveGame is null)
            {
                error = "Game is not in progress.";
                return false;
            }

            if (lobby.Players.All(player => player.Id != requesterPlayerId))
            {
                error = "Player is not part of this lobby.";
                return false;
            }

            try
            {
                lobby.ActiveGame.MarkPlayerReadyForRound(requesterPlayerId);
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }

            updatedLobby = CloneLobby(lobby);
            return true;
        }
    }

    private static List<WireColor>? ResolveSelectedColorsForGameStart(GameLobby lobby)
    {
        if (lobby.Rules.RandomizeCardColors)
        {
            return null;
        }

        if (lobby.Rules.SelectedBombColors is { Count: > 0 })
        {
            return lobby.Rules.SelectedBombColors.Distinct().ToList();
        }

        return Enum.GetValues<WireColor>()
            .Take(lobby.Players.Count)
            .ToList();
    }

    private string GenerateUniqueLobbyCode()
    {
        string code;
        do
        {
            code = GenerateLobbyCode();
        }
        while (_lobbiesByCode.ContainsKey(code));

        return code;
    }

    private string GenerateLobbyCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var buffer = new char[6];

        for (var i = 0; i < buffer.Length; i++)
        {
            buffer[i] = chars[Random.Shared.Next(chars.Length)];
        }

        return new string(buffer);
    }

    private static GameLobby CloneLobby(GameLobby lobby)
    {
        return new GameLobby
        {
            Id = lobby.Id,
            Name = lobby.Name,
            LobbyCode = lobby.LobbyCode,
            CreatedByPlayerId = lobby.CreatedByPlayerId,
            CurrentState = lobby.CurrentState,
            ActiveGame = lobby.ActiveGame,
            Rules = new LobbyRulesSettings
            {
                Variant = lobby.Rules.Variant,
                RandomizeCardColors = lobby.Rules.RandomizeCardColors,
                SelectedBombColors = lobby.Rules.SelectedBombColors?.ToList()
            },
            Players = lobby.Players
                .Select(player => new Player
                {
                    Id = player.Id,
                    Name = player.Name,
                    Team = player.Team,
                    WirePile = player.WirePile.ToList()
                })
                .ToList()
        };
    }
}
