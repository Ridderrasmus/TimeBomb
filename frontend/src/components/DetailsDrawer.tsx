import { useEffect } from "react";

interface DetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lobbyName: string;
  lobbyCode: string;
  creatorName: string;
  variant: "Standard" | "Evolution";
  randomizeCardColors: boolean;
  selectedBombColors?: string[] | null;
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
}: DetailsDrawerProps) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
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
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

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
        </div>
      </aside>
    </>
  );
}
