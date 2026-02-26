import { PlayerStatusCards } from "./PlayerStatusCards";

import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  GameVariant,
  LobbyStateName,
  PlayerSummary,
  RulesDraft,
  WireColor,
} from "../types/game";

export type { LobbyStateName, PlayerSummary, RulesDraft, WireColor };

interface GameLobbyUiProps {
  lobbyState: LobbyStateName;
  players: PlayerSummary[];
  currentPlayerId: string;
  rulesDraft: RulesDraft | null;
  isCreator: boolean;
  busy: boolean;
  hubReady: boolean;
  requiredColorCount: number;
  selectedColorCount: number;
  allWireColors: WireColor[];
  onRulesDraftChange: (nextDraft: RulesDraft) => void;
  onToggleSelectedBombColor: (color: WireColor) => void;
  onKickPlayer: (playerId: string) => void;
  onStartGame: () => void;
}

export function GameLobbyUi({
  lobbyState,
  players,
  currentPlayerId,
  rulesDraft,
  isCreator,
  busy,
  hubReady,
  requiredColorCount,
  selectedColorCount,
  allWireColors,
  onRulesDraftChange,
  onToggleSelectedBombColor,
  onKickPlayer,
  onStartGame,
}: GameLobbyUiProps) {
  const [variantDisclaimer, setVariantDisclaimer] = useState<string | null>(null);
  const [isRulesViewerOpen, setIsRulesViewerOpen] = useState(false);
  const [rulesMarkdown, setRulesMarkdown] = useState<string | null>(null);
  const [rulesMarkdownLoading, setRulesMarkdownLoading] = useState(false);
  const [rulesMarkdownError, setRulesMarkdownError] = useState<string | null>(null);
  const canKickPlayers = isCreator && lobbyState === "Lobby";
  const kickablePlayers = players.filter((player) => player.id !== currentPlayerId);
  const hasValidPlayerCount = players.length >= 4 && players.length <= 6;
  const rulesVariantSlug = rulesDraft?.variant.toLowerCase();
  const rulesMarkdownPath = rulesVariantSlug
    ? `/rules/${rulesVariantSlug}-game-rules.md`
    : null;

  useEffect(() => {
    setRulesMarkdown(null);
    setRulesMarkdownError(null);
  }, [rulesVariantSlug]);

  useEffect(() => {
    if (!isRulesViewerOpen || !rulesMarkdownPath) {
      return;
    }

    const controller = new AbortController();
    setRulesMarkdownLoading(true);
    setRulesMarkdownError(null);

    fetch(rulesMarkdownPath, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load rules document.");
        }

        return response.text();
      })
      .then((markdownText) => {
        setRulesMarkdown(markdownText);
      })
      .catch((loadError) => {
        if (controller.signal.aborted) {
          return;
        }

        setRulesMarkdownError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load rules document.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRulesMarkdownLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [isRulesViewerOpen, rulesMarkdownPath]);

  return (
    <>
      {lobbyState !== "InProgress" && (
        <section className="result players-panel">
          <p>
            <strong>Players ({players.length}):</strong>
          </p>
          <PlayerStatusCards
            players={players}
            currentPlayerId={currentPlayerId}
            showWireCounts={false}
            circularLayout={false}
          />
          {canKickPlayers && kickablePlayers.length > 0 && (
            <div className="lobby-kick-controls" aria-label="Kick players from lobby">
              {kickablePlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  className="mode-button"
                  disabled={busy}
                  onClick={() => onKickPlayer(player.id)}
                >
                  Kick {player.name}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {lobbyState === "Lobby" && rulesDraft && (
        <section className="result rules-panel">
          <p>
            <strong>Game rules</strong>
          </p>
          <label htmlFor="variant">Variant</label>
          <select
            id="variant"
            value={rulesDraft.variant}
            onChange={(event) => {
              const selectedVariant = event.target.value as GameVariant;

              if (selectedVariant === "Evolution") {
                setVariantDisclaimer(
                  "Evolution variant is currently under development.",
                );
                onRulesDraftChange({
                  ...rulesDraft,
                  variant: "Standard",
                });
                return;
              }

              setVariantDisclaimer(null);
              onRulesDraftChange({
                ...rulesDraft,
                variant: selectedVariant,
              });
            }}
            disabled={!isCreator || busy}
          >
            <option value="Standard">Standard</option>
            <option value="Evolution">Evolution</option>
          </select>

          {variantDisclaimer && <p className="subtle">{variantDisclaimer}</p>}

          <button
            type="button"
            className="mode-button"
            onClick={() => setIsRulesViewerOpen((current) => !current)}
          >
            {isRulesViewerOpen ? "Hide full rules" : "Read full rules"}
          </button>

          {isRulesViewerOpen && (
            <div className="lobby-rules-markdown" aria-label="Rules markdown">
              {rulesMarkdownLoading ? (
                "Loading rules markdown..."
              ) : rulesMarkdownError ? (
                rulesMarkdownError
              ) : (
                <Markdown remarkPlugins={[remarkGfm]}>{rulesMarkdown ?? ""}</Markdown>
              )}
            </div>
          )}

          <label className="check-row" htmlFor="randomize">
            <input
              id="randomize"
              type="checkbox"
              checked={rulesDraft.randomizeCardColors}
              onChange={(event) =>
                onRulesDraftChange({
                  ...rulesDraft,
                  randomizeCardColors: event.target.checked,
                })
              }
              disabled={!isCreator || busy}
            />
            Randomize card colour selection
          </label>

          {!rulesDraft.randomizeCardColors && (
            <>
              <p className="subtle">
                Select exactly {requiredColorCount} colors ({selectedColorCount}/
                {requiredColorCount})
              </p>
              <div className="action-row">
                {allWireColors.map((color) => {
                  const isSelected = (rulesDraft.selectedBombColors ?? []).includes(color);
                  const wouldExceed =
                    !isSelected && selectedColorCount >= requiredColorCount;

                  return (
                    <button
                      key={color}
                      type="button"
                      className={isSelected ? "mode-button active" : "mode-button"}
                      disabled={!isCreator || busy || wouldExceed}
                      onClick={() => onToggleSelectedBombColor(color)}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </>
          )}

        
        </section>
      )}

      {lobbyState === "Lobby" && isCreator ? (
        <>
          <button
            type="button"
            className="submit-button"
            onClick={onStartGame}
            disabled={busy || !hubReady || !hasValidPlayerCount}
          >
            Start game
          </button>
          {!hasValidPlayerCount && (
            <p className="subtle">Game can only start with 4 to 6 players.</p>
          )}
        </>
      ) : lobbyState === "Lobby" ? (
        <p className="subtle">Only the creator can start the game.</p>
      ) : null}
    </>
  );
}