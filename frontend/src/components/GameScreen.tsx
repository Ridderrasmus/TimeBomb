import { ActiveGameUi } from "./ActiveGameUi";
import type { ActiveGameUiProps } from "./ActiveGameUi";

export interface GameScreenProps {
  lobbyName: string;
  hubReady: boolean;
  busy: boolean;
  error?: string | null;
  onLeaveLobby: () => void;
  activeGameUiProps: ActiveGameUiProps;
}

export function GameScreen({
  lobbyName,
  hubReady,
  busy,
  error,
  onLeaveLobby,
  activeGameUiProps,
}: GameScreenProps) {
  return (
    <main className="card game-screen-card" aria-label="Game screen">
      <header className="game-screen-header">
        <div className="game-screen-title-group">
          <h1>{lobbyName}</h1>
          {!hubReady && <p className="subtle">Connecting to game channel...</p>}
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

      <section className="game-screen-content">
        <ActiveGameUi {...activeGameUiProps} />
      </section>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
