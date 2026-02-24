import "./TurnStateProminence.css";

interface TurnStateProminenceProps {
  isMyTurn: boolean;
  round: number;
  maxRounds: number;
  turnsTakenInRound: number;
  roundTurnLimit: number;
  activePlayerName: string;
  isRoundPreparation: boolean;
  myTeam?: "Sherlock" | "Moriarty" | null;
}

export function TurnStateProminence({
  isMyTurn,
  round,
  maxRounds,
  turnsTakenInRound,
  roundTurnLimit,
  activePlayerName,
  isRoundPreparation,
  myTeam,
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
      <div className="turn-state-title-row">
        <p className="turn-state-title">
          {isMyTurn ? "You're up now" : `${activePlayerName} is acting`}
        </p>
        {isMyTurn && myTeam && (
          <span
            className={`turn-state-team-chip ${
              myTeam === "Moriarty"
                ? "turn-state-team-chip-moriarty"
                : "turn-state-team-chip-sherlock"
            }`}
          >
            {myTeam}
          </span>
        )}
      </div>
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
