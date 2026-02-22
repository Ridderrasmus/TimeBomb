using System;

namespace TimeBomb.Server.Classes;

public class GameLobby
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = "New Lobby";
    public List<Player> Players { get; set; } = new List<Player>();
    public GameState CurrentState { get; set; } = GameState.Lobby;
    public string LobbyCode { get; set; } = string.Empty;
    public string CreatedByPlayerId { get; set; } = string.Empty;
    public TimeBombGame? ActiveGame { get; set; }
    public LobbyRulesSettings Rules { get; set; } = new();
}
