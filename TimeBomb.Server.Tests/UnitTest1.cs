using TimeBomb.Server.Classes;
using TimeBomb.Server.Hubs;

namespace TimeBomb.Server.Tests;

public class TimeBombGameTests
{
    [Theory]
    [InlineData(3)]
    [InlineData(7)]
    public void Constructor_Throws_WhenPlayerCountIsOutsideSupportedRange(int playerCount)
    {
        var players = CreatePlayers(playerCount);

        var exception = Assert.Throws<InvalidOperationException>(() => _ = new TimeBombGame(players));

        Assert.Equal("Time Bomb supports 4 to 6 players.", exception.Message);
    }

    [Fact]
    public void Constructor_Throws_WhenSelectedColorCountDoesNotMatchPlayerCount()
    {
        var options = new TimeBombGameOptions
        {
            Variant = GameVariant.Evolution,
            RandomSeed = 11,
            SelectedBombColors = [WireColor.Green, WireColor.Orange, WireColor.Pink]
        };

        var exception = Assert.Throws<InvalidOperationException>(() => _ = new TimeBombGame(CreatePlayers(4), options));

        Assert.Equal("Selected bomb color count must match player count.", exception.Message);
    }

    [Fact]
    public void Constructor_Throws_WhenSelectedColorsContainDuplicates()
    {
        var options = new TimeBombGameOptions
        {
            Variant = GameVariant.Evolution,
            RandomSeed = 11,
            SelectedBombColors = [WireColor.Green, WireColor.Green, WireColor.Pink, WireColor.Red]
        };

        var exception = Assert.Throws<InvalidOperationException>(() => _ = new TimeBombGame(CreatePlayers(4), options));

        Assert.Equal("Selected bomb colors must be unique.", exception.Message);
    }

    [Fact]
    public void GetRoundTurnLimit_ReturnsPlayerCount_ForStandardVariant()
    {
        var game = CreateGame(GameVariant.Standard);

        Assert.Equal(game.Players.Count, game.GetRoundTurnLimit(1));
        Assert.Equal(game.Players.Count, game.GetRoundTurnLimit(2));
        Assert.Equal(game.Players.Count, game.GetRoundTurnLimit(3));
        Assert.Equal(game.Players.Count, game.GetRoundTurnLimit(4));
    }

    [Fact]
    public void GetRoundTurnLimit_UsesOrangeRevealReduction_InEvolutionRoundFour()
    {
        var game = CreateGame(GameVariant.Evolution);
        game.RevealedBombsByColor[WireColor.Orange] = 2;

        var turnLimit = game.GetRoundTurnLimit(4);

        Assert.Equal(game.Players.Count - 2, turnLimit);
    }

    [Fact]
    public void GetRoundTurnLimit_NeverReturnsNegative_InEvolutionRoundFour()
    {
        var game = CreateGame(GameVariant.Evolution);
        game.RevealedBombsByColor[WireColor.Orange] = game.Players.Count + 5;

        var turnLimit = game.GetRoundTurnLimit(4);

        Assert.Equal(0, turnLimit);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(5)]
    public void GetRoundTurnLimit_Throws_WhenRoundIsOutsideRange(int round)
    {
        var game = CreateGame(GameVariant.Standard);

        Assert.Throws<ArgumentOutOfRangeException>(() => game.GetRoundTurnLimit(round));
    }

    [Fact]
    public void MarkPlayerReadyForRound_EndsPreparation_WhenAllPlayersConfirm()
    {
        var game = CreateGame(GameVariant.Standard);

        foreach (var player in game.Players)
        {
            game.MarkPlayerReadyForRound(player.Id);
        }

        Assert.False(game.IsRoundPreparation);
        Assert.Empty(game.ReadyPlayerIds);
    }

    [Fact]
    public void ResolvePendingDecision_Throws_WhenSelectedColorIsUnavailable()
    {
        var game = CreateGame(GameVariant.Evolution);
        foreach (var player in game.Players)
        {
            player.WirePile = [WireCard.Bomb(WireColor.Blue)];
        }

        game.DefusedColors.Add(WireColor.Green);

        foreach (var player in game.Players)
        {
            game.MarkPlayerReadyForRound(player.Id);
        }

        var activePlayerId = game.GetActivePlayerId();
        var targetPlayerId = game.Players.First(player => player.Id != activePlayerId).Id;
        var revealResult = game.RevealWire(activePlayerId, targetPlayerId);

        Assert.NotNull(revealResult.PendingDecision);
        Assert.Equal(PendingDecisionType.ReactivateBlueColor, revealResult.PendingDecision!.Type);

        var exception = Assert.Throws<InvalidOperationException>(() => game.ResolvePendingDecision(activePlayerId, WireColor.Red));

        Assert.Equal("Selected color is not valid for the pending decision.", exception.Message);
    }

    [Fact]
    public void RevealWire_DoesNotApplyRedForcedTargetEffect_InStandardVariant()
    {
        var game = CreateGame(GameVariant.Standard);
        var activePlayerId = game.GetActivePlayerId();
        var targetPlayerId = game.Players.First(player => player.Id != activePlayerId).Id;

        foreach (var player in game.Players)
        {
            player.WirePile = player.Id == targetPlayerId
                ? [WireCard.Bomb(WireColor.Red)]
                : [WireCard.Defuse()];
        }

        foreach (var player in game.Players)
        {
            game.MarkPlayerReadyForRound(player.Id);
        }

        var revealResult = game.RevealWire(activePlayerId, targetPlayerId);

        Assert.NotNull(revealResult.RevealedWire);
        Assert.Equal(WireColor.Red, revealResult.RevealedWire!.Card.Color);
        Assert.Null(game.ForcedTargetPlayerIdForNextTurn);
        Assert.Null(revealResult.RevealedWire.Effect);
        Assert.Null(revealResult.RevealedWire.ForcedTargetPlayerId);
        Assert.Null(revealResult.RevealedWire.ForcedTargetPlayerName);
    }

    [Fact]
    public void RevealWire_AppliesRedForcedTargetEffect_InEvolutionVariant()
    {
        var game = CreateGame(GameVariant.Evolution);
        var activePlayerId = game.GetActivePlayerId();
        var targetPlayerId = game.Players.First(player => player.Id != activePlayerId).Id;
        var forcedTargetPlayerId = game.Players
            .First(player => player.Id != activePlayerId && player.Id != targetPlayerId).Id;
        var forcedTargetPlayerName = game.Players.First(player => player.Id == forcedTargetPlayerId).Name;

        foreach (var player in game.Players)
        {
            if (player.Id == targetPlayerId)
            {
                player.WirePile = [WireCard.Bomb(WireColor.Red)];
            }
            else if (player.Id == forcedTargetPlayerId)
            {
                player.WirePile = [WireCard.Defuse()];
            }
            else
            {
                player.WirePile = [];
            }
        }

        foreach (var player in game.Players)
        {
            game.MarkPlayerReadyForRound(player.Id);
        }

        var revealResult = game.RevealWire(activePlayerId, targetPlayerId);

        Assert.NotNull(revealResult.RevealedWire);
        Assert.Equal(WireColor.Red, revealResult.RevealedWire!.Card.Color);
        Assert.Equal(forcedTargetPlayerId, game.ForcedTargetPlayerIdForNextTurn);
        Assert.Equal(forcedTargetPlayerId, revealResult.RevealedWire.ForcedTargetPlayerId);
        Assert.Equal(forcedTargetPlayerName, revealResult.RevealedWire.ForcedTargetPlayerName);
        Assert.StartsWith("Next turn target is forced to ", revealResult.RevealedWire.Effect);
    }

    [Fact]
    public void LobbyStateMapper_ToDto_LeavesSpecialEffectMetadataNull_InStandardVariant()
    {
        var game = CreateGame(GameVariant.Standard);
        var activePlayerId = game.GetActivePlayerId();
        var targetPlayerId = game.Players.First(player => player.Id != activePlayerId).Id;

        foreach (var player in game.Players)
        {
            player.WirePile = player.Id == targetPlayerId
                ? [WireCard.Bomb(WireColor.Red)]
                : [WireCard.Defuse()];
        }

        MarkAllPlayersReady(game);
        _ = game.RevealWire(activePlayerId, targetPlayerId);

        var dto = LobbyStateMapper.ToDto(CreateLobby(game));
        var runtime = Assert.IsType<GameRuntimeDto>(dto.Game);

        Assert.Null(runtime.ForcedTargetPlayerIdForNextTurn);
        Assert.Null(runtime.ForcedTargetPlayerNameForNextTurn);
        Assert.Null(runtime.RecentEffectCue);
        AssertPlayerRemainingWireCountsMatch(game, dto);
    }

    [Fact]
    public void LobbyStateMapper_ToDto_MapsForcedTargetAndRecentEffectCue_InEvolutionVariant()
    {
        var game = CreateGame(GameVariant.Evolution);
        var activePlayerId = game.GetActivePlayerId();
        var targetPlayerId = game.Players.First(player => player.Id != activePlayerId).Id;
        var forcedTargetPlayerId = game.Players
            .First(player => player.Id != activePlayerId && player.Id != targetPlayerId).Id;
        var forcedTargetPlayerName = game.Players.First(player => player.Id == forcedTargetPlayerId).Name;

        foreach (var player in game.Players)
        {
            if (player.Id == targetPlayerId)
            {
                player.WirePile = [WireCard.Bomb(WireColor.Red)];
            }
            else if (player.Id == forcedTargetPlayerId)
            {
                player.WirePile = [WireCard.Defuse()];
            }
            else
            {
                player.WirePile = [];
            }
        }

        MarkAllPlayersReady(game);
        var revealResult = game.RevealWire(activePlayerId, targetPlayerId);

        var dto = LobbyStateMapper.ToDto(CreateLobby(game));
        var runtime = Assert.IsType<GameRuntimeDto>(dto.Game);
        var cue = Assert.IsType<RecentEffectCueDto>(runtime.RecentEffectCue);

        Assert.Equal(forcedTargetPlayerId, runtime.ForcedTargetPlayerIdForNextTurn);
        Assert.Equal(forcedTargetPlayerName, runtime.ForcedTargetPlayerNameForNextTurn);
        Assert.Equal(revealResult.RevealedWire!.Round, cue.Round);
        Assert.Equal(revealResult.RevealedWire.Turn, cue.Turn);
        Assert.Equal(revealResult.RevealedWire.Effect, cue.Effect);
        Assert.Equal(activePlayerId, cue.ActivePlayerId);
        Assert.Equal(targetPlayerId, cue.RevealedFromPlayerId);
        Assert.Equal(forcedTargetPlayerId, cue.ForcedTargetPlayerId);
        Assert.Equal(forcedTargetPlayerName, cue.ForcedTargetPlayerName);
        AssertPlayerRemainingWireCountsMatch(game, dto);
        AssertRevealedPileTotalsMatch(game, runtime);
    }

    [Fact]
    public void LobbyStateMapper_ToDto_MapsRevealedPileTotalsForAllPlayers_StandardVariant()
    {
        var game = CreateGame(GameVariant.Standard);
        var activePlayerId = game.GetActivePlayerId();
        var targetPlayerId = game.Players.First(player => player.Id != activePlayerId).Id;

        MarkAllPlayersReady(game);
        _ = game.RevealWire(activePlayerId, targetPlayerId);

        var dto = LobbyStateMapper.ToDto(CreateLobby(game));
        var runtime = Assert.IsType<GameRuntimeDto>(dto.Game);

        AssertRevealedPileTotalsMatch(game, runtime);
        Assert.NotNull(runtime.RevealedPileTotalsByPlayer);
        Assert.Equal(game.Players.Count, runtime.RevealedPileTotalsByPlayer.Count);
        Assert.Equal(1, runtime.RevealedPileTotalsByPlayer[targetPlayerId]);

        foreach (var player in game.Players.Where(player => player.Id != targetPlayerId))
        {
            Assert.Equal(0, runtime.RevealedPileTotalsByPlayer[player.Id]);
        }
    }

    [Fact]
    public void LobbyStateMapper_ToDto_MapsRevealedPileTotalsForAllPlayers_EvolutionVariant()
    {
        var game = CreateGame(GameVariant.Evolution);
        var activePlayerId = game.GetActivePlayerId();
        var targetPlayerId = game.Players.First(player => player.Id != activePlayerId).Id;

        MarkAllPlayersReady(game);
        _ = game.RevealWire(activePlayerId, targetPlayerId);

        var dto = LobbyStateMapper.ToDto(CreateLobby(game));
        var runtime = Assert.IsType<GameRuntimeDto>(dto.Game);

        AssertRevealedPileTotalsMatch(game, runtime);
        Assert.NotNull(runtime.RevealedPileTotalsByPlayer);
        Assert.Equal(game.Players.Count, runtime.RevealedPileTotalsByPlayer.Count);
        Assert.Equal(1, runtime.RevealedPileTotalsByPlayer[targetPlayerId]);

        foreach (var player in game.Players.Where(player => player.Id != targetPlayerId))
        {
            Assert.Equal(0, runtime.RevealedPileTotalsByPlayer[player.Id]);
        }
    }

    [Fact]
    public void RevealWire_AssignsDefuseColor_WhenDefuseAvailableInEvolution()
    {
        var game = CreateGame(GameVariant.Evolution);
        MarkAllPlayersReady(game);

        var activePlayerId = game.GetActivePlayerId();
        var bombTarget = game.Players.First(player => player.Id != activePlayerId);
        var defuseTarget = game.Players.First(player => player.Id != activePlayerId && player.Id != bombTarget.Id);
        var otherPlayer = game.Players.FirstOrDefault(player => player.Id != activePlayerId && player.Id != bombTarget.Id && player.Id != defuseTarget.Id);

        SetPlayerWirePile(game, activePlayerId);
        SetPlayerWirePile(game, bombTarget.Id, WireCard.Bomb(WireColor.Green));
        SetPlayerWirePile(game, defuseTarget.Id, WireCard.Defuse());
        if (otherPlayer is not null)
        {
            SetPlayerWirePile(game, otherPlayer.Id);
        }

        var bombReveal = game.RevealWire(activePlayerId, bombTarget.Id);

        Assert.Null(bombReveal.PendingDecision);
        Assert.Equal(1, game.RevealedBombsByColor[WireColor.Green]);

        var defuseReveal = game.RevealWire(bombTarget.Id, defuseTarget.Id);

        Assert.NotNull(defuseReveal.PendingDecision);
        Assert.Equal(PendingDecisionType.AssignDefuseColor, defuseReveal.PendingDecision!.Type);
        Assert.Contains(WireColor.Green, defuseReveal.PendingDecision.AvailableColors);

        var resolved = game.ResolvePendingDecision(bombTarget.Id, WireColor.Green);

        Assert.Contains(WireColor.Green, game.DefusedColors);
        Assert.Equal(WireColor.Green, resolved.RevealedWire!.DefusedColorAssigned);
        Assert.Equal("Defused Green bomb color.", resolved.RevealedWire.Effect);
        Assert.Null(resolved.PendingDecision);
        Assert.Empty(game.UnassignedDefuseWires);
    }

    [Fact]
    public void RevealWire_DefuseUnassigned_WhenNoDefusableColorsInEvolution()
    {
        var game = CreateGame(GameVariant.Evolution);
        MarkAllPlayersReady(game);

        var activePlayerId = game.GetActivePlayerId();
        var defuseTarget = game.Players.First(player => player.Id != activePlayerId);

        foreach (var player in game.Players)
        {
            SetPlayerWirePile(game, player.Id);
        }

        SetPlayerWirePile(game, defuseTarget.Id, WireCard.Defuse());

        var result = game.RevealWire(activePlayerId, defuseTarget.Id);

        Assert.Null(result.PendingDecision);
        Assert.Single(game.UnassignedDefuseWires);
        Assert.Equal("Defuse wire could not be assigned to a color.", result.RevealedWire!.Effect);
    }

    [Fact]
    public void ResolvePendingDecision_ReactivatesColorAndCanExplodeInEvolution()
    {
        var game = CreateGame(GameVariant.Evolution);
        MarkAllPlayersReady(game);

        var activePlayerId = game.GetActivePlayerId();
        var blueTarget = game.Players.First(player => player.Id != activePlayerId);

        foreach (var player in game.Players)
        {
            SetPlayerWirePile(game, player.Id);
        }

        SetPlayerWirePile(game, blueTarget.Id, WireCard.Bomb(WireColor.Blue));
        game.DefusedColors.Add(WireColor.Green);
        game.RevealedBombsByColor[WireColor.Green] = 3;

        var reveal = game.RevealWire(activePlayerId, blueTarget.Id);

        Assert.NotNull(reveal.PendingDecision);
        Assert.Equal(PendingDecisionType.ReactivateBlueColor, reveal.PendingDecision!.Type);

        var resolved = game.ResolvePendingDecision(activePlayerId, WireColor.Green);

        Assert.DoesNotContain(WireColor.Green, game.DefusedColors);
        Assert.Equal(TeamAlignment.Moriarty, game.Outcome.Winner);
        Assert.Equal(WinReason.BombExploded, game.Outcome.Reason);
        Assert.Equal(WireColor.Green, resolved.RevealedWire!.ReactivatedColor);
        Assert.Equal("Reactivated Green bomb color and it exploded immediately.", resolved.RevealedWire.Effect);
    }

    [Fact]
    public void RevealWire_PinkBombsExplodeOnSecondConsecutiveInEvolution()
    {
        var game = CreateGame(GameVariant.Evolution);
        MarkAllPlayersReady(game);

        var activePlayerId = game.GetActivePlayerId();
        var firstTarget = game.Players.First(player => player.Id != activePlayerId);
        var secondTarget = game.Players.First(player => player.Id != activePlayerId && player.Id != firstTarget.Id);

        foreach (var player in game.Players)
        {
            SetPlayerWirePile(game, player.Id);
        }

        SetPlayerWirePile(game, firstTarget.Id, WireCard.Bomb(WireColor.Pink));
        SetPlayerWirePile(game, secondTarget.Id, WireCard.Bomb(WireColor.Pink));

        _ = game.RevealWire(activePlayerId, firstTarget.Id);

        Assert.False(game.Outcome.IsComplete);

        _ = game.RevealWire(firstTarget.Id, secondTarget.Id);

        Assert.Equal(TeamAlignment.Moriarty, game.Outcome.Winner);
        Assert.Equal(WinReason.BombExploded, game.Outcome.Reason);
    }

    [Fact]
    public void RevealWire_GreenBombExplodesAtThreeInEvolution()
    {
        var game = CreateGame(GameVariant.Evolution, playerCount: 4);
        MarkAllPlayersReady(game);

        var activePlayerId = game.GetActivePlayerId();
        var firstTarget = game.Players.First(player => player.Id != activePlayerId);
        var secondTarget = game.Players.First(player => player.Id != activePlayerId && player.Id != firstTarget.Id);
        var thirdTarget = game.Players.First(player => player.Id != activePlayerId && player.Id != firstTarget.Id && player.Id != secondTarget.Id);

        foreach (var player in game.Players)
        {
            SetPlayerWirePile(game, player.Id);
        }

        SetPlayerWirePile(game, firstTarget.Id, WireCard.Bomb(WireColor.Green));
        SetPlayerWirePile(game, secondTarget.Id, WireCard.Bomb(WireColor.Green));
        SetPlayerWirePile(game, thirdTarget.Id, WireCard.Bomb(WireColor.Green));

        _ = game.RevealWire(activePlayerId, firstTarget.Id);
        _ = game.RevealWire(firstTarget.Id, secondTarget.Id);
        _ = game.RevealWire(secondTarget.Id, thirdTarget.Id);

        Assert.Equal(TeamAlignment.Moriarty, game.Outcome.Winner);
        Assert.Equal(WinReason.BombExploded, game.Outcome.Reason);
    }

    [Fact]
    public void RevealWire_DoesNotExplodeGreenWhenDefusedInEvolution()
    {
        var game = CreateGame(GameVariant.Evolution);
        MarkAllPlayersReady(game);

        var activePlayerId = game.GetActivePlayerId();
        var target = game.Players.First(player => player.Id != activePlayerId);

        foreach (var player in game.Players)
        {
            SetPlayerWirePile(game, player.Id);
        }

        SetPlayerWirePile(game, target.Id, WireCard.Bomb(WireColor.Green));
        game.DefusedColors.Add(WireColor.Green);
        game.RevealedBombsByColor[WireColor.Green] = 2;

        _ = game.RevealWire(activePlayerId, target.Id);

        Assert.False(game.Outcome.IsComplete);
        Assert.Equal(3, game.RevealedBombsByColor[WireColor.Green]);
    }

    private static void MarkAllPlayersReady(TimeBombGame game)
    {
        foreach (var player in game.Players)
        {
            game.MarkPlayerReadyForRound(player.Id);
        }
    }

    private static GameLobby CreateLobby(TimeBombGame game)
    {
        return new GameLobby
        {
            LobbyCode = "ABCD",
            Name = "Regression Lobby",
            CurrentState = GameState.InProgress,
            CreatedByPlayerId = game.Players[0].Id,
            Rules = new LobbyRulesSettings
            {
                Variant = game.Variant,
                RandomizeCardColors = false,
                SelectedBombColors = game.SelectedBombColors.ToList()
            },
            Players = game.Players
                .Select(player => new Player
                {
                    Id = player.Id,
                    Name = player.Name
                })
                .ToList(),
            ActiveGame = game
        };
    }

    private static void AssertPlayerRemainingWireCountsMatch(TimeBombGame game, LobbyStateDto dto)
    {
        foreach (var dtoPlayer in dto.Players)
        {
            var gamePlayer = game.Players.Single(player => player.Id == dtoPlayer.Id);
            Assert.Equal(gamePlayer.WirePile.Count, dtoPlayer.RemainingWireCount);
        }
    }

    private static void AssertRevealedPileTotalsMatch(TimeBombGame game, GameRuntimeDto runtime)
    {
        Assert.NotNull(runtime.RevealedPileTotalsByPlayer);

        var expectedTotals = game.RevealedWires
            .GroupBy(wire => wire.RevealedFromPlayerId)
            .ToDictionary(group => group.Key, group => group.Count());

        foreach (var player in game.Players)
        {
            var expectedCount = expectedTotals.GetValueOrDefault(player.Id, 0);
            Assert.Equal(expectedCount, runtime.RevealedPileTotalsByPlayer[player.Id]);
        }
    }

    private static void SetPlayerWirePile(TimeBombGame game, string playerId, params WireCard[] cards)
    {
        var player = game.Players.Single(current => current.Id == playerId);
        player.WirePile = cards.ToList();
    }

    private static TimeBombGame CreateGame(GameVariant variant, int playerCount = 4)
    {
        var options = new TimeBombGameOptions
        {
            Variant = variant,
            RandomSeed = 11,
            SelectedBombColors = Enum.GetValues<WireColor>().Take(playerCount).ToList()
        };

        return new TimeBombGame(CreatePlayers(playerCount), options);
    }

    private static List<Player> CreatePlayers(int count)
    {
        return Enumerable.Range(1, count)
            .Select(index => new Player
            {
                Id = $"player-{index}",
                Name = $"Player {index}"
            })
            .ToList();
    }
}
