namespace TimeBomb.Server.Hubs;

public static class HubGroups
{
    public static string Lobby(string lobbyCode)
    {
        return $"lobby:{lobbyCode.ToUpperInvariant()}";
    }
}
