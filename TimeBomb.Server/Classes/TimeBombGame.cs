namespace TimeBomb.Server.Classes;

public class TimeBombGame
{
    private readonly Random _random;
    private readonly HashSet<WireColor> _selectedBombColors;
    private readonly HashSet<string> _readyPlayerIds = [];

    public string Id { get; } = Guid.NewGuid().ToString();
    public GameVariant Variant { get; }
    public List<Player> Players { get; } = new();
    public GameState State { get; private set; } = GameState.Lobby;
    public int CurrentRound { get; private set; } = 1;
    public int TurnsTakenInRound { get; private set; }
    public int ActivePlayerIndex { get; private set; }
    public int MaxRounds { get; } = 4;
    public IReadOnlyCollection<WireColor> SelectedBombColors => _selectedBombColors;
    public string? ForcedTargetPlayerIdForNextTurn { get; private set; }
    public PendingDecision? CurrentPendingDecision { get; private set; }
    public bool IsRoundPreparation { get; private set; }
    public IReadOnlyList<string> ReadyPlayerIds => _readyPlayerIds.ToList();
    public GameOutcome Outcome { get; } = new();
    public List<RevealedWire> RevealedWires { get; } = new();
    public int RevealedDefuseWireCount { get; private set; }
    public Dictionary<WireColor, int> RevealedBombsByColor { get; } = Enum
        .GetValues<WireColor>()
        .ToDictionary(color => color, _ => 0);
    public HashSet<WireColor> DefusedColors { get; } = new();
    public List<WireCard> UnassignedDefuseWires { get; } = new();

    public TimeBombGame(IEnumerable<Player> players, TimeBombGameOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(players);

        var playerList = players.ToList();
        ValidatePlayerCount(playerList.Count);

        options ??= new TimeBombGameOptions();
        Variant = options.Variant;
        _random = options.RandomSeed.HasValue ? new Random(options.RandomSeed.Value) : Random.Shared;
        _selectedBombColors = ResolveSelectedColors(playerList.Count, options.SelectedBombColors);

        Players.AddRange(playerList
            .Select(p => new Player { Id = p.Id, Name = p.Name }));

        AssignTeams();
        BuildAndDealWirePiles();
        ActivePlayerIndex = _random.Next(Players.Count);
        State = GameState.InProgress;
        BeginRoundPreparation();
    }

    public int GetRoundTurnLimit(int round)
    {
        if (round < 1 || round > MaxRounds)
        {
            throw new ArgumentOutOfRangeException(nameof(round));
        }

        if (Variant == GameVariant.Evolution && round == 4)
        {
            var revealedOrange = RevealedBombsByColor[WireColor.Orange];
            return Math.Max(0, Players.Count - revealedOrange);
        }

        return Players.Count;
    }

    public GameActionResult RevealWire(string activePlayerId, string targetPlayerId)
    {
        EnsureInProgress();
        EnsureNoPendingDecision();
        EnsureRoundInTurnPhase();

        var activeIndex = GetPlayerIndexById(activePlayerId);
        if (activeIndex != ActivePlayerIndex)
        {
            throw new InvalidOperationException("It is not this player's turn.");
        }

        if (Players[activeIndex].Id == targetPlayerId)
        {
            throw new InvalidOperationException("A player must choose another player.");
        }

        if (!string.IsNullOrWhiteSpace(ForcedTargetPlayerIdForNextTurn) && ForcedTargetPlayerIdForNextTurn != targetPlayerId)
        {
            throw new InvalidOperationException("The target for this turn is forced by a previous red wire.");
        }

        var targetIndex = GetPlayerIndexById(targetPlayerId);
        var targetPlayer = Players[targetIndex];
        if (!targetPlayer.HasCards)
        {
            throw new InvalidOperationException("Selected player has no cards left.");
        }

        ForcedTargetPlayerIdForNextTurn = null;

        var card = targetPlayer.WirePile[0];
        targetPlayer.WirePile.RemoveAt(0);

        TurnsTakenInRound++;
        var revealed = new RevealedWire(
            CurrentRound,
            TurnsTakenInRound,
            activePlayerId,
            targetPlayerId,
            card,
            null,
            null,
            null);
        RevealedWires.Add(revealed);

        var pendingDecision = EvaluateRevealAndPrepareDecision(revealed);
        if (pendingDecision is not null)
        {
            CurrentPendingDecision = pendingDecision;
            return new GameActionResult
            {
                RevealedWire = revealed,
                PendingDecision = CurrentPendingDecision
            };
        }

        FinalizeTurnFlow(revealed.Card, targetIndex);

        return new GameActionResult
        {
            RevealedWire = revealed,
            PendingDecision = null
        };
    }

    public GameActionResult ResolvePendingDecision(string actingPlayerId, WireColor selectedColor)
    {
        EnsureInProgress();

        if (CurrentPendingDecision is null)
        {
            throw new InvalidOperationException("There is no pending decision.");
        }

        if (CurrentPendingDecision.RequestedByPlayerId != actingPlayerId)
        {
            throw new InvalidOperationException("Only the player who revealed the wire can resolve this decision.");
        }

        if (!CurrentPendingDecision.AvailableColors.Contains(selectedColor))
        {
            throw new InvalidOperationException("Selected color is not valid for the pending decision.");
        }

        var revealedIndex = CurrentPendingDecision.RevealedWireIndex;
        var revealed = RevealedWires[revealedIndex];

        switch (CurrentPendingDecision.Type)
        {
            case PendingDecisionType.AssignDefuseColor:
                DefusedColors.Add(selectedColor);
                revealed = revealed with
                {
                    DefusedColorAssigned = selectedColor,
                    Effect = $"Defused {selectedColor} bomb color."
                };
                RevealedWires[revealedIndex] = revealed;
                break;

            case PendingDecisionType.ReactivateBlueColor:
                DefusedColors.Remove(selectedColor);
                var effect = $"Reactivated {selectedColor} bomb color.";
                if (RevealedBombsByColor[selectedColor] >= GetExplosionThreshold(selectedColor))
                {
                    SetMoriartyWin(WinReason.BombExploded);
                    effect = $"Reactivated {selectedColor} bomb color and it exploded immediately.";
                }

                revealed = revealed with
                {
                    ReactivatedColor = selectedColor,
                    Effect = effect
                };
                RevealedWires[revealedIndex] = revealed;
                break;
        }

        CurrentPendingDecision = null;
        var targetIndex = GetPlayerIndexById(revealed.RevealedFromPlayerId);
        FinalizeTurnFlow(revealed.Card, targetIndex);

        return new GameActionResult
        {
            RevealedWire = revealed,
            PendingDecision = null
        };
    }

    public void MarkPlayerReadyForRound(string playerId)
    {
        EnsureInProgress();
        EnsureRoundInPreparationPhase();

        _ = GetPlayerIndexById(playerId);
        _readyPlayerIds.Add(playerId);

        if (_readyPlayerIds.Count >= Players.Count)
        {
            ShuffleRemainingPlayerHands();
            IsRoundPreparation = false;
            _readyPlayerIds.Clear();
        }
    }

    public bool IsPlayerReadyForRound(string playerId)
    {
        return _readyPlayerIds.Contains(playerId);
    }

    public IReadOnlyList<WireCard> GetVisibleHandForPlayer(string playerId)
    {
        var player = Players.FirstOrDefault(current => current.Id == playerId)
            ?? throw new InvalidOperationException("Player not found.");

        if (!IsRoundPreparation)
        {
            return [];
        }

        return player.WirePile.ToList();
    }

    public string GetActivePlayerId()
    {
        return Players[ActivePlayerIndex].Id;
    }

    public int GetCurrentRoundTurnLimit()
    {
        return GetRoundTurnLimit(CurrentRound);
    }

    private PendingDecision? EvaluateRevealAndPrepareDecision(RevealedWire revealed)
    {
        var card = revealed.Card;

        if (card.Kind == WireKind.Defuse)
        {
            RevealedDefuseWireCount++;

            if (Variant != GameVariant.Evolution)
            {
                return null;
            }

            var defusableColors = GetDefusableColors().ToList();
            if (defusableColors.Count == 0)
            {
                UnassignedDefuseWires.Add(card);
                RevealedWires[^1] = revealed with { Effect = "Defuse wire could not be assigned to a color." };
                return null;
            }

            return new PendingDecision
            {
                Type = PendingDecisionType.AssignDefuseColor,
                RequestedByPlayerId = revealed.ActivePlayerId,
                RevealedWireIndex = RevealedWires.Count - 1,
                AvailableColors = defusableColors
            };
        }

        var color = card.Color!.Value;
        RevealedBombsByColor[color]++;

        if (Variant != GameVariant.Evolution)
        {
            if (color == WireColor.Red)
            {
                ApplyRedEffect();
            }

            return null;
        }

        if (color == WireColor.Blue && DefusedColors.Count > 0)
        {
            return new PendingDecision
            {
                Type = PendingDecisionType.ReactivateBlueColor,
                RequestedByPlayerId = revealed.ActivePlayerId,
                RevealedWireIndex = RevealedWires.Count - 1,
                AvailableColors = DefusedColors.ToList()
            };
        }

        if (color == WireColor.Red)
        {
            ApplyRedEffect();
        }

        return null;
    }

    private IEnumerable<WireColor> GetDefusableColors()
    {
        return RevealedBombsByColor
            .Where(entry => entry.Value > 0 && !DefusedColors.Contains(entry.Key) && entry.Key != WireColor.Yellow)
            .Select(entry => entry.Key);
    }

    private void ApplyRedEffect()
    {
        var candidates = Players
            .Where(player => player.HasCards)
            .ToList();

        if (candidates.Count > 0)
        {
            var forced = candidates[_random.Next(candidates.Count)];
            ForcedTargetPlayerIdForNextTurn = forced.Id;
            var latest = RevealedWires[^1];
            RevealedWires[^1] = latest with { Effect = $"Next turn target is forced to {forced.Name}." };
        }
    }

    private void FinalizeTurnFlow(WireCard latestCard, int nextActivePlayerIndex)
    {
        EvaluateWinConditions(latestCard);

        if (!Outcome.IsComplete)
        {
            ActivePlayerIndex = nextActivePlayerIndex;
            AdvanceRoundIfNeeded();
        }
        else
        {
            State = GameState.Completed;
        }
    }

    private static void ValidatePlayerCount(int playerCount)
    {
        if (playerCount < 4 || playerCount > 6)
        {
            throw new InvalidOperationException("Time Bomb supports 4 to 6 players.");
        }
    }

    private HashSet<WireColor> ResolveSelectedColors(int playerCount, List<WireColor>? selectedColors)
    {
        if (selectedColors is null || selectedColors.Count == 0)
        {
            return Enum.GetValues<WireColor>()
                .OrderBy(_ => _random.Next())
                .Take(playerCount)
                .ToHashSet();
        }

        if (selectedColors.Count != playerCount)
        {
            throw new InvalidOperationException("Selected bomb color count must match player count.");
        }

        if (selectedColors.Distinct().Count() != selectedColors.Count)
        {
            throw new InvalidOperationException("Selected bomb colors must be unique.");
        }

        return selectedColors.ToHashSet();
    }

    private void AssignTeams()
    {
        var moriartyCount = 2;
        var shuffledPlayers = Players.OrderBy(_ => _random.Next()).ToList();

        for (var i = 0; i < shuffledPlayers.Count; i++)
        {
            shuffledPlayers[i].Team = i < moriartyCount ? TeamAlignment.Moriarty : TeamAlignment.Sherlock;
        }
    }

    private void BuildAndDealWirePiles()
    {
        var deck = new List<WireCard>();

        foreach (var color in _selectedBombColors)
        {
            for (var i = 0; i < 5; i++)
            {
                deck.Add(WireCard.Bomb(color));
            }
        }

        Shuffle(deck);

        var discardCount = Players.Count;
        deck = deck.Skip(discardCount).ToList();

        for (var i = 0; i < Players.Count; i++)
        {
            deck.Add(WireCard.Defuse());
        }

        Shuffle(deck);

        var cardsPerPlayer = GetCardsPerPlayerForRound(1);
        for (var playerIndex = 0; playerIndex < Players.Count; playerIndex++)
        {
            var start = playerIndex * cardsPerPlayer;
            var pile = deck.Skip(start).Take(cardsPerPlayer).ToList();
            Players[playerIndex].WirePile = pile;
        }
    }

    private void RedealForRound(int round)
    {
        var cardsPerPlayer = GetCardsPerPlayerForRound(round);
        var pooledCards = Players
            .SelectMany(player => player.WirePile)
            .ToList();

        foreach (var player in Players)
        {
            player.WirePile.Clear();
        }

        Shuffle(pooledCards);

        for (var playerIndex = 0; playerIndex < Players.Count; playerIndex++)
        {
            var start = playerIndex * cardsPerPlayer;
            Players[playerIndex].WirePile = pooledCards
                .Skip(start)
                .Take(cardsPerPlayer)
                .ToList();
        }
    }

    private static int GetCardsPerPlayerForRound(int round)
    {
        return Math.Max(0, 6 - round);
    }

    private void ShuffleRemainingPlayerHands()
    {
        foreach (var player in Players)
        {
            for (var i = player.WirePile.Count - 1; i > 0; i--)
            {
                var j = _random.Next(i + 1);
                (player.WirePile[i], player.WirePile[j]) = (player.WirePile[j], player.WirePile[i]);
            }
        }
    }

    private void Shuffle(List<WireCard> cards)
    {
        for (var i = cards.Count - 1; i > 0; i--)
        {
            var j = _random.Next(i + 1);
            (cards[i], cards[j]) = (cards[j], cards[i]);
        }
    }

    private void EvaluateWinConditions(WireCard latestCard)
    {
        if (Outcome.IsComplete)
        {
            return;
        }

        if (latestCard.Kind == WireKind.Bomb)
        {
            var color = latestCard.Color!.Value;

            if (Variant == GameVariant.Evolution && color == WireColor.Pink)
            {
                var previous = RevealedWires.Count >= 2 ? RevealedWires[^2].Card : null;
                if (previous?.Kind == WireKind.Bomb && previous.Color == WireColor.Pink)
                {
                    SetMoriartyWin(WinReason.BombExploded);
                    return;
                }
            }

            if (!IsColorExplosionBlocked(color))
            {
                if (RevealedBombsByColor[color] >= GetExplosionThreshold(color))
                {
                    SetMoriartyWin(WinReason.BombExploded);
                    return;
                }
            }
        }

        if (RevealedDefuseWireCount >= Players.Count)
        {
            Outcome.Winner = TeamAlignment.Sherlock;
            Outcome.Reason = WinReason.DefuseObjectiveComplete;
        }
    }

    private bool IsColorExplosionBlocked(WireColor color)
    {
        if (Variant != GameVariant.Evolution)
        {
            return false;
        }

        return DefusedColors.Contains(color);
    }

    private int GetExplosionThreshold(WireColor color)
    {
        return Variant == GameVariant.Evolution && color == WireColor.Green ? 3 : 4;
    }

    private void SetMoriartyWin(WinReason reason)
    {
        Outcome.Winner = TeamAlignment.Moriarty;
        Outcome.Reason = reason;
        State = GameState.Completed;
    }

    private void AdvanceRoundIfNeeded()
    {
        var roundLimit = GetRoundTurnLimit(CurrentRound);
        if (TurnsTakenInRound < roundLimit)
        {
            return;
        }

        if (CurrentRound >= MaxRounds)
        {
            Outcome.Winner = TeamAlignment.Moriarty;
            Outcome.Reason = WinReason.RoundLimitReached;
            State = GameState.Completed;
            return;
        }

        CurrentRound++;
        TurnsTakenInRound = 0;
        RedealForRound(CurrentRound);
        BeginRoundPreparation();

        if (GetRoundTurnLimit(CurrentRound) == 0)
        {
            AdvanceRoundIfNeeded();
        }
    }

    private void BeginRoundPreparation()
    {
        IsRoundPreparation = true;
        _readyPlayerIds.Clear();
    }

    private int GetPlayerIndexById(string playerId)
    {
        var index = Players.FindIndex(player => player.Id == playerId);
        if (index < 0)
        {
            throw new InvalidOperationException("Player not found.");
        }

        return index;
    }

    private void EnsureInProgress()
    {
        if (State != GameState.InProgress || Outcome.IsComplete)
        {
            throw new InvalidOperationException("Game is not in progress.");
        }
    }

    private void EnsureNoPendingDecision()
    {
        if (CurrentPendingDecision is not null)
        {
            throw new InvalidOperationException("Resolve the pending decision before revealing another wire.");
        }
    }

    private void EnsureRoundInTurnPhase()
    {
        if (IsRoundPreparation)
        {
            throw new InvalidOperationException("Waiting for all players to confirm they are ready for the round.");
        }
    }

    private void EnsureRoundInPreparationPhase()
    {
        if (!IsRoundPreparation)
        {
            throw new InvalidOperationException("Round is already in progress.");
        }
    }
}
