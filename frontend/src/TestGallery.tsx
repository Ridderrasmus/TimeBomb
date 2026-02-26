import { useState } from "react";
import "./TestGallery.css";
import { ActiveGameUi } from "./components/ActiveGameUi";
import { LobbyScreen } from "./components/LobbyScreen";
import { VictoryScreen } from "./components/VictoryScreen";
import { WireVisualCard } from "./components/WireVisualCard";
import { TurnStateProminence } from "./components/TurnStateProminence";
import { PlayerStatusCards } from "./components/PlayerStatusCards";
import { RevealedWireHistory } from "./components/RevealedWireHistory";
import {
  ALL_WIRE_COLORS,
  type LobbyStateName,
  type RulesDraft,
  type WireCard,
  type WireColor,
  type WireKind,
} from "./types/game";

function generateMockPlayers(count: 1 | 4 | 6) {
  const allPlayers = [
    { id: "p1", name: "Alice" },
    { id: "p2", name: "Bob" },
    { id: "p3", name: "Charlie" },
    { id: "p4", name: "Diana" },
    { id: "p5", name: "Eve" },
    { id: "p6", name: "Frank" },
  ];
  return allPlayers.slice(0, count).map((p) => ({
    ...p,
    remainingWireCount: 5,
    isActiveTurnPlayer: false,
  }));
}

function generateMockWires(playerCount: 1 | 4 | 6 = 4) {
  const wires = [];
  const colors: WireColor[] = ["Green", "Orange", "Pink", "Yellow", "Blue", "Red"];
  const participantCount = Math.max(playerCount, 2);

  // Green defuse wires
  wires.push(
    {
      round: 1,
      turn: 1,
      activePlayerId: "p1",
      revealedFromPlayerId: "p2",
      card: { kind: "Defuse" as WireKind, color: "Green" as WireColor },
      effect: "Safe cut - no effect",
    },
    {
      round: 1,
      turn: 2,
      activePlayerId: "p2",
      revealedFromPlayerId: "p3",
      card: { kind: "Defuse" as WireKind, color: "Orange" as WireColor },
      effect: "Defuse gained",
    }
  );

  // Bomb wires
  colors.slice(0, 4).forEach((color, idx) => {
    wires.push({
      round: 1,
      turn: 3 + idx,
      activePlayerId: "p" + ((idx % participantCount) + 1),
      revealedFromPlayerId: "p" + (((idx + 1) % participantCount) + 1),
      card: { kind: "Bomb" as WireKind, color },
      effect: color === "Red" ? "Bomb explodes!" : undefined,
    });
  });

  // Mixed
  wires.push({
    round: 2,
    turn: 1,
    activePlayerId: "p1",
    revealedFromPlayerId: "p4",
    card: { kind: "Defuse" as WireKind, color: "Blue" as WireColor },
    effect: "Another defuse",
  });

  return wires;
}

function FullGameShowcase() {
  const [lastCutTargetId, setLastCutTargetId] = useState<string | null>(null);
  const [selectedPendingDecisionColor, setSelectedPendingDecisionColor] =
    useState<WireColor | null>("Green");
  const players = generateMockPlayers(6);
  const remainingCounts = [5, 4, 3, 5, 4, 3];
  players.forEach((player, index) => {
    player.remainingWireCount = remainingCounts[index] ?? 5;
    player.isActiveTurnPlayer = player.id === "p1";
  });

  const wires = generateMockWires(6);
  const hand: WireCard[] = [
    { kind: "Bomb", color: "Red" },
    { kind: "Defuse", color: "Green" },
    { kind: "Defuse", color: "Blue" },
    { kind: "Bomb", color: "Orange" },
    { kind: "Defuse", color: null },
  ];
  const forcedTargetPlayerId = "p3";
  const pendingDecisionColors: WireColor[] = ["Green", "Orange", "Blue"];
  const cuttablePlayerIds = [forcedTargetPlayerId];
  const lastCutTargetName =
    players.find((player) => player.id === lastCutTargetId)?.name ?? null;

  const mockGame = {
    gameId: "mock-game-1",
    variant: "Evolution" as const,
    currentRound: 2,
    maxRounds: 4,
    turnsTakenInRound: 4,
    roundTurnLimit: 8,
    activePlayerId: "p1",
    isRoundPreparation: true,
    readyPlayerIds: ["p1", "p2", "p3"],
    forcedTargetPlayerIdForNextTurn: forcedTargetPlayerId,
    forcedTargetPlayerNameForNextTurn: "Charlie",
    revealedDefuseWireCount: 3,
    defusedColors: ["Green", "Blue"] as WireColor[],
    revealedWires: wires,
    revealedPileTotalsByPlayer: null,
    outcome: {
      winner: null,
      reason: "None" as const,
      isComplete: false,
    },
  };

  const mockRules = {
    variant: "Evolution" as const,
    randomizeCardColors: true,
    selectedBombColors: null,
  };

  const mockPendingDecision = {
    type: "ReactivateBlueColor" as const,
    requestedByPlayerId: "p1",
    availableColors: pendingDecisionColors,
  };

  const effectCue = {
    round: 2,
    turn: 4,
    effect: "Forced cut on Charlie next turn",
    activePlayerId: "p1",
    revealedFromPlayerId: "p2",
  };

  return (
    <div className="gallery-section">
      <h2>Full Active Game UI</h2>
      <p className="gallery-hint">
        Composite scene showing turn state, table, stats, decisions, hand, and history to
        assess gameplay clutter.
      </p>

      <ActiveGameUi
        players={players}
        currentPlayerId="p1"
        game={mockGame}
        rules={mockRules}
        myTeam="Sherlock"
        isMyTurn={true}
        activePlayerName="Alice"
        canReveal={true}
        busy={false}
        hubReady={true}
        visibleHand={hand}
        isReadyForRound={true}
        cuttablePlayerIds={cuttablePlayerIds}
        pendingDecision={mockPendingDecision}
        isPendingDecisionRequester={true}
        pendingDecisionRequesterName="Alice"
        selectedPendingDecisionColor={selectedPendingDecisionColor}
        onSelectPendingDecisionColor={setSelectedPendingDecisionColor}
        onSubmitPendingDecision={() => undefined}
        onRevealWire={(targetPlayerId) => {
          if (!cuttablePlayerIds.includes(targetPlayerId)) {
            return;
          }

          setLastCutTargetId(targetPlayerId);
        }}
        onMarkRoundReady={() => undefined}
        effectCue={effectCue}
        effectActivePlayerName="Alice"
        effectRevealedFromPlayerName="Bob"
        effectForcedTargetName={`Charlie${lastCutTargetName ? ` · last cut ${lastCutTargetName}` : ""}`}
        showHandToggleButton={true}
      />
    </div>
  );
}

function LobbyShowcase() {
  const [isCreator, setIsCreator] = useState(true);
  const [hubReady, setHubReady] = useState(true);
  const [playerCount, setPlayerCount] = useState<1 | 4 | 6>(6);
  const [lobbyState, setLobbyState] = useState<LobbyStateName>("Lobby");
  const [myTeam, setMyTeam] = useState<"Sherlock" | "Moriarty" | null>(null);
  const players = generateMockPlayers(playerCount);
  const creatorName = players[0]?.name ?? "Unknown";
  const [rulesDraft, setRulesDraft] = useState<RulesDraft>({
    variant: "Evolution",
    randomizeCardColors: false,
    selectedBombColors: ["Green", "Orange", "Blue"],
  });
  const [mockActionMessage, setMockActionMessage] = useState<string | null>(null);
  const selectedColorCount = rulesDraft.selectedBombColors?.length ?? 0;
  const requiredColorCount = players.length;

  return (
    <div className="gallery-section">
      <h2>Lobby UI</h2>
      <p className="gallery-hint">
        Prefilled lobby scene for layout testing only. Actions update local state and do
        not call backend APIs.
      </p>

      <div className="gallery-controls">
        <label className="check-row" htmlFor="lobby-scene-is-creator">
          <input
            id="lobby-scene-is-creator"
            type="checkbox"
            checked={isCreator}
            onChange={(event) => setIsCreator(event.target.checked)}
          />
          You are the lobby creator
        </label>
        <label className="check-row" htmlFor="lobby-scene-hub-ready">
          <input
            id="lobby-scene-hub-ready"
            type="checkbox"
            checked={hubReady}
            onChange={(event) => setHubReady(event.target.checked)}
          />
          Hub connected
        </label>
        <label>
          Player count:
          <select
            value={playerCount}
            onChange={(event) => setPlayerCount(Number(event.target.value) as 1 | 4 | 6)}
          >
            <option value={1}>1 player</option>
            <option value={4}>4 players</option>
            <option value={6}>6 players</option>
          </select>
        </label>
        <label>
          Lobby state:
          <select
            value={lobbyState}
            onChange={(event) => setLobbyState(event.target.value as LobbyStateName)}
          >
            <option value="Lobby">Lobby</option>
            <option value="InProgress">InProgress</option>
            <option value="Completed">Completed</option>
          </select>
        </label>
        <label>
          Team:
          <select
            value={myTeam ?? "none"}
            onChange={(event) =>
              setMyTeam(
                event.target.value === "none"
                  ? null
                  : (event.target.value as "Sherlock" | "Moriarty"),
              )
            }
          >
            <option value="none">None</option>
            <option value="Sherlock">Sherlock</option>
            <option value="Moriarty">Moriarty</option>
          </select>
        </label>
      </div>

      <LobbyScreen
        lobbyName="Gallery Lobby"
        lobbyCode="MOCK42"
        lobbyState={lobbyState}
        creatorName={creatorName}
        players={players}
        currentPlayerId="p1"
        rulesDraft={rulesDraft}
        isCreator={isCreator}
        busy={false}
        hubReady={hubReady}
        myTeam={myTeam}
        requiredColorCount={requiredColorCount}
        selectedColorCount={selectedColorCount}
        allWireColors={ALL_WIRE_COLORS}
        onRulesDraftChange={setRulesDraft}
        onToggleSelectedBombColor={(color) => {
          const current = new Set(rulesDraft.selectedBombColors ?? []);

          if (current.has(color)) {
            current.delete(color);
          } else if (current.size < requiredColorCount) {
            current.add(color);
          }

          setRulesDraft({
            ...rulesDraft,
            selectedBombColors: Array.from(current),
          });
        }}
        onKickPlayer={(playerId) =>
          setMockActionMessage(`Mock action: Kick player ${playerId} clicked`)
        }
        onStartGame={() => setMockActionMessage("Mock action: Start game clicked")}
        onLeaveLobby={() => setMockActionMessage("Mock action: Leave lobby clicked")}
        showDebugSpawnButton={isCreator && lobbyState === "Lobby"}
        onDebugSpawnPlayers={() =>
          setMockActionMessage("Mock action: Add debug users clicked")
        }
        error={null}
      />

      {mockActionMessage && <p className="subtle">{mockActionMessage}</p>}
    </div>
  );
}

function WireCardShowcase() {
  const states: Array<{
    label: string;
    kind: WireKind;
    color: WireColor | null;
    subtitle: string;
  }> = [
    { label: "Green Defuse", kind: "Defuse", color: "Green", subtitle: "Safe reveal" },
    { label: "Bomb Red", kind: "Bomb", color: "Red", subtitle: "Danger!" },
    { label: "Bomb Orange", kind: "Bomb", color: "Orange", subtitle: "Caution" },
    { label: "No Color", kind: "Defuse", color: null, subtitle: "Unknown" },
  ];

  return (
    <div className="gallery-section">
      <h2>Wire Visual Cards</h2>
      <p className="gallery-hint">
        Each card shows reveal entrance, glow pulse, and color flash animations.
      </p>
      <div className="gallery-grid">
        {states.map((state) => (
          <div key={state.label} className="gallery-item">
            <p className="gallery-item-label">{state.label}</p>
            <WireVisualCard
              kind={state.kind}
              color={state.color}
              subtitle={state.subtitle}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TurnBannerShowcase() {
  return (
    <div className="gallery-section">
      <h2>Turn Banner / Turn State Prominence</h2>
      <p className="gallery-hint">
        Shows active/waiting pulse animation (2.2s infinite vertical bounce).
      </p>
      <div className="gallery-row">
        <div className="gallery-item">
          <p className="gallery-item-label">Your Turn (Active)</p>
          <TurnStateProminence
            isMyTurn={true}
            round={1}
            maxRounds={3}
            turnsTakenInRound={2}
            roundTurnLimit={6}
            activePlayerName="You"
            isRoundPreparation={false}
            myTeam="Sherlock"
          />
        </div>
        <div className="gallery-item">
          <p className="gallery-item-label">Waiting (Inactive)</p>
          <TurnStateProminence
            isMyTurn={false}
            round={1}
            maxRounds={3}
            turnsTakenInRound={2}
            roundTurnLimit={6}
            activePlayerName="Alice"
            isRoundPreparation={false}
            myTeam="Moriarty"
          />
        </div>
      </div>
    </div>
  );
}

function PlayerCardsShowcase() {
  const [playerCount, setPlayerCount] = useState<1 | 4 | 6>(4);
  const [forcedPlayer, setForcedPlayer] = useState<string | null>(null);
  const players = generateMockPlayers(playerCount);
  const activePlayer = players[0];

  // Update active player
  players.forEach((p) => {
    p.isActiveTurnPlayer = p.id === activePlayer.id;
  });

  return (
    <div className="gallery-section">
      <h2>Player Status Cards</h2>
      <p className="gallery-hint">
        Shows active player pulse (1.9s infinite) and forced target highlight (1.8s).
      </p>
      <div className="gallery-controls">
        <label>
          Player count:
          <select
            value={playerCount}
            onChange={(e) => {
              setPlayerCount(Number(e.target.value) as 1 | 4 | 6);
              setForcedPlayer(null);
            }}
          >
            <option value={1}>1 player</option>
            <option value={4}>4 players</option>
            <option value={6}>6 players</option>
          </select>
        </label>
        <label>
          Forced target:
          <select
            value={forcedPlayer ?? "none"}
            onChange={(e) =>
              setForcedPlayer(e.target.value === "none" ? null : e.target.value)
            }
          >
            <option value="none">None</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <PlayerStatusCards
        players={players}
        currentPlayerId="p1"
        forcedTargetPlayerId={forcedPlayer}
        showWireCounts={true}
        circularLayout={playerCount > 2}
      />
    </div>
  );
}

function WireHistoryShowcase() {
  const wires = generateMockWires();
  const players = [
    { id: "p1", name: "Alice" },
    { id: "p2", name: "Bob" },
    { id: "p3", name: "Charlie" },
    { id: "p4", name: "Diana" },
  ];

  return (
    <div className="gallery-section">
      <h2>Revealed Wire History</h2>
      <p className="gallery-hint">
        Shows reveal lane entrance (220ms slide-in) and latest item pulse (2.2s float).
      </p>
      <RevealedWireHistory wires={wires} players={players} />
    </div>
  );
}

function VictoryShowcase() {
  const [isCreator, setIsCreator] = useState(true);
  const [hubReady, setHubReady] = useState(true);
  const [busy, setBusy] = useState(false);
  const [winner, setWinner] = useState<"Sherlock" | "Moriarty" | "none">("Sherlock");
  const [myTeam, setMyTeam] = useState<"Sherlock" | "Moriarty" | "none">("Sherlock");
  const [outcomeReason, setOutcomeReason] = useState<
    "BombExploded" | "DefuseObjectiveComplete" | "RoundLimitReached"
  >("DefuseObjectiveComplete");
  const [mockActionMessage, setMockActionMessage] = useState<string | null>(null);

  return (
    <div className="gallery-section">
      <h2>Victory UI</h2>
      <p className="gallery-hint">
        Final game summary screen with host controls for replay and lobby return.
      </p>

      <div className="gallery-controls">
        <label className="check-row" htmlFor="victory-scene-is-creator">
          <input
            id="victory-scene-is-creator"
            type="checkbox"
            checked={isCreator}
            onChange={(event) => setIsCreator(event.target.checked)}
          />
          You are the lobby creator
        </label>
        <label className="check-row" htmlFor="victory-scene-hub-ready">
          <input
            id="victory-scene-hub-ready"
            type="checkbox"
            checked={hubReady}
            onChange={(event) => setHubReady(event.target.checked)}
          />
          Hub connected
        </label>
        <label className="check-row" htmlFor="victory-scene-busy">
          <input
            id="victory-scene-busy"
            type="checkbox"
            checked={busy}
            onChange={(event) => setBusy(event.target.checked)}
          />
          Busy state
        </label>
        <label>
          Winner:
          <select
            value={winner}
            onChange={(event) =>
              setWinner(event.target.value as "Sherlock" | "Moriarty" | "none")
            }
          >
            <option value="Sherlock">Sherlock</option>
            <option value="Moriarty">Moriarty</option>
            <option value="none">No winner</option>
          </select>
        </label>
        <label>
          My team:
          <select
            value={myTeam}
            onChange={(event) =>
              setMyTeam(event.target.value as "Sherlock" | "Moriarty" | "none")
            }
          >
            <option value="Sherlock">Sherlock</option>
            <option value="Moriarty">Moriarty</option>
            <option value="none">Unknown</option>
          </select>
        </label>
        <label>
          Outcome:
          <select
            value={outcomeReason}
            onChange={(event) =>
              setOutcomeReason(
                event.target.value as
                  | "BombExploded"
                  | "DefuseObjectiveComplete"
                  | "RoundLimitReached",
              )
            }
          >
            <option value="DefuseObjectiveComplete">Defuse objective complete</option>
            <option value="BombExploded">Bomb exploded</option>
            <option value="RoundLimitReached">Round limit reached</option>
          </select>
        </label>
      </div>

      <VictoryScreen
        lobbyName="Gallery Lobby"
        winner={winner === "none" ? null : winner}
        outcomeReason={outcomeReason}
        myTeam={myTeam === "none" ? null : myTeam}
        canPlayAgain={isCreator}
        canReturnToLobby={isCreator}
        hubReady={hubReady}
        busy={busy}
        onPlayAgain={() => setMockActionMessage("Mock action: Play again clicked")}
        onReturnToLobby={() =>
          setMockActionMessage("Mock action: Back to lobby clicked")
        }
        onLeaveLobby={() => setMockActionMessage("Mock action: Leave lobby clicked")}
      />

      {mockActionMessage && <p className="subtle">{mockActionMessage}</p>}
    </div>
  );
}

export function TestGallery() {
  const [activeScene, setActiveScene] = useState<
    | "wires"
    | "turn-banner"
    | "players"
    | "history"
    | "lobby"
    | "victory"
    | "full-game"
  >("wires");

  return (
    <div className="test-gallery">
      <header className="gallery-header">
        <h1>Phase 1 Component Gallery</h1>
        <p>Visual testing and animation showcase</p>
      </header>

      <nav className="gallery-nav">
        <button
          className={activeScene === "wires" ? "active" : ""}
          onClick={() => setActiveScene("wires")}
        >
          Wire Cards
        </button>
        <button
          className={activeScene === "turn-banner" ? "active" : ""}
          onClick={() => setActiveScene("turn-banner")}
        >
          Turn Banner
        </button>
        <button
          className={activeScene === "players" ? "active" : ""}
          onClick={() => setActiveScene("players")}
        >
          Player Cards
        </button>
        <button
          className={activeScene === "history" ? "active" : ""}
          onClick={() => setActiveScene("history")}
        >
          Wire History
        </button>
        <button
          className={activeScene === "lobby" ? "active" : ""}
          onClick={() => setActiveScene("lobby")}
        >
          Lobby UI
        </button>
        <button
          className={activeScene === "victory" ? "active" : ""}
          onClick={() => setActiveScene("victory")}
        >
          Victory UI
        </button>
        <button
          className={activeScene === "full-game" ? "active" : ""}
          onClick={() => setActiveScene("full-game")}
        >
          Full Game UI
        </button>
      </nav>

      <main className="gallery-main">
        {activeScene === "wires" && <WireCardShowcase />}
        {activeScene === "turn-banner" && <TurnBannerShowcase />}
        {activeScene === "players" && <PlayerCardsShowcase />}
        {activeScene === "history" && <WireHistoryShowcase />}
        {activeScene === "lobby" && <LobbyShowcase />}
        {activeScene === "victory" && <VictoryShowcase />}
        {activeScene === "full-game" && <FullGameShowcase />}
      </main>
    </div>
  );
}
