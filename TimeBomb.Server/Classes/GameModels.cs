namespace TimeBomb.Server.Classes;

public enum TeamAlignment
{
    Sherlock,
    Moriarty
}

public enum GameVariant
{
    Standard,
    Evolution
}

public enum WireKind
{
    Defuse,
    Bomb
}

public enum WireColor
{
    Green,
    Orange,
    Pink,
    Yellow,
    Blue,
    Red
}

public enum WinReason
{
    None,
    BombExploded,
    DefuseObjectiveComplete,
    RoundLimitReached
}

public enum PendingDecisionType
{
    AssignDefuseColor,
    ReactivateBlueColor
}

public sealed record WireCard(WireKind Kind, WireColor? Color = null)
{
    public static WireCard Defuse() => new(WireKind.Defuse);
    public static WireCard Bomb(WireColor color) => new(WireKind.Bomb, color);
}

public sealed record RevealedWire(
    int Round,
    int Turn,
    string ActivePlayerId,
    string RevealedFromPlayerId,
    WireCard Card,
    WireColor? DefusedColorAssigned,
    WireColor? ReactivatedColor,
    string? Effect);

public sealed class GameOutcome
{
    public TeamAlignment? Winner { get; set; }
    public WinReason Reason { get; set; } = WinReason.None;
    public bool IsComplete => Winner.HasValue;
}

public sealed class TimeBombGameOptions
{
    public GameVariant Variant { get; set; } = GameVariant.Standard;
    public List<WireColor>? SelectedBombColors { get; set; }
    public int? RandomSeed { get; set; }
}

public sealed class PendingDecision
{
    public PendingDecisionType Type { get; set; }
    public string RequestedByPlayerId { get; set; } = string.Empty;
    public int RevealedWireIndex { get; set; }
    public IReadOnlyList<WireColor> AvailableColors { get; set; } = [];
}

public sealed class GameActionResult
{
    public RevealedWire? RevealedWire { get; set; }
    public PendingDecision? PendingDecision { get; set; }
}
