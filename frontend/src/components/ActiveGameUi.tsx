import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import "./ActiveGameUi.css";

import { PlayerStatusCards } from "./PlayerStatusCards";
import { RevealedPileTotals } from "./RevealedPileTotals";
import { RevealedWireHistory } from "./RevealedWireHistory";
import { TurnStateProminence } from "./TurnStateProminence";
import { WireVisualCard } from "./WireVisualCard";

type WireColor = "Green" | "Orange" | "Pink" | "Yellow" | "Blue" | "Red";
type WireKind = "Defuse" | "Bomb";

type PendingDecisionType = "AssignDefuseColor" | "ReactivateBlueColor";

interface PlayerSummary {
  id: string;
  name: string;
  remainingWireCount: number;
  isActiveTurnPlayer: boolean;
}

interface RevealedWire {
  round: number;
  turn: number;
  activePlayerId: string;
  revealedFromPlayerId: string;
  card: {
    kind: WireKind;
    color?: WireColor | null;
  };
  defusedColorAssigned?: WireColor | null;
  reactivatedColor?: WireColor | null;
  effect?: string | null;
}

interface RecentEffectCue {
  round: number;
  turn: number;
  effect: string;
}

interface PendingDecision {
  type: PendingDecisionType;
  requestedByPlayerId: string;
  availableColors: WireColor[];
}

interface ActiveGameState {
  currentRound: number;
  maxRounds: number;
  turnsTakenInRound: number;
  roundTurnLimit: number;
  activePlayerId: string;
  isRoundPreparation: boolean;
  readyPlayerIds: string[];
  forcedTargetPlayerIdForNextTurn?: string | null;
  forcedTargetPlayerNameForNextTurn?: string | null;
  revealedDefuseWireCount: number;
  defusedColors: WireColor[];
  revealedWires: RevealedWire[];
  revealedPileTotalsByPlayer?: Record<string, number> | null;
  outcome: {
    winner?: "Sherlock" | "Moriarty" | null;
    reason: "None" | "BombExploded" | "DefuseObjectiveComplete" | "RoundLimitReached";
    isComplete: boolean;
  };
}

interface RulesSummary {
  variant: "Standard" | "Evolution";
  randomizeCardColors: boolean;
  selectedBombColors?: WireColor[] | null;
}

interface ActiveGameUiProps {
  players: PlayerSummary[];
  currentPlayerId: string;
  game: ActiveGameState;
  rules: RulesSummary;
  myTeam?: "Sherlock" | "Moriarty" | null;
  isMyTurn: boolean;
  activePlayerName: string;
  canReveal: boolean;
  busy: boolean;
  hubReady: boolean;
  visibleHand: Array<{
    kind: WireKind;
    color?: WireColor | null;
  }>;
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
  effectCue,
  effectActivePlayerName,
  effectRevealedFromPlayerName,
  effectForcedTargetName,
}: ActiveGameUiProps) {
  const [isHandPopupOpen, setIsHandPopupOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isRulesDrawerOpen, setIsRulesDrawerOpen] = useState(false);
  const [rulesMarkdown, setRulesMarkdown] = useState<string | null>(null);
  const [rulesMarkdownLoading, setRulesMarkdownLoading] = useState(false);
  const [rulesMarkdownError, setRulesMarkdownError] = useState<string | null>(null);
  const rulesVariantSlug = rules.variant.toLowerCase();
  const rulesMarkdownPath = `/rules/${rulesVariantSlug}-game-rules.md`;

  const canShowHandPopup = game.isRoundPreparation && visibleHand.length > 0;

  useEffect(() => {
    if (!canShowHandPopup) {
      setIsHandPopupOpen(false);
      return;
    }

    setIsHandPopupOpen(true);
  }, [canShowHandPopup]);

  useEffect(() => {
    setRulesMarkdown(null);
    setRulesMarkdownError(null);
  }, [rulesVariantSlug]);

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
        <PlayerStatusCards
          players={players}
          currentPlayerId={currentPlayerId}
          forcedTargetPlayerId={game.forcedTargetPlayerIdForNextTurn}
          showWireCounts={true}
          circularLayout={true}
          onPlayerClick={(targetPlayerId) => {
            if (!canReveal || !cuttablePlayerIds.includes(targetPlayerId)) {
              return;
            }

            onRevealWire(targetPlayerId);
          }}
          clickablePlayerIds={canReveal ? cuttablePlayerIds : []}
        />

        {!pendingDecision && !game.isRoundPreparation && (
          <p className="subtle table-action-hint">
            {cuttablePlayerIds.length > 0
              ? "Click a highlighted player card to cut a wire."
              : "No valid targets available right now."}
          </p>
        )}

        {canShowHandPopup && (
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

      <section className="result game-panel">
        <div className="game-stat-grid">
          <article className="game-stat-card">
            <p className="game-stat-label">Round</p>
            <p className="game-stat-value">
              {game.currentRound} / {game.maxRounds}
            </p>
          </article>
          <article className="game-stat-card">
            <p className="game-stat-label">Turns this round</p>
            <p className="game-stat-value">
              {game.turnsTakenInRound} / {game.roundTurnLimit}
            </p>
          </article>
          <article className="game-stat-card">
            <p className="game-stat-label">Defuse revealed</p>
            <p className="game-stat-value">{game.revealedDefuseWireCount}</p>
          </article>
          <article className="game-stat-card">
            <p className="game-stat-label">Defused colors</p>
            {game.defusedColors.length > 0 ? (
              <div className="game-stat-chip-row">
                {game.defusedColors.map((color) => (
                  <span key={color} className="game-stat-chip">
                    {color}
                  </span>
                ))}
              </div>
            ) : (
              <p className="game-stat-muted">None yet</p>
            )}
          </article>
        </div>

        {game.outcome.isComplete ? (
          <p>
            <strong>Winner:</strong> {game.outcome.winner} ({game.outcome.reason})
          </p>
        ) : (
          <>
            {game.isRoundPreparation ? (
              <p>
                <strong>Round phase:</strong> Preparation ({game.readyPlayerIds.length}/
                {players.length} ready)
              </p>
            ) : (
              <p>
                <strong>Round phase:</strong> Active turn play
              </p>
            )}
            <p>
              <strong>Current turn:</strong> {activePlayerName}
            </p>
            {game.forcedTargetPlayerIdForNextTurn && (
              <p>
                <strong>Forced target:</strong> {game.forcedTargetPlayerNameForNextTurn ??
                  players.find(
                    (player) => player.id === game.forcedTargetPlayerIdForNextTurn,
                  )?.name ??
                  game.forcedTargetPlayerIdForNextTurn}
              </p>
            )}
          </>
        )}

        {effectCue && (
          <section className="result effect-cue-panel" aria-live="polite">
            <p className="effect-cue-kicker">
              Effect cue · R{effectCue.round} T{effectCue.turn}
            </p>
            <p className="effect-cue-text">{effectCue.effect}</p>
            <p className="subtle effect-cue-meta">
              {effectActivePlayerName} cut {effectRevealedFromPlayerName}
            </p>
            {effectForcedTargetName && (
              <p className="subtle effect-cue-meta">Forced target: {effectForcedTargetName}</p>
            )}
          </section>
        )}

        <RevealedPileTotals
          wires={game.revealedWires}
          players={players}
          totalsByPlayer={game.revealedPileTotalsByPlayer ?? null}
        />

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
      </section>

      {!isRulesDrawerOpen && (
        <button
          type="button"
          className="mode-button side-drawer-toggle left"
          onClick={() => setIsRulesDrawerOpen(true)}
        >
          Game rules
        </button>
      )}
      <aside
        className={`side-drawer-panel left${isRulesDrawerOpen ? " is-open" : ""}`}
        aria-label="Game rules"
      >
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

      {!isHistoryDrawerOpen && (
        <button
          type="button"
          className="mode-button side-drawer-toggle right"
          onClick={() => setIsHistoryDrawerOpen(true)}
        >
          Card history
        </button>
      )}
      <aside
        className={`side-drawer-panel right${isHistoryDrawerOpen ? " is-open" : ""}`}
        aria-label="Card history"
      >
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
    </>
  );
}
