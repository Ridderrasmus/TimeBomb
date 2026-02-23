interface TurnStateProminenceProps {
  isMyTurn: boolean;
  round: number;
  maxRounds: number;
  turnsTakenInRound: number;
  roundTurnLimit: number;
  activePlayerName: string;
  isRoundPreparation: boolean;
}

export function TurnStateProminence({
  isMyTurn,
  round,
  maxRounds,
  turnsTakenInRound,
  roundTurnLimit,
  activePlayerName,
  isRoundPreparation,
}: TurnStateProminenceProps) {
  const visibleTurn = Math.min(turnsTakenInRound + 1, roundTurnLimit);

  return (
    <section
      className={
        isMyTurn
          ? "turn-state-panel turn-state-active"
          : "turn-state-panel turn-state-waiting"
      }
      aria-live="polite"
    >
      <p className="turn-state-kicker">{isMyTurn ? "Your move" : "Turn update"}</p>
      <p className="turn-state-title">
        {isMyTurn ? "You're up now" : `${activePlayerName} is acting`}
      </p>
      <div className="turn-state-meta">
        <span>
          Round {round}/{maxRounds}
        </span>
        <span>
          Turn {visibleTurn}/{roundTurnLimit}
        </span>
        <span>{isRoundPreparation ? "Preparation phase" : "Action phase"}</span>
      </div>
    </section>
  );
}
