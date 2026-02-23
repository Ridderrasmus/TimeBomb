import { useEffect } from "react";
import { RevealedWireHistory } from "./RevealedWireHistory";

interface RevealedWireHistoryEntry {
  round: number;
  turn: number;
  activePlayerId: string;
  revealedFromPlayerId: string;
  card: {
    kind: string;
    color?: string | null;
  };
  defusedColorAssigned?: string | null;
  reactivatedColor?: string | null;
  effect?: string | null;
}

interface PlayerName {
  id: string;
  name: string;
}

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wires: RevealedWireHistoryEntry[];
  players: PlayerName[];
}

export function HistoryDrawer({ isOpen, onClose, wires, players }: HistoryDrawerProps) {
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
      <aside className="history-drawer" role="dialog" aria-label="Wire history">
        <div className="history-drawer-header">
          <h2>Wire History</h2>
          <button
            type="button"
            className="drawer-close-button"
            onClick={onClose}
            aria-label="Close wire history"
          >
            ✕
          </button>
        </div>
        <div className="history-drawer-content">
          <RevealedWireHistory wires={wires} players={players} />
        </div>
      </aside>
    </>
  );
}
