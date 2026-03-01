import type { CSSProperties, ReactNode } from "react";

import "./PlayerStatusCards.css";

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
  onPlayerClick?: (playerId: string) => void;
  clickablePlayerIds?: string[];
  renderTrailingAction?: (player: PlayerSummary) => ReactNode;
  compactHandAnimation?: {
    enabled: boolean;
    readyPlayerIds: string[];
  };
  onPlayerHover?: (playerId: string | null) => void;
  onPlayerCardRef?: (playerId: string, element: HTMLLIElement | null) => void;
}

export function PlayerStatusCards({
  players,
  currentPlayerId,
  forcedTargetPlayerId,
  showWireCounts,
  circularLayout = false,
  onPlayerClick,
  clickablePlayerIds,
  renderTrailingAction,
  compactHandAnimation,
  onPlayerHover,
  onPlayerCardRef,
}: PlayerStatusCardsProps) {
  const clickableSet = new Set(clickablePlayerIds ?? []);
  const readySet = new Set(compactHandAnimation?.readyPlayerIds ?? []);
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
        const isClickable = !!onPlayerClick && clickableSet.has(player.id);
        const showCompactHand = !!compactHandAnimation?.enabled && !isSelf;
        const isReadyForRound = readySet.has(player.id);
        const miniCardCount = Math.max(0, Math.min(player.remainingWireCount, 5));
        const seatStyle = useCircularLayout
          ? ({
              "--seat-index": index,
            } as CSSProperties)
          : undefined;
        const trailingAction = renderTrailingAction?.(player);

        return (
          <li
            key={player.id}
            className={`player-status-card${isActive ? " is-active" : ""}${isForcedTarget ? " is-forced" : ""}${onPlayerClick ? " is-actionable" : ""}${isClickable ? " is-clickable" : ""}${trailingAction ? " has-trailing-action" : ""}`}
            style={seatStyle}
            ref={(element) => {
              onPlayerCardRef?.(player.id, element);
            }}
            onClick={isClickable ? () => onPlayerClick(player.id) : undefined}
            onMouseEnter={
              isClickable
                ? () => {
                    onPlayerHover?.(player.id);
                  }
                : undefined
            }
            onMouseLeave={
              isClickable
                ? () => {
                    onPlayerHover?.(null);
                  }
                : undefined
            }
            onFocus={
              isClickable
                ? () => {
                    onPlayerHover?.(player.id);
                  }
                : undefined
            }
            onBlur={
              isClickable
                ? () => {
                    onPlayerHover?.(null);
                  }
                : undefined
            }
            onKeyDown={
              isClickable
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onPlayerClick(player.id);
                    }
                  }
                : undefined
            }
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : undefined}
            aria-disabled={onPlayerClick && !isClickable ? true : undefined}
          >
            {useCircularLayout && isActive && (
              <span className="player-status-turn-token" aria-hidden="true" />
            )}
            <div className="player-status-body">
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
              {showCompactHand && miniCardCount > 0 && (
                <div
                  className={`player-mini-hand${isReadyForRound ? " is-ready" : " is-dealing"}`}
                  aria-hidden="true"
                >
                  {Array.from({ length: miniCardCount }).map((_, miniIndex) => (
                    <span
                      key={`${player.id}-mini-${miniIndex}`}
                      className="player-mini-hand-card"
                      style={{ "--mini-index": miniIndex } as CSSProperties}
                    />
                  ))}
                </div>
              )}
            </div>
            {trailingAction && (
              <div className="player-status-trailing-action">{trailingAction}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
