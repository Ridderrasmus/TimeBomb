export type Team = "Sherlock" | "Moriarty";

export type GameVariant = "Standard" | "Evolution";
export type LobbyStateName = "Lobby" | "InProgress" | "Completed";
export type WireKind = "Defuse" | "Bomb";
export type WireColor = "Green" | "Orange" | "Pink" | "Yellow" | "Blue" | "Red";
export type PendingDecisionType = "AssignDefuseColor" | "ReactivateBlueColor";

export const ALL_WIRE_COLORS: WireColor[] = [
  "Green",
  "Orange",
  "Pink",
  "Yellow",
  "Blue",
  "Red",
];

export interface WireCard {
  kind: WireKind;
  color?: WireColor | null;
}

export interface LobbyRules {
  variant: GameVariant;
  randomizeCardColors: boolean;
  selectedBombColors?: WireColor[] | null;
}

export type RulesDraft = LobbyRules;

export interface PlayerResponse {
  id: string;
  name: string;
}

export interface PlayerSummary extends PlayerResponse {
  remainingWireCount: number;
  isActiveTurnPlayer: boolean;
}

export interface RevealedWire {
  round: number;
  turn: number;
  activePlayerId: string;
  revealedFromPlayerId: string;
  card: WireCard;
  defusedColorAssigned?: WireColor | null;
  reactivatedColor?: WireColor | null;
  effect?: string | null;
  forcedTargetPlayerId?: string | null;
  forcedTargetPlayerName?: string | null;
}

export interface RecentEffectCue {
  round: number;
  turn: number;
  effect: string;
  activePlayerId: string;
  revealedFromPlayerId: string;
  forcedTargetPlayerId?: string | null;
  forcedTargetPlayerName?: string | null;
}

export interface PendingDecision {
  type: PendingDecisionType;
  requestedByPlayerId: string;
  availableColors: WireColor[];
}

export interface GameOutcome {
  winner?: Team | null;
  reason: "None" | "BombExploded" | "DefuseObjectiveComplete" | "RoundLimitReached";
  isComplete: boolean;
}

export interface ActiveGameState {
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
  revealedBombsByColor?: Record<WireColor, number>;
  defusedColors: WireColor[];
  selectedBombColors?: WireColor[];
  pendingDecision?: PendingDecision | null;
  revealedWires: RevealedWire[];
  recentEffectCue?: RecentEffectCue | null;
  revealedPileTotalsByPlayer?: Record<string, number> | null;
  outcome: GameOutcome;
}

export interface LobbyResponse {
  id: string;
  lobbyCode: string;
  name: string;
  createdByPlayerId: string;
  state: LobbyStateName;
  rules: LobbyRules;
  players: PlayerResponse[];
}

export interface LobbyStateDto {
  lobbyCode: string;
  name: string;
  state: LobbyStateName;
  createdByPlayerId: string;
  rules: LobbyRules;
  players: PlayerSummary[];
  game?: ActiveGameState | null;
}

export interface PlayerPrivateStateDto {
  lobbyCode: string;
  playerId: string;
  team?: Team | null;
  isRoundPreparation: boolean;
  isReadyForRound: boolean;
  visibleHand: WireCard[];
}