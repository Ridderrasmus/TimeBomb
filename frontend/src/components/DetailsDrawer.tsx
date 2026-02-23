import { useEffect, useState } from "react";

interface DetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lobbyName: string;
  lobbyCode: string;
  creatorName: string;
  variant: "Standard" | "Evolution";
  randomizeCardColors: boolean;
  selectedBombColors?: string[] | null;
  isCreator: boolean;
  gameState: "Lobby" | "InProgress" | "Completed";
  onRestartGame: () => Promise<void>;
  busy: boolean;
}

export function DetailsDrawer({
  isOpen,
  onClose,
  lobbyName,
  lobbyCode,
  creatorName,
  variant,
  randomizeCardColors,
  selectedBombColors,
  isCreator,
  gameState,
  onRestartGame,
  busy,
}: DetailsDrawerProps) {
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        if (showRestartConfirm) {
          setShowRestartConfirm(false);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, showRestartConfirm]);

  const handleRestartClick = () => {
    setShowRestartConfirm(true);
  };

  const handleConfirmRestart = async () => {
    setShowRestartConfirm(false);
    await onRestartGame();
  };

  const handleCancelRestart = () => {
    setShowRestartConfirm(false);
  };

  if (!isOpen) {
    return null;
  }

  const canRestart = isCreator && (gameState === "InProgress" || gameState === "Completed");

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <aside className="details-drawer" role="dialog" aria-label="Game details">
        <div className="details-drawer-header">
          <h2>Game Details</h2>
          <button
            type="button"
            className="drawer-close-button"
            onClick={onClose}
            aria-label="Close game details"
          >
            ✕
          </button>
        </div>
        <div className="details-drawer-content">
          <section className="detail-section">
            <h3>Lobby Information</h3>
            <dl className="detail-list">
              <dt>Lobby Name</dt>
              <dd>{lobbyName}</dd>
              <dt>Lobby Code</dt>
              <dd className="detail-code">{lobbyCode}</dd>
              <dt>Created By</dt>
              <dd>{creatorName}</dd>
            </dl>
          </section>

          <section className="detail-section">
            <h3>Game Rules</h3>
            <dl className="detail-list">
              <dt>Variant</dt>
              <dd>{variant}</dd>
              <dt>Randomize Card Colors</dt>
              <dd>{randomizeCardColors ? "Yes" : "No"}</dd>
              {selectedBombColors && selectedBombColors.length > 0 && (
                <>
                  <dt>Selected Bomb Colors</dt>
                  <dd>
                    <div className="detail-colors">
                      {selectedBombColors.map((color) => (
                        <span key={color} className="detail-color-badge">
                          {color}
                        </span>
                      ))}
                    </div>
                  </dd>
                </>
              )}
            </dl>
          </section>

          {canRestart && (
            <section className="detail-section">
              <button
                type="button"
                className="restart-game-button"
                onClick={handleRestartClick}
                disabled={busy}
                aria-label="Restart game"
              >
                🔄 Restart Game
              </button>
            </section>
          )}
        </div>
      </aside>

      {showRestartConfirm && (
        <div 
          className="restart-confirm-overlay" 
          onClick={handleCancelRestart}
          aria-hidden="true"
        >
          <div 
            className="restart-confirm-dialog" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="restart-confirm-title"
            aria-describedby="restart-confirm-description"
          >
            <h3 id="restart-confirm-title">Restart Game?</h3>
            <p id="restart-confirm-description">
              This will start a fresh game with the same players and rules. 
              All current game progress will be lost.
            </p>
            <div className="restart-confirm-actions">
              <button
                type="button"
                className="restart-confirm-cancel"
                onClick={handleCancelRestart}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="restart-confirm-confirm"
                onClick={handleConfirmRestart}
                disabled={busy}
              >
                {busy ? "Restarting..." : "Restart Game"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
