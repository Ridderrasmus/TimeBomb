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
      <div className="turn-state-layout">
        <div className="turn-state-main">
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
        </div>

        {myTeam && (
          <aside
            className={`turn-state-team-panel ${
              myTeam === "Moriarty"
                ? "turn-state-team-panel-moriarty"
                : "turn-state-team-panel-sherlock"
            }`}
            aria-label={`Your team is ${myTeam}`}
          >
            <p className="turn-state-team-label">Your team:</p>
            <p className="turn-state-team-value">{myTeam}</p>
          </aside>
        )}
      </div>
    </section>
  );
}
