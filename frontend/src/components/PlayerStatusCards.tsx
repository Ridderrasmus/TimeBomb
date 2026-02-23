import type { CSSProperties } from "react";

interface PlayerSummary {
  id: string;
  name: string;
  remainingWireCount: number;
  isActiveTurnPlayer: boolean;
}

interface PlayerStatusCardsProps {
  players: PlayerSummary[];
  currentPlayerId: string;
  forcedTargetPlayerId?: string | null;
  showWireCounts: boolean;
  circularLayout?: boolean;
}

export function PlayerStatusCards({
  players,
  currentPlayerId,
  forcedTargetPlayerId,
  showWireCounts,
  circularLayout = false,
}: PlayerStatusCardsProps) {
  const useCircularLayout = circularLayout && players.length > 2;
  const activeSeatIndex = useCircularLayout
    ? players.findIndex((player) => player.isActiveTurnPlayer)
    : -1;
  const forcedSeatIndex =
    useCircularLayout && forcedTargetPlayerId
      ? players.findIndex((player) => player.id === forcedTargetPlayerId)
      : -1;
  const circularStyle = useCircularLayout
    ? ({
        "--seat-count": players.length,
        "--active-seat-index": activeSeatIndex >= 0 ? activeSeatIndex : 0,
        "--forced-seat-index": forcedSeatIndex >= 0 ? forcedSeatIndex : 0,
      } as CSSProperties)
    : undefined;
  const hasTurnPath = useCircularLayout && activeSeatIndex >= 0;
  const hasForcedPath =
    hasTurnPath && forcedSeatIndex >= 0 && forcedSeatIndex !== activeSeatIndex;

  return (
    <ul
      className={`player-status-grid${useCircularLayout ? " is-circular" : ""}${hasTurnPath ? " has-turn-path" : ""}${hasForcedPath ? " has-forced-path" : ""}`}
      style={circularStyle}
    >
      {players.map((player, index) => {
        const isSelf = player.id === currentPlayerId;
        const isActive = player.isActiveTurnPlayer;
        const isForcedTarget = player.id === forcedTargetPlayerId;
        const seatStyle = useCircularLayout
          ? ({
              "--seat-index": index,
            } as CSSProperties)
          : undefined;

        return (
          <li
            key={player.id}
            className={`player-status-card${isActive ? " is-active" : ""}${isForcedTarget ? " is-forced" : ""}`}
            style={seatStyle}
          >
            {useCircularLayout && isActive && (
              <span className="player-status-turn-token" aria-hidden="true" />
            )}
            <div className="player-status-head">
              <p className="player-status-name">
                {player.name}
                {isSelf ? " (You)" : ""}
              </p>
              <div className="player-status-badges">
                {isActive && <span className="player-status-badge active">Active</span>}
                {isForcedTarget && (
                  <span className="player-status-badge forced">Forced target</span>
                )}
              </div>
            </div>
            {useCircularLayout && (
              <p className="player-status-seat">Seat {index + 1}</p>
            )}
            <p className="player-status-detail">
              {showWireCounts
                ? `${player.remainingWireCount} wire${player.remainingWireCount === 1 ? "" : "s"} remaining`
                : "Waiting in lobby"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
