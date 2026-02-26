import type { Team } from "../types/game";

export interface VictoryScreenProps {
  lobbyName: string;
  winner?: Team | null;
  outcomeReason: "None" | "BombExploded" | "DefuseObjectiveComplete" | "RoundLimitReached";
  myTeam?: Team | null;
  canPlayAgain: boolean;
  canReturnToLobby: boolean;
  hubReady: boolean;
  busy: boolean;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
  onLeaveLobby: () => void;
}

const OUTCOME_REASON_COPY: Record<VictoryScreenProps["outcomeReason"], string> = {
  None: "The game has concluded.",
  BombExploded: "A bomb wire detonated and ended the mission.",
  DefuseObjectiveComplete: "All required defuse objectives were completed.",
  RoundLimitReached: "The round limit was reached before defusing all objectives.",
};

export function VictoryScreen({
  lobbyName,
  winner,
  outcomeReason,
  myTeam,
  canPlayAgain,
  canReturnToLobby,
  hubReady,
  busy,
  onPlayAgain,
  onReturnToLobby,
  onLeaveLobby,
}: VictoryScreenProps) {
  const resolvedWinner =
    outcomeReason === "DefuseObjectiveComplete"
      ? "Sherlock"
      : outcomeReason === "BombExploded" || outcomeReason === "RoundLimitReached"
        ? "Moriarty"
        : winner ?? null;
  const hasWinner = !!resolvedWinner;
  const isMyTeamWinner = hasWinner && myTeam === resolvedWinner;

  return (
    <main className="card game-screen-card victory-screen-card" aria-label="Victory screen">
      <header className="game-screen-header">
        <div className="game-screen-title-group">
          <h1>{lobbyName}</h1>
          <p className="subtle">Match complete</p>
        </div>

        <button
          type="button"
          className="mode-button leave-button"
          onClick={onLeaveLobby}
          disabled={busy}
        >
          Leave lobby
        </button>
      </header>

      <section className="result victory-panel" aria-live="polite">
        <p className="victory-kicker">Final result</p>
        <h2 className="victory-title">
          {hasWinner ? `${resolvedWinner} Team Wins` : "No Winning Team"}
        </h2>
        <p className="victory-subtitle">
          {hasWinner
            ? isMyTeamWinner
              ? "Your team won this round."
              : myTeam
                ? "Your team was defeated this round."
                : "A winner has been declared."
            : "No winner was recorded for this game."}
        </p>

        <p className="victory-reason">{OUTCOME_REASON_COPY[outcomeReason]}</p>

        <div className="victory-actions">
          {canReturnToLobby && (
            <button
              type="button"
              className="mode-button"
              onClick={onReturnToLobby}
              disabled={busy || !hubReady}
            >
              Back to lobby
            </button>
          )}
          {canPlayAgain && (
            <button
              type="button"
              className="submit-button"
              onClick={onPlayAgain}
              disabled={busy || !hubReady}
            >
              {busy ? "Starting..." : "Play again"}
            </button>
          )}
        </div>

        {!canReturnToLobby && (
          <p className="subtle victory-host-wait">
            Waiting for lobby host to return everyone to the lobby.
          </p>
        )}
      </section>
    </main>
  );
}