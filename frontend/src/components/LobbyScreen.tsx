import { useState } from "react";

import type {
  LobbyStateName,
  PlayerSummary,
  RulesDraft,
  WireColor,
} from "../types/game";
import { GameLobbyUi } from "./GameLobbyUi";

export interface LobbyScreenProps {
  lobbyName: string;
  lobbyCode: string;
  lobbyState: LobbyStateName;
  creatorName: string;
  players: PlayerSummary[];
  currentPlayerId: string;
  rulesDraft: RulesDraft | null;
  isCreator: boolean;
  busy: boolean;
  hubReady: boolean;
  myTeam?: "Sherlock" | "Moriarty" | null;
  requiredColorCount: number;
  selectedColorCount: number;
  allWireColors: WireColor[];
  onRulesDraftChange: (nextDraft: RulesDraft) => void;
  onToggleSelectedBombColor: (color: WireColor) => void;
  onKickPlayer: (playerId: string) => void;
  onStartGame: () => void;
  onLeaveLobby: () => void;
  showDebugSpawnButton?: boolean;
  onDebugSpawnPlayers?: () => void;
  error?: string | null;
}

export function LobbyScreen({
  lobbyName,
  lobbyCode,
  lobbyState,
  creatorName,
  players,
  currentPlayerId,
  rulesDraft,
  isCreator,
  busy,
  hubReady,
  myTeam,
  requiredColorCount,
  selectedColorCount,
  allWireColors,
  onRulesDraftChange,
  onToggleSelectedBombColor,
  onKickPlayer,
  onStartGame,
  onLeaveLobby,
  showDebugSpawnButton,
  onDebugSpawnPlayers,
  error,
}: LobbyScreenProps) {
  const [inviteCopyStatus, setInviteCopyStatus] = useState<
    "idle" | "copied" | "failed"
  >("idle");

  const copyInviteLink = async () => {
    const inviteUrl = new URL(window.location.href);
    inviteUrl.searchParams.delete("mode");
    inviteUrl.searchParams.set("join", lobbyCode);

    try {
      await navigator.clipboard.writeText(inviteUrl.toString());
      setInviteCopyStatus("copied");
      window.setTimeout(() => {
        setInviteCopyStatus("idle");
      }, 1600);
    } catch {
      setInviteCopyStatus("failed");
    }
  };

  return (
    <main className="card lobby-card" aria-label="Lobby screen">
      <div className="lobby-header-row">
        <h1>{lobbyName}</h1>
        {showDebugSpawnButton && onDebugSpawnPlayers && (
          <button
            type="button"
            className="lobby-debug-button"
            onClick={onDebugSpawnPlayers}
            disabled={busy}
            title="Add debug users"
          >
            Add debug users
          </button>
        )}
      </div>
      <div className="subtle lobby-meta lobby-code-meta">
        <p>
          <strong>Lobby code:</strong> {lobbyCode}
        </p>
        <button
          type="button"
          className="mode-button lobby-copy-button"
          onClick={() => {
            void copyInviteLink();
          }}
          aria-label="Copy invite link"
          title={
            inviteCopyStatus === "copied"
              ? "Invite link copied"
              : inviteCopyStatus === "failed"
                ? "Copy failed"
                : "Copy invite link"
          }
        >
          {inviteCopyStatus === "copied" ? (
            <svg
              viewBox="0 0 20 20"
              width="16"
              height="16"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 20 20"
              width="16"
              height="16"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M7 3a2 2 0 0 0-2 2v1H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7Zm0 2h7v8h-1V8a2 2 0 0 0-2-2H7V5Zm4 3v8H4V8h7Z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>
      </div>
      <p className="subtle lobby-meta">
        <strong>State:</strong> {lobbyState}
      </p>
      <p className="subtle lobby-meta">
        <strong>Creator:</strong> {creatorName}
      </p>

      {!hubReady && (
        <p className="subtle lobby-meta">Connecting to game channel...</p>
      )}

      {myTeam && (
        <section className="result team-panel">
          <p>
            <strong>Your team:</strong> {myTeam}
          </p>
        </section>
      )}

      <GameLobbyUi
        lobbyState={lobbyState}
        players={players}
        currentPlayerId={currentPlayerId}
        rulesDraft={rulesDraft}
        isCreator={isCreator}
        busy={busy}
        hubReady={hubReady}
        requiredColorCount={requiredColorCount}
        selectedColorCount={selectedColorCount}
        allWireColors={allWireColors}
        onRulesDraftChange={onRulesDraftChange}
        onToggleSelectedBombColor={onToggleSelectedBombColor}
        onKickPlayer={onKickPlayer}
        onStartGame={onStartGame}
      />

      <button
        type="button"
        className="mode-button leave-button"
        onClick={onLeaveLobby}
        disabled={busy}
      >
        Leave lobby
      </button>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}