import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import { GameHubService } from "../services/gameHubService";
import { lobbyApi } from "../services/lobbyApi";
import type {
  LobbyResponse,
  LobbyStateDto,
  PlayerPrivateStateDto,
  RulesDraft,
  WireColor,
} from "../types/game";

const PLAYER_NAME_STORAGE_KEY = "timebomb.playerName";
const PLAYER_ID_STORAGE_KEY = "timebomb.playerId";
const ACTIVE_LOBBY_CODE_STORAGE_KEY = "timebomb.activeLobbyCode";
const isDevMode = import.meta.env.DEV;

const generatePlayerId = () => crypto.randomUUID().replace(/-/g, "");

export type LobbyMode = "create" | "join";

export interface LobbySession {
  playerName: string;
  setPlayerName: Dispatch<SetStateAction<string>>;
  playerId: string;
  regeneratePlayerId: () => void;
  showGallery: boolean;
  mode: LobbyMode;
  setMode: Dispatch<SetStateAction<LobbyMode>>;
  lobbyName: string;
  setLobbyName: Dispatch<SetStateAction<string>>;
  lobbyCode: string;
  setLobbyCode: Dispatch<SetStateAction<string>>;
  busy: boolean;
  setBusy: Dispatch<SetStateAction<boolean>>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  currentLobby: LobbyResponse | null;
  setCurrentLobby: Dispatch<SetStateAction<LobbyResponse | null>>;
  liveLobby: LobbyStateDto | null;
  setLiveLobby: Dispatch<SetStateAction<LobbyStateDto | null>>;
  privateState: PlayerPrivateStateDto | null;
  setPrivateState: Dispatch<SetStateAction<PlayerPrivateStateDto | null>>;
  rulesDraft: RulesDraft | null;
  setRulesDraft: Dispatch<SetStateAction<RulesDraft | null>>;
  hubReady: boolean;
  selectedPendingDecisionColor: WireColor | null;
  setSelectedPendingDecisionColor: Dispatch<SetStateAction<WireColor | null>>;
  hubServiceRef: MutableRefObject<GameHubService | null>;
  refreshPrivateState: (targetLobbyCode: string) => Promise<void>;
  activeLobby: LobbyStateDto | null;
  displayedPlayers: LobbyStateDto["players"];
  isCreator: boolean;
  activeGame: NonNullable<LobbyStateDto["game"]> | null;
  selectedColorCount: number;
  requiredColorCount: number;
  isMyTurn: boolean;
  pendingDecision: NonNullable<NonNullable<LobbyStateDto["game"]>["pendingDecision"]> | null;
  isReadyForRound: boolean;
  visibleHand: PlayerPrivateStateDto["visibleHand"];
  canReveal: boolean;
  cuttablePlayerIds: string[];
  activeTurnPlayerName: string;
  isPendingDecisionRequester: boolean;
  pendingDecisionRequesterName: string;
  effectCue:
    | NonNullable<NonNullable<LobbyStateDto["game"]>["recentEffectCue"]>
    | {
        round: number;
        turn: number;
        effect: string;
        activePlayerId: string;
        revealedFromPlayerId: string;
        forcedTargetPlayerId?: string | null;
        forcedTargetPlayerName?: string | null;
      }
    | null;
  effectActivePlayerName: string | null;
  effectRevealedFromPlayerName: string | null;
  effectForcedTargetName: string | null;
  creatorName: string;
}

export function useLobbySession(): LobbySession {
  const [playerName, setPlayerName] = useState(
    () => sessionStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? "",
  );
  const [playerId, setPlayerId] = useState(() => {
    const existing = sessionStorage.getItem(PLAYER_ID_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const generated = generatePlayerId();
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
  const [rulesDraft, setRulesDraft] = useState<RulesDraft | null>(null);
  const [hubReady, setHubReady] = useState(false);
  const [selectedPendingDecisionColor, setSelectedPendingDecisionColor] =
    useState<WireColor | null>(null);
  const hubServiceRef = useRef<GameHubService | null>(null);
  const hasAttemptedAutoRejoinRef = useRef(false);

  const activeLobby = liveLobby;
  const displayedPlayers =
    activeLobby?.players ??
    currentLobby?.players.map((player) => ({
      ...player,
      remainingWireCount: 0,
      isActiveTurnPlayer: false,
    })) ??
    [];
  const isCreator =
    (activeLobby?.createdByPlayerId ?? currentLobby?.createdByPlayerId) === playerId;
  const activeGame = activeLobby?.game ?? null;
  const selectedColorCount = rulesDraft?.selectedBombColors?.length ?? 0;
  const requiredColorCount = Math.max(4, displayedPlayers.length);
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
  const effectCue =
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
    ? displayedPlayers.find((player) => player.id === effectCue.revealedFromPlayerId)
        ?.name ?? effectCue.revealedFromPlayerId
    : null;
  const effectForcedTargetName = effectCue?.forcedTargetPlayerName
    ? effectCue.forcedTargetPlayerName
    : effectCue?.forcedTargetPlayerId
      ? displayedPlayers.find(
          (player) => player.id === effectCue.forcedTargetPlayerId,
        )?.name ?? effectCue.forcedTargetPlayerId
      : null;
  const creatorName =
    displayedPlayers.find(
      (player) =>
        player.id ===
        (activeLobby?.createdByPlayerId ?? currentLobby?.createdByPlayerId),
    )?.name ?? "Unknown";

  const refreshPrivateState = useCallback(
    async (targetLobbyCode: string) => {
      const hubService = hubServiceRef.current;
      if (!hubService) {
        return;
      }

      try {
        const state = await hubService.requestPrivateState(targetLobbyCode, playerId);
        setPrivateState(state);
      } catch {
        setPrivateState(null);
      }
    },
    [playerId],
  );

  const regeneratePlayerId = useCallback(() => {
    const nextPlayerId = generatePlayerId();
    sessionStorage.setItem(PLAYER_ID_STORAGE_KEY, nextPlayerId);
    setPlayerId(nextPlayerId);
  }, []);

  useEffect(() => {
    sessionStorage.setItem(PLAYER_NAME_STORAGE_KEY, playerName);
  }, [playerName]);

  useEffect(() => {
    if (currentLobby?.lobbyCode) {
      sessionStorage.setItem(ACTIVE_LOBBY_CODE_STORAGE_KEY, currentLobby.lobbyCode);
      return;
    }

    sessionStorage.removeItem(ACTIVE_LOBBY_CODE_STORAGE_KEY);
  }, [currentLobby?.lobbyCode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinLobbyCode = params.get("join")?.trim();

    if (joinLobbyCode) {
      setMode("join");
      setLobbyCode(joinLobbyCode.toUpperCase());
    }

    setShowGallery(isDevMode && params.get("mode") === "gallery");
  }, []);

  useEffect(() => {
    if (hasAttemptedAutoRejoinRef.current || currentLobby) {
      return;
    }

    hasAttemptedAutoRejoinRef.current = true;

    const params = new URLSearchParams(window.location.search);
    if (params.get("join")?.trim()) {
      return;
    }

    const savedLobbyCode = sessionStorage.getItem(ACTIVE_LOBBY_CODE_STORAGE_KEY)?.trim();
    if (!savedLobbyCode || !playerName.trim()) {
      return;
    }

    setBusy(true);
    setError(null);

    void lobbyApi
      .joinLobby(savedLobbyCode, {
        playerName: playerName.trim(),
        playerId,
      })
      .then((lobby) => {
        setCurrentLobby(lobby);
        setMode("join");
        setLobbyCode(savedLobbyCode.toUpperCase());
      })
      .catch(() => {
        sessionStorage.removeItem(ACTIVE_LOBBY_CODE_STORAGE_KEY);
      })
      .finally(() => {
        setBusy(false);
      });
  }, [currentLobby, playerId, playerName]);

  useEffect(() => {
    if (!currentLobby) {
      setHubReady(false);
      setLiveLobby(null);
      setPrivateState(null);
      return;
    }

    const activeLobbyCode = currentLobby.lobbyCode;
    const hubService = new GameHubService();
    hubServiceRef.current = hubService;

    void hubService
      .connect(activeLobbyCode, {
        onLobbyStateUpdated: (state) => {
          const stillInLobby = state.players.some((player) => player.id === playerId);
          if (!stillInLobby) {
            setError("You were removed from the lobby.");
            setCurrentLobby(null);
            setLiveLobby(null);
            setPrivateState(null);
            setRulesDraft(null);
            return;
          }

          setLiveLobby(state);
          setError(null);
          void refreshPrivateState(state.lobbyCode);
        },
        onConnectError: () => {
          setHubReady(false);
          setError("Unable to connect to game server.");
        },
        onReconnectError: () => {
          setError("Reconnected but failed to rejoin lobby channel.");
        },
        onReconnected: async () => {
          await refreshPrivateState(activeLobbyCode);
        },
      })
      .then(async () => {
        await refreshPrivateState(activeLobbyCode);
        setHubReady(true);
      })
      .catch(() => {
        setHubReady(false);
      });

    return () => {
      setHubReady(false);
      setLiveLobby(null);
      setPrivateState(null);
      void hubService.disconnect();
      if (hubServiceRef.current === hubService) {
        hubServiceRef.current = null;
      }
    };
  }, [currentLobby?.lobbyCode, playerId, refreshPrivateState]);

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
      currentSelection && pendingDecision.availableColors.includes(currentSelection)
        ? currentSelection
        : null,
    );
  }, [pendingDecision]);

  return {
    playerName,
    setPlayerName,
    playerId,
    regeneratePlayerId,
    showGallery,
    mode,
    setMode,
    lobbyName,
    setLobbyName,
    lobbyCode,
    setLobbyCode,
    busy,
    setBusy,
    error,
    setError,
    currentLobby,
    setCurrentLobby,
    liveLobby,
    setLiveLobby,
    privateState,
    setPrivateState,
    rulesDraft,
    setRulesDraft,
    hubReady,
    selectedPendingDecisionColor,
    setSelectedPendingDecisionColor,
    hubServiceRef,
    refreshPrivateState,
    activeLobby,
    displayedPlayers,
    isCreator,
    activeGame,
    selectedColorCount,
    requiredColorCount,
    isMyTurn,
    pendingDecision,
    isReadyForRound,
    visibleHand,
    canReveal,
    cuttablePlayerIds,
    activeTurnPlayerName,
    isPendingDecisionRequester,
    pendingDecisionRequesterName,
    effectCue,
    effectActivePlayerName,
    effectRevealedFromPlayerName,
    effectForcedTargetName,
    creatorName,
  };
}
