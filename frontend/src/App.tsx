import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import { ActiveGameUi } from "./components/ActiveGameUi";
import { GameLobbyUi } from "./components/GameLobbyUi";

const isDevMode = import.meta.env.DEV;
const DevTestGallery = isDevMode
  ? lazy(() => import("./TestGallery").then((module) => ({ default: module.TestGallery })))
  : null;

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
  const [showGallery, setShowGallery] = useState(false);
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
  const visibleHand = privateState?.visibleHand ?? [];
  const canReveal =
    activeLobby?.state === "InProgress" &&
    isMyTurn &&
    !isRoundPreparation &&
    !pendingDecision &&
    !busy;
  const cuttablePlayerIds =
    activeLobby?.state === "InProgress" &&
    activeGame &&
    !pendingDecision &&
    !isRoundPreparation
      ? displayedPlayers
          .filter(
            (player) => player.id !== playerId && player.remainingWireCount > 0,
          )
          .filter(
            (player) =>
              !activeGame.forcedTargetPlayerIdForNextTurn ||
              player.id === activeGame.forcedTargetPlayerIdForNextTurn,
          )
          .map((player) => player.id)
      : [];
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
    if (!isDevMode) {
      setShowGallery(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setShowGallery(params.get("mode") === "gallery");
  }, []);

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

          {privateState?.team && (
            <section className="result team-panel">
              <p>
                <strong>Your team:</strong> {privateState.team}
              </p>
            </section>
          )}

          <GameLobbyUi
            lobbyState={activeLobby?.state ?? currentLobby.state}
            players={displayedPlayers}
            currentPlayerId={playerId}
            rulesDraft={rulesDraft}
            isCreator={isCreator}
            busy={busy}
            hubReady={hubReady}
            requiredColorCount={requiredColorCount}
            selectedColorCount={selectedColorCount}
            allWireColors={ALL_WIRE_COLORS}
            onRulesDraftChange={(nextDraft) => setRulesDraft(nextDraft)}
            onToggleSelectedBombColor={toggleSelectedBombColor}
            onSaveRules={saveRules}
            onStartGame={startGame}
          />

          {activeLobby?.state === "InProgress" && activeGame && (
            <ActiveGameUi
              players={displayedPlayers}
              currentPlayerId={playerId}
              game={activeGame}
              rules={activeLobby.rules}
              myTeam={privateState?.team ?? null}
              isMyTurn={isMyTurn}
              activePlayerName={activeTurnPlayerName}
              canReveal={canReveal}
              busy={busy}
              hubReady={hubReady}
              visibleHand={visibleHand}
              isReadyForRound={isReadyForRound}
              cuttablePlayerIds={cuttablePlayerIds}
              pendingDecision={pendingDecision}
              isPendingDecisionRequester={isPendingDecisionRequester}
              pendingDecisionRequesterName={pendingDecisionRequesterName}
              selectedPendingDecisionColor={selectedPendingDecisionColor}
              onSelectPendingDecisionColor={setSelectedPendingDecisionColor}
              onSubmitPendingDecision={submitPendingDecision}
              onRevealWire={(targetPlayerId) => {
                void revealWire(targetPlayerId);
              }}
              onMarkRoundReady={markRoundReady}
              effectCue={effectCue}
              effectActivePlayerName={effectActivePlayerName}
              effectRevealedFromPlayerName={effectRevealedFromPlayerName}
              effectForcedTargetName={effectForcedTargetName}
            />
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

  if (isDevMode && showGallery && DevTestGallery) {
    return (
      <Suspense fallback={<div className="app" />}>
        <DevTestGallery />
      </Suspense>
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
