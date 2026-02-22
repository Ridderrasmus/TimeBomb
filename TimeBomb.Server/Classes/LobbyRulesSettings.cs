namespace TimeBomb.Server.Classes;

public class LobbyRulesSettings
{
    public GameVariant Variant { get; set; } = GameVariant.Standard;
    public bool RandomizeCardColors { get; set; } = true;
    public List<WireColor>? SelectedBombColors { get; set; }
}
