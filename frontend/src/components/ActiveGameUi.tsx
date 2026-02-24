import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  ActiveGameState,
  PendingDecision,
  PlayerSummary,
  RecentEffectCue,
  RulesDraft,
  Team,
  WireCard,
  WireColor,
} from "../types/game";

import "./ActiveGameUi.css";

import { PlayerStatusCards } from "./PlayerStatusCards";
import { RevealedWireHistory } from "./RevealedWireHistory";
import { TurnStateProminence } from "./TurnStateProminence";
import { WireVisualCard } from "./WireVisualCard";

export interface ActiveGameUiProps {
  players: PlayerSummary[];
  currentPlayerId: string;
  game: ActiveGameState;
  rules: RulesDraft;
  myTeam?: Team | null;
  isMyTurn: boolean;
  activePlayerName: string;
  canReveal: boolean;
  busy: boolean;
  hubReady: boolean;
  visibleHand: WireCard[];
  isReadyForRound: boolean;
  cuttablePlayerIds: string[];
  pendingDecision: PendingDecision | null;
  isPendingDecisionRequester: boolean;
  pendingDecisionRequesterName: string;
  selectedPendingDecisionColor: WireColor | null;
  onSelectPendingDecisionColor: (color: WireColor) => void;
  onSubmitPendingDecision: () => void;
  onRevealWire: (targetPlayerId: string) => void;
  onMarkRoundReady: () => void;
  effectCue?: RecentEffectCue | null;
  effectActivePlayerName?: string | null;
  effectRevealedFromPlayerName?: string | null;
  effectForcedTargetName?: string | null;
  showHandToggleButton?: boolean;
}

export function ActiveGameUi({
  players,
  currentPlayerId,
  game,
  rules,
  myTeam,
  isMyTurn,
  activePlayerName,
  canReveal,
  busy,
  hubReady,
  visibleHand,
  isReadyForRound,
  cuttablePlayerIds,
  pendingDecision,
  isPendingDecisionRequester,
  pendingDecisionRequesterName,
  selectedPendingDecisionColor,
  onSelectPendingDecisionColor,
  onSubmitPendingDecision,
  onRevealWire,
  onMarkRoundReady,
  showHandToggleButton = true,
}: ActiveGameUiProps) {
  const [isHandPopupOpen, setIsHandPopupOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isRulesDrawerOpen, setIsRulesDrawerOpen] = useState(false);
  const [isPortalReady, setIsPortalReady] = useState(false);
  const [rulesMarkdown, setRulesMarkdown] = useState<string | null>(null);
  const [rulesMarkdownLoading, setRulesMarkdownLoading] = useState(false);
  const [rulesMarkdownError, setRulesMarkdownError] = useState<string | null>(null);
  const rulesVariantSlug = rules.variant.toLowerCase();
  const rulesMarkdownPath = `/rules/${rulesVariantSlug}-game-rules.md`;

  const canShowHandPopup = game.isRoundPreparation && visibleHand.length > 0;
  const leftSidePlayers = players.filter((_, index) => index % 2 === 0);
  const rightSidePlayers = players.filter((_, index) => index % 2 === 1);
  const activeColorPiles =
    game.selectedBombColors && game.selectedBombColors.length > 0
      ? Array.from(new Set(game.selectedBombColors))
      : rules.selectedBombColors && rules.selectedBombColors.length > 0
        ? Array.from(new Set(rules.selectedBombColors))
        : (["Green", "Orange", "Pink", "Yellow", "Blue", "Red"] as WireColor[]);
  const drawnByColor = activeColorPiles.reduce<Record<WireColor, number>>(
    (acc, color) => {
      acc[color] = game.revealedWires.filter((wire) => wire.card.color === color).length;
      return acc;
    },
    {
      Green: 0,
      Orange: 0,
      Pink: 0,
      Yellow: 0,
      Blue: 0,
      Red: 0,
    },
  );
  const defusePileCount = game.revealedWires.filter(
    (wire) => wire.card.kind === "Defuse",
  ).length;
  const colorPileColumns = activeColorPiles.length <= 4 ? activeColorPiles.length : 3;

  useEffect(() => {
    if (!canShowHandPopup) {
      setIsHandPopupOpen(false);
      return;
    }

    setIsHandPopupOpen(true);
  }, [canShowHandPopup]);

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  useEffect(() => {
    setRulesMarkdown(null);
    setRulesMarkdownError(null);
  }, [rulesVariantSlug]);

  const sideDrawerControls = (
    <>
      {!isRulesDrawerOpen && (
        <button
          type="button"
          className="mode-button side-drawer-toggle left"
          onClick={() => setIsRulesDrawerOpen(true)}
        >
          Game rules
        </button>
      )}
      {isRulesDrawerOpen && (
        <aside className="side-drawer-panel left is-open" aria-label="Game rules">
          <div className="result side-drawer-content">
            <button
              type="button"
              className="mode-button side-drawer-close"
              onClick={() => setIsRulesDrawerOpen(false)}
            >
              Close
            </button>
            <div className="rules-markdown" aria-label="Rules markdown">
              {rulesMarkdownLoading ? (
                "Loading rules markdown…"
              ) : rulesMarkdownError ? (
                rulesMarkdownError
              ) : (
                <Markdown remarkPlugins={[remarkGfm]}>{rulesMarkdown ?? ""}</Markdown>
              )}
            </div>
          </div>
        </aside>
      )}

      {!isHistoryDrawerOpen && (
        <button
          type="button"
          className="mode-button side-drawer-toggle right"
          onClick={() => setIsHistoryDrawerOpen(true)}
        >
          Card history
        </button>
      )}
      {isHistoryDrawerOpen && (
        <aside className="side-drawer-panel right is-open" aria-label="Card history">
          <div className="result side-drawer-content">
            <button
              type="button"
              className="mode-button side-drawer-close"
              onClick={() => setIsHistoryDrawerOpen(false)}
            >
              Close
            </button>
            <RevealedWireHistory wires={game.revealedWires} players={players} />
          </div>
        </aside>
      )}
    </>
  );

  useEffect(() => {
    if (!isRulesDrawerOpen) {
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
  }, [isRulesDrawerOpen, rulesMarkdownPath]);

  return (
    <>
      <TurnStateProminence
        isMyTurn={isMyTurn}
        round={game.currentRound}
        maxRounds={game.maxRounds}
        turnsTakenInRound={game.turnsTakenInRound}
        roundTurnLimit={game.roundTurnLimit}
        activePlayerName={activePlayerName}
        isRoundPreparation={game.isRoundPreparation}
        myTeam={myTeam}
      />

      <section className="result players-panel">
        <p>
          <strong>Players ({players.length}):</strong>
        </p>
        <div className="table-board-layout" aria-label="Game table layout">
          <div className="table-side-column table-side-column-left">
            <PlayerStatusCards
              players={leftSidePlayers}
              currentPlayerId={currentPlayerId}
              forcedTargetPlayerId={game.forcedTargetPlayerIdForNextTurn}
              showWireCounts={true}
              circularLayout={false}
              onPlayerClick={(targetPlayerId) => {
                if (!canReveal || !cuttablePlayerIds.includes(targetPlayerId)) {
                  return;
                }

                onRevealWire(targetPlayerId);
              }}
              clickablePlayerIds={canReveal ? cuttablePlayerIds : []}
            />
          </div>

          <div className="table-pile-center" aria-label="Card piles">
            <div
              className="table-color-piles"
              style={{ "--pile-columns": colorPileColumns } as CSSProperties}
            >
              {activeColorPiles.map((color) => {
                const isDefused = game.defusedColors.includes(color);
                return (
                  <div
                    key={color}
                    className={`table-pile-card table-pile-${color.toLowerCase()}`}
                    title={`${color} pile: ${drawnByColor[color]} cards revealed`}
                    aria-label={`${color} pile, ${drawnByColor[color]} cards revealed`}
                  >
                    {rules.variant === "Evolution" && (
                      <span
                        className={`table-pile-evolution-state${isDefused ? " is-defused" : ""}`}
                        title={
                          isDefused
                            ? `${color} is currently defused`
                            : `${color} is not defused`
                        }
                        aria-label={
                          isDefused
                            ? `${color} is currently defused`
                            : `${color} is not defused`
                        }
                      >
                        {isDefused ? "✓" : "○"}
                      </span>
                    )}
                    <span className="table-pile-count">{drawnByColor[color]}</span>
                  </div>
                );
              })}
            </div>

            <div
              className="table-pile-card table-pile-defuse"
              title={`Defuse pile: ${defusePileCount} defuse cards revealed`}
              aria-label={`Defuse pile, ${defusePileCount} defuse cards revealed`}
            >
              <span className="table-pile-count">{defusePileCount}</span>
            </div>
          </div>

          <div className="table-side-column table-side-column-right">
            <PlayerStatusCards
              players={rightSidePlayers}
              currentPlayerId={currentPlayerId}
              forcedTargetPlayerId={game.forcedTargetPlayerIdForNextTurn}
              showWireCounts={true}
              circularLayout={false}
              onPlayerClick={(targetPlayerId) => {
                if (!canReveal || !cuttablePlayerIds.includes(targetPlayerId)) {
                  return;
                }

                onRevealWire(targetPlayerId);
              }}
              clickablePlayerIds={canReveal ? cuttablePlayerIds : []}
            />
          </div>
        </div>

        {!pendingDecision && !game.isRoundPreparation && (
          <p className="subtle table-action-hint">
            {cuttablePlayerIds.length > 0
              ? "Click a highlighted player card to cut a wire."
              : "No valid targets available right now."}
          </p>
        )}

        {canShowHandPopup && showHandToggleButton && (
          <div className="players-panel-tools">
            <button
              type="button"
              className="mode-button"
              onClick={() => setIsHandPopupOpen((open) => !open)}
            >
              {isHandPopupOpen ? "Hide hand" : "Show hand"}
            </button>
          </div>
        )}

        {canShowHandPopup && isHandPopupOpen && (
          <div className="table-hand-popup" role="dialog" aria-label="Your hand">
            <div className="result prep-panel table-hand-popup-card">
              <p>
                <strong>Your current hand (before shuffle):</strong>
              </p>
              <ul className={`wire-hand-fan${isReadyForRound ? " is-round-ready" : ""}`}>
                {visibleHand.map((card, index) => (
                  <li
                    key={`${card.kind}-${card.color ?? "none"}-${index}`}
                    className="wire-hand-card-item"
                    style={{ "--fan-index": index } as CSSProperties}
                  >
                    <WireVisualCard
                      kind={card.kind}
                      color={card.color}
                      subtitle={`Card ${index + 1}`}
                    />
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="submit-button"
                disabled={busy || !hubReady || isReadyForRound}
                onClick={onMarkRoundReady}
              >
                {isReadyForRound ? "Ready submitted" : "I'm ready"}
              </button>
              <p className="subtle">
                When everyone is ready, hands are hidden and shuffled automatically.
              </p>
            </div>
          </div>
        )}
      </section>

      {pendingDecision && (
        <div className="decision-overlay" role="presentation">
          <section
            className="result decision-panel"
            aria-live="assertive"
            aria-label="Pending decision"
          >
            <p className="decision-kicker">Pending decision</p>
            <p>
              <strong>
                {pendingDecision.type === "AssignDefuseColor"
                  ? "Choose a color to defuse"
                  : "Choose a defused color to reactivate"}
              </strong>
            </p>
            <p className="subtle">
              {isPendingDecisionRequester
                ? "Select one color and confirm your choice."
                : `Waiting for ${pendingDecisionRequesterName} to confirm.`}
            </p>
            <div className="action-row decision-color-row">
              {pendingDecision.availableColors.map((color) => {
                const isSelected = selectedPendingDecisionColor === color;

                return (
                  <button
                    key={color}
                    type="button"
                    className={`mode-button decision-color-option${isSelected ? " decision-color-selected active" : ""}`}
                    disabled={busy || !isPendingDecisionRequester}
                    onClick={() => onSelectPendingDecisionColor(color)}
                  >
                    {color}
                  </button>
                );
              })}
            </div>
            {isPendingDecisionRequester ? (
              <>
                <p className="subtle decision-selection-status">
                  {selectedPendingDecisionColor
                    ? `Selected: ${selectedPendingDecisionColor}`
                    : "No color selected yet."}
                </p>
                <button
                  type="button"
                  className="submit-button decision-submit"
                  disabled={busy || !selectedPendingDecisionColor}
                  onClick={onSubmitPendingDecision}
                >
                  {busy
                    ? "Submitting..."
                    : selectedPendingDecisionColor
                      ? `Confirm ${selectedPendingDecisionColor}`
                      : "Confirm selection"}
                </button>
              </>
            ) : null}
          </section>
        </div>
      )}

      {isPortalReady
        ? createPortal(sideDrawerControls, document.body)
        : sideDrawerControls}
    </>
  );
}
