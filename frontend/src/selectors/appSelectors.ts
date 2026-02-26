import type { ActiveGameUiProps } from "../components/ActiveGameUi";
import type { GameScreenProps } from "../components/GameScreen";
import type { LobbyScreenProps } from "../components/LobbyScreen";
import type { VictoryScreenProps } from "../components/VictoryScreen";
import type { GameActions } from "../hooks/useGameActions";
import type { LobbySession } from "../hooks/useLobbySession";
import { ALL_WIRE_COLORS } from "../types/game";

export const selectLobbyScreenProps = (
  session: LobbySession,
  actions: GameActions,
  isDevMode: boolean,
): LobbyScreenProps => ({
  lobbyName: session.activeLobby?.name ?? session.currentLobby?.name ?? "",
  lobbyCode: session.currentLobby?.lobbyCode ?? "",
  lobbyState: session.activeLobby?.state ?? session.currentLobby?.state ?? "Lobby",
  creatorName: session.creatorName,
  players: session.displayedPlayers,
  currentPlayerId: session.playerId,
  rulesDraft: session.rulesDraft,
  isCreator: session.isCreator,
  busy: session.busy,
  hubReady: session.hubReady,
  myTeam: session.privateState?.team ?? null,
  requiredColorCount: session.requiredColorCount,
  selectedColorCount: session.selectedColorCount,
  allWireColors: ALL_WIRE_COLORS,
  onRulesDraftChange: (nextDraft) => {
    session.setRulesDraft(nextDraft);
    void actions.saveRules(nextDraft, true);
  },
  onToggleSelectedBombColor: actions.toggleSelectedBombColor,
  onStartGame: () => {
    void actions.startGame();
  },
  onLeaveLobby: () => {
    void actions.leaveLobby();
  },
  showDebugSpawnButton:
    isDevMode &&
    session.isCreator &&
    (session.activeLobby?.state ?? session.currentLobby?.state) === "Lobby",
  onDebugSpawnPlayers: () => {
    void actions.spawnDebugPlayers();
  },
  error: session.error,
});

export const selectActiveGameUiProps = (
  session: LobbySession,
  actions: GameActions,
): ActiveGameUiProps | null => {
  if (!(session.activeLobby?.state === "InProgress" && session.activeGame)) {
    return null;
  }

  return {
    players: session.displayedPlayers,
    currentPlayerId: session.playerId,
    game: session.activeGame,
    rules: session.activeLobby.rules,
    myTeam: session.privateState?.team ?? null,
    isMyTurn: session.isMyTurn,
    activePlayerName: session.activeTurnPlayerName,
    canReveal: session.canReveal,
    busy: session.busy,
    hubReady: session.hubReady,
    visibleHand: session.visibleHand,
    isReadyForRound: session.isReadyForRound,
    cuttablePlayerIds: session.cuttablePlayerIds,
    pendingDecision: session.pendingDecision,
    isPendingDecisionRequester: session.isPendingDecisionRequester,
    pendingDecisionRequesterName: session.pendingDecisionRequesterName,
    selectedPendingDecisionColor: session.selectedPendingDecisionColor,
    onSelectPendingDecisionColor: session.setSelectedPendingDecisionColor,
    onSubmitPendingDecision: () => {
      void actions.submitPendingDecision();
    },
    onRevealWire: (targetPlayerId) => {
      void actions.revealWire(targetPlayerId);
    },
    onMarkRoundReady: () => {
      void actions.markRoundReady();
    },
    effectCue: session.effectCue,
    effectActivePlayerName: session.effectActivePlayerName,
    effectRevealedFromPlayerName: session.effectRevealedFromPlayerName,
    effectForcedTargetName: session.effectForcedTargetName,
    showHandToggleButton: false,
  };
};

export const selectGameScreenProps = (
  session: LobbySession,
  actions: GameActions,
  activeGameUiProps: ActiveGameUiProps,
): GameScreenProps => ({
  lobbyName: session.activeLobby?.name ?? session.currentLobby?.name ?? "",
  hubReady: session.hubReady,
  busy: session.busy,
  error: session.error,
  onLeaveLobby: () => {
    void actions.leaveLobby();
  },
  activeGameUiProps,
});

export const selectVictoryScreenProps = (
  session: LobbySession,
  actions: GameActions,
): VictoryScreenProps | null => {
  if (!session.activeGame?.outcome.isComplete) {
    return null;
  }

  return {
    lobbyName: session.activeLobby?.name ?? session.currentLobby?.name ?? "",
    winner: session.activeGame.outcome.winner,
    outcomeReason: session.activeGame.outcome.reason,
    myTeam: session.privateState?.team ?? null,
    canPlayAgain: session.isCreator,
    canReturnToLobby: session.isCreator,
    hubReady: session.hubReady,
    busy: session.busy,
    onPlayAgain: () => {
      void actions.startGame();
    },
    onReturnToLobby: () => {
      void actions.returnToLobby();
    },
    onLeaveLobby: () => {
      void actions.leaveLobby();
    },
  };
};
