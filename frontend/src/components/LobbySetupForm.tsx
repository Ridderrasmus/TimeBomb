import type { FormEventHandler } from "react";

import type { LobbyMode } from "../hooks/useLobbySession";

export interface LobbySetupFormProps {
  playerName: string;
  lobbyName: string;
  lobbyCode: string;
  mode: LobbyMode;
  busy: boolean;
  error: string | null;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onPlayerNameChange: (value: string) => void;
  onLobbyNameChange: (value: string) => void;
  onLobbyCodeChange: (value: string) => void;
  onModeChange: (mode: LobbyMode) => void;
}

export function LobbySetupForm({
  playerName,
  lobbyName,
  lobbyCode,
  mode,
  busy,
  error,
  onSubmit,
  onPlayerNameChange,
  onLobbyNameChange,
  onLobbyCodeChange,
  onModeChange,
}: LobbySetupFormProps) {
  return (
    <main className="card setup-card" aria-label="Lobby setup">
      <h1>Time Bomb Lobby</h1>

      <form onSubmit={onSubmit} className="form">
        <label htmlFor="playerName">Player name</label>
        <input
          id="playerName"
          value={playerName}
          onChange={(event) => onPlayerNameChange(event.target.value)}
          placeholder="Enter your name"
          autoComplete="name"
        />

        <div className="mode-row" role="radiogroup" aria-label="Lobby mode">
          <button
            type="button"
            className={mode === "create" ? "mode-button active" : "mode-button"}
            onClick={() => onModeChange("create")}
          >
            Create lobby
          </button>
          <button
            type="button"
            className={mode === "join" ? "mode-button active" : "mode-button"}
            onClick={() => onModeChange("join")}
          >
            Join lobby
          </button>
        </div>

        {mode === "create" && (
          <>
            <label htmlFor="lobbyName">Lobby name (optional)</label>
            <input
              id="lobbyName"
              value={lobbyName}
              onChange={(event) => onLobbyNameChange(event.target.value)}
              placeholder="New Lobby"
            />
          </>
        )}

        {mode === "join" && (
          <>
            <label htmlFor="lobbyCode">Lobby code</label>
            <input
              id="lobbyCode"
              value={lobbyCode}
              onChange={(event) => onLobbyCodeChange(event.target.value.toUpperCase())}
              placeholder="Enter code"
            />
          </>
        )}

        <button type="submit" disabled={busy} className="submit-button">
          {busy ? "Working..." : mode === "create" ? "Create lobby" : "Join lobby"}
        </button>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
