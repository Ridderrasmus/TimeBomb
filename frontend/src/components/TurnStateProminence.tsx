interface TurnStateProminenceProps {
  isMyTurn: boolean;
  round: number;
  maxRounds: number;
  turnsTakenInRound: number;
  roundTurnLimit: number;
  activePlayerName: string;
  isRoundPreparation: boolean;
  forcedTargetName?: string | null;
}

export function TurnStateProminence({
  isMyTurn,
  round,
  maxRounds,
  turnsTakenInRound,
  roundTurnLimit,
  activePlayerName,
  isRoundPreparation,
  forcedTargetName,
}: TurnStateProminenceProps) {
  const visibleTurn = Math.min(turnsTakenInRound + 1, roundTurnLimit);
  const phaseLabel = isRoundPreparation ? "Preparation" : "Action";
  const ownerLabel = isMyTurn ? "You" : activePlayerName;
  const targetLabel = forcedTargetName ?? "Open pick";

  return (
    <section
      className={
        isMyTurn
          ? "turn-state-panel turn-state-active"
          : "turn-state-panel turn-state-waiting"
      }
      aria-live="polite"
    >
      <div className="turn-state-header">
        <p className="turn-state-kicker">
          {isMyTurn ? "Your move" : "Turn update"}
        </p>
        <span className="turn-state-phase">{phaseLabel} phase</span>
      </div>
      <p className="turn-state-title">
        {isMyTurn ? "You're up now" : `${activePlayerName} is acting`}
      </p>
      <div className="turn-state-tags">
        <span className="turn-state-tag">Owner: {ownerLabel}</span>
        <span className="turn-state-tag">Target: {targetLabel}</span>
        <span className="turn-state-tag">Phase: {phaseLabel}</span>
      </div>
      <div className="turn-state-meta">
        <span>
          Round {round}/{maxRounds}
        </span>
        <span>
          Turn {visibleTurn}/{roundTurnLimit}
        </span>
      </div>
    </section>
  );
}
