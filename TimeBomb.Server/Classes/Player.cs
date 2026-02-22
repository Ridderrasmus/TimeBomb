namespace TimeBomb.Server.Classes;

public class Player
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public TeamAlignment Team { get; set; }
    public List<WireCard> WirePile { get; set; } = new();

    public bool HasCards => WirePile.Count > 0;
}