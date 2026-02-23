import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import "./App.css";
import { PlayerStatusCards } from "./components/PlayerStatusCards";
import { RevealedPileTotals } from "./components/RevealedPileTotals";
import { RevealedWireHistory } from "./components/RevealedWireHistory";
import { TurnStateProminence } from "./components/TurnStateProminence";
import { WireVisualCard } from "./components/WireVisualCard";

type LobbyMode = "create" | "join";
const PLAYER_NAME_STORAGE_KEY = "timebomb.playerName";
const PLAYER_ID_STORAGE_KEY = "timebomb.playerId";

type GameVariant = "Standard" | "Evolution";
type LobbyStateName = "Lobby" | "InProgress" | "Completed";
type WireKind = "Defuse" | "Bomb";
type WireColor = "Green" | "Orange" | "Pink" | "Yellow" | "Blue" | "Red";
type PendingDecisionType = "AssignDefuseColor" | "ReactivateBlueColor";
const ALL_WIRE_COLORS: WireColor[] = [
  "Green",
  "Orange",
  "Pink",
  "Yellow",
  "Blue",
  "Red",
];

interface PlayerResponse {
  id: string;
  name: string;
}

interface LobbyResponse {
  id: string;
  lobbyCode: string;
  name: string;
  createdByPlayerId: string;
  state: LobbyStateName;
  rules: {
    variant: GameVariant;
    randomizeCardColors: boolean;
    selectedBombColors?: WireColor[] | null;
  };
  players: PlayerResponse[];
}

interface RevealedWire {
  round: number;
  turn: number;
  activePlayerId: string;
  revealedFromPlayerId: string;
  card: {
    kind: WireKind;
    color?: WireColor | null;
  };
  defusedColorAssigned?: WireColor | null;
  reactivatedColor?: WireColor | null;
  effect?: string | null;
  forcedTargetPlayerId?: string | null;
  forcedTargetPlayerName?: string | null;
}

interface RecentEffectCue {
  round: number;
  turn: number;
  effect: string;
  activePlayerId: string;
  revealedFromPlayerId: string;
  forcedTargetPlayerId?: string | null;
  forcedTargetPlayerName?: string | null;
}

interface LobbyStateDto {
  lobbyCode: string;
  name: string;
  state: LobbyStateName;
  createdByPlayerId: string;
  rules: {
    variant: GameVariant;
    randomizeCardColors: boolean;
    selectedBombColors?: WireColor[] | null;
  };
  players: Array<{
    id: string;
    name: string;
    remainingWireCount: number;
    isActiveTurnPlayer: boolean;
  }>;
  game?: {
    gameId: string;
    variant: GameVariant;
    currentRound: number;
    roundTurnLimit: number;
    turnsTakenInRound: number;
    maxRounds: number;
    activePlayerId: string;
    isRoundPreparation: boolean;
    readyPlayerIds: string[];
    forcedTargetPlayerIdForNextTurn?: string | null;
    forcedTargetPlayerNameForNextTurn?: string | null;
    revealedDefuseWireCount: number;
    revealedBombsByColor: Record<WireColor, number>;
    defusedColors: WireColor[];
    selectedBombColors: WireColor[];
    pendingDecision?: {
      type: PendingDecisionType;
      requestedByPlayerId: string;
      availableColors: WireColor[];
    } | null;
    revealedWires: RevealedWire[];
    recentEffectCue?: RecentEffectCue | null;
    revealedPileTotalsByPlayer?: Record<string, number> | null;
    outcome: {
      winner?: "Sherlock" | "Moriarty" | null;
      reason:
        | "None"
        | "BombExploded"
        | "DefuseObjectiveComplete"
        | "RoundLimitReached";
      isComplete: boolean;
    };
  } | null;
}

interface PlayerPrivateStateDto {
  lobbyCode: string;
  playerId: string;
  team?: "Sherlock" | "Moriarty" | null;
  isRoundPreparation: boolean;
  isReadyForRound: boolean;
  visibleHand: Array<{
    kind: WireKind;
    color?: WireColor | null;
  }>;
}

function App() {
  const [playerName, setPlayerName] = useState(
    () => sessionStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? "",
  );
  const [playerId] = useState(() => {
    const existing = sessionStorage.getItem(PLAYER_ID_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const generated = crypto.randomUUID().replace(/-/g, "");
    sessionStorage.setItem(PLAYER_ID_STORAGE_KEY, generated);
    return generated;
  });
  const [mode, setMode] = useState<LobbyMode>("create");
  const [lobbyName, setLobbyName] = useState("");
  const [lobbyCode, setLobbyCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLobby, setCurrentLobby] = useState<LobbyResponse | null>(null);
  const [liveLobby, setLiveLobby] = useState<LobbyStateDto | null>(null);
  const [privateState, setPrivateState] =
    useState<PlayerPrivateStateDto | null>(null);
  const [rulesDraft, setRulesDraft] = useState<{
    variant: GameVariant;
    randomizeCardColors: boolean;
    selectedBombColors?: WireColor[] | null;
  } | null>(null);
  const [hubReady, setHubReady] = useState(false);
  const [selectedPendingDecisionColor, setSelectedPendingDecisionColor] =
    useState<WireColor | null>(null);
  const hubRef = useRef<HubConnection | null>(null);

  const activeLobby = liveLobby;
  const displayedPlayers =
    activeLobby?.players ??
    currentLobby?.players.map((player) => ({
      ...player,
      remainingWireCount: 0,
      isActiveTurnPlayer: false,
    })) ??
    [];
  const isCreator = activeLobby?.createdByPlayerId === playerId;
  const activeGame = activeLobby?.game ?? null;
  const selectedColorCount = rulesDraft?.selectedBombColors?.length ?? 0;
  const requiredColorCount = displayedPlayers.length;
  const isMyTurn = activeGame?.activePlayerId === playerId;
  const pendingDecision = activeGame?.pendingDecision ?? null;
  const isRoundPreparation = !!activeGame?.isRoundPreparation;
  const isReadyForRound = !!privateState?.isReadyForRound;
  const canReveal =
    activeLobby?.state === "InProgress" &&
    isMyTurn &&
    !isRoundPreparation &&
    !pendingDecision &&
    !busy;
  const activeTurnPlayerName = activeGame
    ? displayedPlayers.find((player) => player.id === activeGame.activePlayerId)
        ?.name ?? activeGame.activePlayerId
    : "Unknown player";
  const isPendingDecisionRequester =
    pendingDecision?.requestedByPlayerId === playerId;
  const pendingDecisionRequesterName = pendingDecision
    ? displayedPlayers.find(
        (player) => player.id === pendingDecision.requestedByPlayerId,
      )?.name ?? pendingDecision.requestedByPlayerId
    : "active player";
  const recentEffectWire =
    activeGame?.revealedWires
      .slice()
      .reverse()
      .find((wire) => wire.effect && wire.effect.trim().length > 0) ?? null;
  const effectCue: RecentEffectCue | null =
    activeGame?.recentEffectCue ??
    (recentEffectWire?.effect
      ? {
          round: recentEffectWire.round,
          turn: recentEffectWire.turn,
          effect: recentEffectWire.effect,
          activePlayerId: recentEffectWire.activePlayerId,
          revealedFromPlayerId: recentEffectWire.revealedFromPlayerId,
          forcedTargetPlayerId: recentEffectWire.forcedTargetPlayerId,
          forcedTargetPlayerName: recentEffectWire.forcedTargetPlayerName,
        }
      : null);
  const effectActivePlayerName = effectCue
    ? displayedPlayers.find((player) => player.id === effectCue.activePlayerId)
        ?.name ?? effectCue.activePlayerId
    : null;
  const effectRevealedFromPlayerName = effectCue
    ? displayedPlayers.find(
        (player) => player.id === effectCue.revealedFromPlayerId,
      )?.name ?? effectCue.revealedFromPlayerId
    : null;
  const effectForcedTargetName = effectCue?.forcedTargetPlayerName
    ? effectCue.forcedTargetPlayerName
    : effectCue?.forcedTargetPlayerId
      ? displayedPlayers.find(
          (player) => player.id === effectCue.forcedTargetPlayerId,
        )?.name ?? effectCue.forcedTargetPlayerId
      : null;

  const refreshPrivateState = async (lobbyCode: string) => {
    if (!hubRef.current) {
      return;
    }

    try {
      const state = (await hubRef.current.invoke(
        "RequestPrivateState",
        lobbyCode,
        playerId,
      )) as PlayerPrivateStateDto;
      setPrivateState(state);
    } catch {
      setPrivateState(null);
    }
  };

  useEffect(() => {
    sessionStorage.setItem(PLAYER_NAME_STORAGE_KEY, playerName);
  }, [playerName]);

  useEffect(() => {
    if (!currentLobby) {
      setHubReady(false);
      setLiveLobby(null);
      setPrivateState(null);
      return;
    }

    const lobbyCode = currentLobby.lobbyCode;
    const connection = new HubConnectionBuilder()
      .withUrl("/hubs/game")
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    hubRef.current = connection;

    connection.on("LobbyStateUpdated", (state: LobbyStateDto) => {
      setLiveLobby(state);
      setError(null);
      void refreshPrivateState(state.lobbyCode);
    });

    connection.on("WireRevealed", () => {});

    connection.on("WireResolved", () => {});

    connection.onreconnected(async () => {
      try {
        await connection.invoke("JoinLobbyChannel", lobbyCode);
        await refreshPrivateState(lobbyCode);
      } catch {
        setError("Reconnected but failed to rejoin lobby channel.");
      }
    });

    connection
      .start()
      .then(async () => {
        await connection.invoke("JoinLobbyChannel", lobbyCode);
        await refreshPrivateState(lobbyCode);
        setHubReady(true);
      })
      .catch(() => {
        setHubReady(false);
        setError("Unable to connect to game server.");
      });

    return () => {
      setHubReady(false);
      setLiveLobby(null);
      setPrivateState(null);
      connection.off("LobbyStateUpdated");
      connection.off("WireRevealed");
      connection.off("WireResolved");
      void connection.stop();
      if (hubRef.current === connection) {
        hubRef.current = null;
      }
    };
  }, [currentLobby?.lobbyCode]);

  useEffect(() => {
    if (!activeLobby) {
      setRulesDraft(null);
      return;
    }

    setRulesDraft(activeLobby.rules);
  }, [
    activeLobby?.lobbyCode,
    activeLobby?.rules.variant,
    activeLobby?.rules.randomizeCardColors,
    activeLobby?.rules.selectedBombColors,
  ]);

  useEffect(() => {
    if (!pendingDecision) {
      setSelectedPendingDecisionColor(null);
      return;
    }

    setSelectedPendingDecisionColor((currentSelection) =>
      currentSelection &&
      pendingDecision.availableColors.includes(currentSelection)
        ? currentSelection
        : null,
    );
  }, [pendingDecision]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (!playerName.trim()) {
      setError("Player name is required.");
      return;
    }

    if (mode === "join" && !lobbyCode.trim()) {
      setError("Lobby code is required when joining.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response =
        mode === "create"
          ? await fetch("/api/lobby", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lobbyName: lobbyName.trim() || "New Lobby",
                playerName: playerName.trim(),
                playerId,
              }),
            })
          : await fetch(`/api/lobby/${lobbyCode.trim()}/join`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                playerName: playerName.trim(),
                playerId,
              }),
            });

      if (!response.ok) {
        const problem = await response.json().catch(() => null);
        const detail =
          typeof problem?.detail === "string"
            ? problem.detail
            : `Request failed with status ${response.status}`;
        throw new Error(detail);
      }

      const data = (await response.json()) as LobbyResponse;
      setCurrentLobby(data);
    } catch (err) {
      setCurrentLobby(null);
      setError(
        err instanceof Error ? err.message : "Unable to complete request.",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveRules = async () => {
    if (!currentLobby || !rulesDraft || !isCreator) {
      return;
    }

    if (
      !rulesDraft.randomizeCardColors &&
      selectedColorCount !== requiredColorCount
    ) {
      setError(
        `Select exactly ${requiredColorCount} colors when randomization is disabled.`,
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/lobby/${currentLobby.lobbyCode}/rules`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId,
            variant: rulesDraft.variant,
            randomizeCardColors: rulesDraft.randomizeCardColors,
            selectedBombColors: rulesDraft.selectedBombColors,
          }),
        },
      );

      if (!response.ok) {
        const problem = await response.json().catch(() => null);
        const detail =
          typeof problem?.detail === "string"
            ? problem.detail
            : `Request failed with status ${response.status}`;
        throw new Error(detail);
      }

      await hubRef.current?.invoke("RequestLobbyState", currentLobby.lobbyCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save rules.");
    } finally {
      setBusy(false);
    }
  };

  const toggleSelectedBombColor = (color: WireColor) => {
    if (!rulesDraft) {
      return;
    }

    const current = new Set(rulesDraft.selectedBombColors ?? []);
    if (current.has(color)) {
      current.delete(color);
    } else {
      if (current.size >= requiredColorCount) {
        return;
      }

      current.add(color);
    }

    setRulesDraft({
      ...rulesDraft,
      selectedBombColors: Array.from(current),
    });
  };

  const startGame = async () => {
    if (!currentLobby || !isCreator) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await hubRef.current?.invoke(
        "StartGame",
        currentLobby.lobbyCode,
        playerId,
      );
      await refreshPrivateState(currentLobby.lobbyCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start game.");
    } finally {
      setBusy(false);
    }
  };

  const revealWire = async (targetPlayerId: string) => {
    if (!currentLobby) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await hubRef.current?.invoke(
        "RevealWire",
        currentLobby.lobbyCode,
        playerId,
        targetPlayerId,
      );
      await refreshPrivateState(currentLobby.lobbyCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reveal wire.");
    } finally {
      setBusy(false);
    }
  };

  const resolvePendingDecision = async (selectedColor: WireColor) => {
    if (!currentLobby) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await hubRef.current?.invoke(
        "ResolvePendingDecision",
        currentLobby.lobbyCode,
        playerId,
        selectedColor,
      );
      await refreshPrivateState(currentLobby.lobbyCode);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to resolve pending decision.",
      );
    } finally {
      setBusy(false);
    }
  };

  const submitPendingDecision = async () => {
    if (!selectedPendingDecisionColor) {
      return;
    }

    await resolvePendingDecision(selectedPendingDecisionColor);
  };

  const markRoundReady = async () => {
    if (!currentLobby) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await hubRef.current?.invoke(
        "MarkRoundReady",
        currentLobby.lobbyCode,
        playerId,
      );
      await refreshPrivateState(currentLobby.lobbyCode);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to mark ready for round.",
      );
    } finally {
      setBusy(false);
    }
  };

  const leaveLobby = async () => {
    if (!currentLobby) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/lobby/${currentLobby.lobbyCode}/leave`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId }),
        },
      );

      if (!response.ok && response.status !== 204) {
        const problem = await response.json().catch(() => null);
        const detail =
          typeof problem?.detail === "string"
            ? problem.detail
            : `Request failed with status ${response.status}`;
        throw new Error(detail);
      }

      try {
        await hubRef.current?.invoke(
          "LeaveLobbyChannel",
          currentLobby.lobbyCode,
        );
      } catch {
        // Channel leave is best effort because HTTP leave already completed.
      }

      setCurrentLobby(null);
      setLiveLobby(null);
      setPrivateState(null);
      setRulesDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to leave lobby.");
    } finally {
      setBusy(false);
    }
  };

  if (currentLobby) {
    return (
      <div className="app">
        <main className="card lobby-card" aria-label="Lobby screen">
          <h1>{activeLobby?.name ?? currentLobby.name}</h1>
          <p className="subtle lobby-meta">
            <strong>Lobby code:</strong> {currentLobby.lobbyCode}
          </p>
          <p className="subtle lobby-meta">
            <strong>State:</strong> {activeLobby?.state ?? currentLobby.state}
          </p>
          <p className="subtle lobby-meta">
            <strong>Creator:</strong>{" "}
            {displayedPlayers.find(
              (player) =>
                player.id ===
                (activeLobby?.createdByPlayerId ??
                  currentLobby.createdByPlayerId),
            )?.name ?? "Unknown"}
          </p>

          {!hubReady && (
            <p className="subtle lobby-meta">Connecting to game channel...</p>
          )}

          {activeLobby?.state === "InProgress" && activeGame && (
            <TurnStateProminence
              isMyTurn={isMyTurn}
              round={activeGame.currentRound}
              maxRounds={activeGame.maxRounds}
              turnsTakenInRound={activeGame.turnsTakenInRound}
              roundTurnLimit={activeGame.roundTurnLimit}
              activePlayerName={activeTurnPlayerName}
              isRoundPreparation={isRoundPreparation}
            />
          )}

          {privateState?.team && (
            <section className="result team-panel">
              <p>
                <strong>Your team:</strong> {privateState.team}
              </p>
            </section>
          )}

          {activeLobby?.state === "Lobby" && (
            <section className="result players-panel">
              <p>
                <strong>
                  Players ({(activeLobby?.players ?? currentLobby.players).length}
                  ):
                </strong>
              </p>
              <PlayerStatusCards
                players={displayedPlayers}
                currentPlayerId={playerId}
                forcedTargetPlayerId={activeGame?.forcedTargetPlayerIdForNextTurn}
                showWireCounts={false}
                circularLayout={false}
              />
            </section>
          )}

          {activeLobby?.state === "Lobby" && rulesDraft && (
            <section className="result rules-panel">
              <p>
                <strong>Game rules</strong>
              </p>
              <label htmlFor="variant">Variant</label>
              <select
                id="variant"
                value={rulesDraft.variant}
                onChange={(event) =>
                  setRulesDraft({
                    ...rulesDraft,
                    variant: event.target.value as GameVariant,
                  })
                }
                disabled={!isCreator || busy}
              >
                <option value="Standard">Standard</option>
                <option value="Evolution">Evolution</option>
              </select>

              <label className="check-row" htmlFor="randomize">
                <input
                  id="randomize"
                  type="checkbox"
                  checked={rulesDraft.randomizeCardColors}
                  onChange={(event) =>
                    setRulesDraft({
                      ...rulesDraft,
                      randomizeCardColors: event.target.checked,
                    })
                  }
                  disabled={!isCreator || busy}
                />
                Randomize card colour selection
              </label>

              {!rulesDraft.randomizeCardColors && (
                <>
                  <p className="subtle">
                    Select exactly {requiredColorCount} colors (
                    {selectedColorCount}/{requiredColorCount})
                  </p>
                  <div className="action-row">
                    {ALL_WIRE_COLORS.map((color) => {
                      const isSelected = (
                        rulesDraft.selectedBombColors ?? []
                      ).includes(color);
                      const wouldExceed =
                        !isSelected && selectedColorCount >= requiredColorCount;

                      return (
                        <button
                          key={color}
                          type="button"
                          className={
                            isSelected ? "mode-button active" : "mode-button"
                          }
                          disabled={!isCreator || busy || wouldExceed}
                          onClick={() => toggleSelectedBombColor(color)}
                        >
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {isCreator ? (
                <button
                  type="button"
                  className="submit-button"
                  onClick={saveRules}
                  disabled={busy || !hubReady}
                >
                  Save rules
                </button>
              ) : (
                <p className="subtle">Only the creator can change rules.</p>
              )}
            </section>
          )}

          {activeLobby?.state === "Lobby" && isCreator ? (
            <button
              type="button"
              className="submit-button"
              onClick={startGame}
              disabled={busy || !hubReady}
            >
              Start game
            </button>
          ) : activeLobby?.state === "Lobby" ? (
            <p className="subtle">Only the creator can start the game.</p>
          ) : null}

          {activeGame && (
            <section className="result game-panel">
              {/* Main Table Surface - Primary gameplay area */}
              <div className="table-surface">
                <div className="table-surface-inner">
                  <PlayerStatusCards
                    players={displayedPlayers}
                    currentPlayerId={playerId}
                    forcedTargetPlayerId={activeGame?.forcedTargetPlayerIdForNextTurn}
                    showWireCounts={true}
                    circularLayout={true}
                    showCutButtons={!pendingDecision && !isRoundPreparation}
                    onCutPlayer={revealWire}
                    canCut={canReveal}
                  />

                  {/* Recent revealed cards on table */}
                  {activeGame.revealedWires.length > 0 && (
                    <div className="table-revealed-cards">
                      <p className="table-revealed-label">Recent reveals:</p>
                      <div className="table-revealed-row">
                        {activeGame.revealedWires
                          .slice(-3)
                          .reverse()
                          .map((wire, index) => (
                            <div
                              key={`${wire.round}-${wire.turn}`}
                              className={`table-revealed-card${index === 0 ? " is-latest" : ""}`}
                            >
                              <WireVisualCard
                                kind={wire.card.kind}
                                color={wire.card.color}
                                subtitle={`R${wire.round} T${wire.turn}`}
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Player hand on table during prep or active play */}
                  {(privateState?.visibleHand ?? []).length > 0 && (
                    <div className={`table-player-hand${isRoundPreparation ? " is-prep-phase" : ""}`}>
                      <p className="table-hand-label">
                        {isRoundPreparation ? "Your hand (before shuffle):" : "Your hand:"}
                      </p>
                      <ul
                        className={`table-hand-fan${isReadyForRound && isRoundPreparation ? " is-round-ready" : ""}`}
                      >
                        {(privateState?.visibleHand ?? []).map((card, index) => (
                          <li
                            key={`${card.kind}-${card.color ?? "none"}-${index}`}
                            className="table-hand-card-item"
                            style={{ "--fan-index": index } as CSSProperties}
                          >
                            <WireVisualCard
                              kind={card.kind}
                              color={card.color}
                              subtitle={`Card ${index + 1}`}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Game stats - moved below table */}
              <div className="game-stat-grid">
                <article className="game-stat-card">
                  <p className="game-stat-label">Round</p>
                  <p className="game-stat-value">
                    {activeGame.currentRound} / {activeGame.maxRounds}
                  </p>
                </article>
                <article className="game-stat-card">
                  <p className="game-stat-label">Turns this round</p>
                  <p className="game-stat-value">
                    {activeGame.turnsTakenInRound} / {activeGame.roundTurnLimit}
                  </p>
                </article>
                <article className="game-stat-card">
                  <p className="game-stat-label">Defuse revealed</p>
                  <p className="game-stat-value">
                    {activeGame.revealedDefuseWireCount}
                  </p>
                </article>
                <article className="game-stat-card">
                  <p className="game-stat-label">Defused colors</p>
                  {activeGame.defusedColors.length > 0 ? (
                    <div className="game-stat-chip-row">
                      {activeGame.defusedColors.map((color) => (
                        <span key={color} className="game-stat-chip">
                          {color}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="game-stat-muted">None yet</p>
                  )}
                </article>
              </div>

              {activeGame.outcome.isComplete ? (
                <p>
                  <strong>Winner:</strong> {activeGame.outcome.winner} (
                  {activeGame.outcome.reason})
                </p>
              ) : (
                <>
                  {isRoundPreparation ? (
                    <p>
                      <strong>Round phase:</strong> Preparation (
                      {activeGame.readyPlayerIds.length}/
                      {displayedPlayers.length} ready)
                    </p>
                  ) : (
                    <p>
                      <strong>Round phase:</strong> Active turn play
                    </p>
                  )}
                  <p>
                    <strong>Current turn:</strong>{" "}
                    {(activeLobby?.players ?? []).find(
                      (player) => player.id === activeGame.activePlayerId,
                    )?.name ?? activeGame.activePlayerId}
                  </p>
                  {activeGame.forcedTargetPlayerIdForNextTurn && (
                    <p>
                      <strong>Forced target:</strong>{" "}
                      {activeGame.forcedTargetPlayerNameForNextTurn ??
                        displayedPlayers.find(
                          (player) =>
                            player.id ===
                            activeGame.forcedTargetPlayerIdForNextTurn,
                        )?.name ??
                        activeGame.forcedTargetPlayerIdForNextTurn}
                    </p>
                  )}
                </>
              )}

              {effectCue && (
                <section className="result effect-cue-panel" aria-live="polite">
                  <p className="effect-cue-kicker">
                    Effect cue · R{effectCue.round} T{effectCue.turn}
                  </p>
                  <p className="effect-cue-text">{effectCue.effect}</p>
                  <p className="subtle effect-cue-meta">
                    {effectActivePlayerName} cut {effectRevealedFromPlayerName}
                  </p>
                  {effectForcedTargetName && (
                    <p className="subtle effect-cue-meta">
                      Forced target: {effectForcedTargetName}
                    </p>
                  )}
                </section>
              )}
              <RevealedPileTotals
                wires={activeGame.revealedWires}
                players={displayedPlayers}
                totalsByPlayer={activeGame.revealedPileTotalsByPlayer ?? null}
              />

              {isRoundPreparation && (
                <div className="result prep-panel">
                  <p>
                    <strong>Preparation phase (Round {activeGame.currentRound})</strong>
                  </p>
                  <p className="subtle">
                    Review your hand below. When ready, it will be shuffled.
                  </p>
                  <p className="subtle">
                    {activeGame.readyPlayerIds.length} / {displayedPlayers.length} players ready
                  </p>
                  <button
                    type="button"
                    className="submit-button"
                    disabled={busy || !hubReady || isReadyForRound}
                    onClick={markRoundReady}
                  >
                    {isReadyForRound ? "Ready submitted" : "I'm ready"}
                  </button>
                </div>
              )}

              {pendingDecision && (
                <div className="decision-overlay" role="presentation">
                  <section
                    className="result decision-panel"
                    aria-live="assertive"
                    aria-label="Pending decision"
                  >
                    <p className="decision-kicker">Pending decision</p>
                    <p>
                      <strong>
                        {pendingDecision.type === "AssignDefuseColor"
                          ? "Choose a color to defuse"
                          : "Choose a defused color to reactivate"}
                      </strong>
                    </p>
                    <p className="subtle">
                      {isPendingDecisionRequester
                        ? "Select one color and confirm your choice."
                        : `Waiting for ${pendingDecisionRequesterName} to confirm.`}
                    </p>
                    <div className="action-row decision-color-row">
                      {pendingDecision.availableColors.map((color) => {
                        const isSelected = selectedPendingDecisionColor === color;

                        return (
                          <button
                            key={color}
                            type="button"
                            className={`mode-button decision-color-option${isSelected ? " decision-color-selected active" : ""}`}
                            disabled={busy || !isPendingDecisionRequester}
                            onClick={() => setSelectedPendingDecisionColor(color)}
                          >
                            {color}
                          </button>
                        );
                      })}
                    </div>
                    {isPendingDecisionRequester ? (
                      <>
                        <p className="subtle decision-selection-status">
                          {selectedPendingDecisionColor
                            ? `Selected: ${selectedPendingDecisionColor}`
                            : "No color selected yet."}
                        </p>
                        <button
                          type="button"
                          className="submit-button decision-submit"
                          disabled={busy || !selectedPendingDecisionColor}
                          onClick={submitPendingDecision}
                        >
                          {busy
                            ? "Submitting..."
                            : selectedPendingDecisionColor
                              ? `Confirm ${selectedPendingDecisionColor}`
                              : "Confirm selection"}
                        </button>
                      </>
                    ) : null}
                  </section>
                </div>
              )}

              <RevealedWireHistory
                wires={activeGame.revealedWires}
                players={displayedPlayers}
              />
            </section>
          )}

            <button
              type="button"
              className="mode-button leave-button"
              onClick={leaveLobby}
              disabled={busy}
            >
            Leave lobby
          </button>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <main className="card setup-card" aria-label="Lobby setup">
        <h1>Time Bomb Lobby</h1>

        <form onSubmit={submit} className="form">
          <label htmlFor="playerName">Player name</label>
          <input
            id="playerName"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Enter your name"
            autoComplete="name"
          />

          <div className="mode-row" role="radiogroup" aria-label="Lobby mode">
            <button
              type="button"
              className={
                mode === "create" ? "mode-button active" : "mode-button"
              }
              onClick={() => setMode("create")}
            >
              Create lobby
            </button>
            <button
              type="button"
              className={mode === "join" ? "mode-button active" : "mode-button"}
              onClick={() => setMode("join")}
            >
              Join lobby
            </button>
          </div>

          {mode === "create" && (
            <>
              <label htmlFor="lobbyName">Lobby name (optional)</label>
              <input
                id="lobbyName"
                value={lobbyName}
                onChange={(event) => setLobbyName(event.target.value)}
                placeholder="New Lobby"
              />
            </>
          )}

          {mode === "join" && (
            <>
              <label htmlFor="lobbyCode">Lobby code</label>
              <input
                id="lobbyCode"
                value={lobbyCode}
                onChange={(event) =>
                  setLobbyCode(event.target.value.toUpperCase())
                }
                placeholder="Enter code"
              />
            </>
          )}

          <button type="submit" disabled={busy} className="submit-button">
            {busy
              ? "Working..."
              : mode === "create"
                ? "Create lobby"
                : "Join lobby"}
          </button>
        </form>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}

export default App;
