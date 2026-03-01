import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  previewAutoRevealTargetId?: string | null;
  previewAutoRevealToken?: number;
  effectCue?: RecentEffectCue | null;
  effectActivePlayerName?: string | null;
  effectRevealedFromPlayerName?: string | null;
  effectForcedTargetName?: string | null;
}

type ActiveRevealedWire = ActiveGameState["revealedWires"][number];

const getRevealedWireIdentity = (wire: ActiveRevealedWire) =>
  `${wire.round}:${wire.turn}:${wire.activePlayerId}:${wire.revealedFromPlayerId}`;

const dedupeRevealedWires = (wires: ActiveGameState["revealedWires"]) => {
  if (wires.length < 2) {
    return wires;
  }

  const dedupedByIdentity = new Map<string, ActiveRevealedWire>();
  for (const wire of wires) {
    dedupedByIdentity.set(getRevealedWireIdentity(wire), wire);
  }

  return Array.from(dedupedByIdentity.values());
};

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
  previewAutoRevealTargetId = null,
  previewAutoRevealToken = 0,
}: ActiveGameUiProps) {
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isRulesDrawerOpen, setIsRulesDrawerOpen] = useState(false);
  const [isPortalReady, setIsPortalReady] = useState(false);
  const [rulesMarkdown, setRulesMarkdown] = useState<string | null>(null);
  const [rulesMarkdownLoading, setRulesMarkdownLoading] = useState(false);
  const [rulesMarkdownError, setRulesMarkdownError] = useState<string | null>(null);
  const [hoveredTargetPlayerId, setHoveredTargetPlayerId] = useState<string | null>(
    null,
  );
  const [clippersPosition, setClippersPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [cutDragCue, setCutDragCue] = useState<{
    id: number;
    startX: number;
    startY: number;
    deltaX: number;
    deltaY: number;
  } | null>(null);
  const [bombPileCue, setBombPileCue] = useState<{
    id: number;
    color: WireColor;
  } | null>(null);
  const [localHandPhase, setLocalHandPhase] = useState<
    "idle" | "dealing" | "hiding" | "shuffling" | "stacked"
  >("idle");
  const tableBoardRef = useRef<HTMLDivElement | null>(null);
  const playerCardElementsRef = useRef<Map<string, HTMLLIElement>>(new Map());
  const processedRevealCountRef = useRef(game.revealedWires.length);
  const processedPreviewAutoRevealTokenRef = useRef(0);
  const revealRequestTargetRef = useRef<string | null>(null);
  const rulesVariantSlug = rules.variant.toLowerCase();
  const rulesMarkdownPath = `/rules/${rulesVariantSlug}-game-rules.md`;

  const isRoundPreparation = game.isRoundPreparation;
  const canShowPrepHand = isRoundPreparation && visibleHand.length > 0;
  const allPlayersReadyForRound = players.length > 0 && game.readyPlayerIds.length >= players.length;
  const currentPlayer = players.find((player) => player.id === currentPlayerId);
  const hiddenHandPlaceholderCount = Math.max(
    1,
    Math.min(currentPlayer?.remainingWireCount ?? 0, 6),
  );
  const displayedHandCards: WireCard[] = canShowPrepHand
    ? visibleHand
    : Array.from({ length: hiddenHandPlaceholderCount }, () => ({
        kind: "Defuse",
        color: null,
      }));
  const leftSidePlayers = players.filter((_, index) => index % 2 === 0);
  const rightSidePlayers = players.filter((_, index) => index % 2 === 1);
  const activeColorPiles =
    game.selectedBombColors && game.selectedBombColors.length > 0
      ? Array.from(new Set(game.selectedBombColors))
      : rules.selectedBombColors && rules.selectedBombColors.length > 0
        ? Array.from(new Set(rules.selectedBombColors))
        : (["Green", "Orange", "Pink", "Yellow", "Blue", "Red"] as WireColor[]);
  const uniqueRevealedWires = useMemo(
    () => dedupeRevealedWires(game.revealedWires),
    [game.revealedWires],
  );
  const drawnByColor = activeColorPiles.reduce<Record<WireColor, number>>(
    (acc, color) => {
      acc[color] =
        game.revealedBombsByColor?.[color]
        ?? uniqueRevealedWires.filter((wire) => wire.card.color === color).length;
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
  const defusePileCount = uniqueRevealedWires.filter(
    (wire) => wire.card.kind === "Defuse",
  ).length;
  const colorPileColumns = activeColorPiles.length <= 4 ? activeColorPiles.length : 3;
  const compactHandReadyPlayerIds = useMemo(
    () => {
      if (isRoundPreparation) {
        return allPlayersReadyForRound
          ? players
              .filter((player) => player.id !== currentPlayerId)
              .map((player) => player.id)
          : [];
      }

      if (canReveal) {
        return players
          .filter((player) => player.id !== currentPlayerId)
          .map((player) => player.id);
      }

      return [];
    },
    [allPlayersReadyForRound, canReveal, currentPlayerId, isRoundPreparation, players],
  );
  const showCompactTargetPiles = isRoundPreparation || canReveal;

  const setPlayerCardRef = useCallback(
    (playerId: string, element: HTMLLIElement | null) => {
      if (!element) {
        playerCardElementsRef.current.delete(playerId);
        return;
      }

      playerCardElementsRef.current.set(playerId, element);
    },
    [],
  );

  const handlePlayerHover = useCallback(
    (playerId: string | null) => {
      if (!canReveal || !playerId || !cuttablePlayerIds.includes(playerId)) {
        setHoveredTargetPlayerId(null);
        return;
      }

      setHoveredTargetPlayerId(playerId);
    },
    [canReveal, cuttablePlayerIds],
  );

  const updateClippersPosition = useCallback(() => {
    if (
      !canReveal ||
      !hoveredTargetPlayerId ||
      !cuttablePlayerIds.includes(hoveredTargetPlayerId)
    ) {
      setClippersPosition(null);
      return;
    }

    const boardElement = tableBoardRef.current;
    const playerElement = playerCardElementsRef.current.get(hoveredTargetPlayerId);
    if (!boardElement || !playerElement) {
      setClippersPosition(null);
      return;
    }

    const boardRect = boardElement.getBoundingClientRect();
    const playerRect = playerElement.getBoundingClientRect();
    setClippersPosition({
      x: playerRect.right - boardRect.left - 17,
      y: playerRect.top - boardRect.top + playerRect.height * 0.5 - 14,
    });
  }, [canReveal, cuttablePlayerIds, hoveredTargetPlayerId]);

  const triggerCutDragAnimation = useCallback((targetPlayerId: string) => {
    const boardElement = tableBoardRef.current;
    const playerElement = playerCardElementsRef.current.get(targetPlayerId);
    if (!boardElement || !playerElement) {
      return;
    }

    const boardRect = boardElement.getBoundingClientRect();
    const playerRect = playerElement.getBoundingClientRect();
    const startX = playerRect.left - boardRect.left + Math.min(playerRect.width * 0.3, 64);
    const startY = playerRect.top - boardRect.top + Math.max(playerRect.height * 0.72, 28);
    const centerX = boardRect.width * 0.5;
    const deltaX = (centerX - startX) * 0.46;
    const deltaY = -26;

    setCutDragCue({
      id: Date.now() + Math.floor(Math.random() * 1000),
      startX,
      startY,
      deltaX,
      deltaY,
    });
  }, []);

  const handleRevealTargetSelection = useCallback(
    (targetPlayerId: string) => {
      if (
        !canReveal ||
        busy ||
        !hubReady ||
        !cuttablePlayerIds.includes(targetPlayerId) ||
        revealRequestTargetRef.current === targetPlayerId
      ) {
        return;
      }

      revealRequestTargetRef.current = targetPlayerId;
      triggerCutDragAnimation(targetPlayerId);
      const result: unknown = onRevealWire(targetPlayerId);
      if (result instanceof Promise) {
        result.finally(() => {
          revealRequestTargetRef.current = null;
        });
      } else {
        revealRequestTargetRef.current = null;
      }
    },
    [busy, canReveal, cuttablePlayerIds, hubReady, onRevealWire, triggerCutDragAnimation],
  );

  useEffect(() => {
    if (!isRoundPreparation) {
      setLocalHandPhase("stacked");
      return;
    }

    if (!canShowPrepHand) {
      setLocalHandPhase("idle");
      return;
    }

    if (!allPlayersReadyForRound) {
      setLocalHandPhase("dealing");
      return;
    }

    setLocalHandPhase("hiding");
    const hideTimeoutId = window.setTimeout(() => {
      setLocalHandPhase("shuffling");
    }, 560);
    const shuffleTimeoutId = window.setTimeout(() => {
      setLocalHandPhase("stacked");
    }, 1820);

    return () => {
      window.clearTimeout(hideTimeoutId);
      window.clearTimeout(shuffleTimeoutId);
    };
  }, [
    allPlayersReadyForRound,
    canShowPrepHand,
    game.currentRound,
    isRoundPreparation,
    visibleHand.length,
  ]);

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
            <RevealedWireHistory wires={uniqueRevealedWires} players={players} />
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

  useEffect(() => {
    if (!canReveal) {
      setHoveredTargetPlayerId(null);
      revealRequestTargetRef.current = null;
    }
  }, [canReveal]);

  useEffect(() => {
    revealRequestTargetRef.current = null;
  }, [uniqueRevealedWires.length]);

  useEffect(() => {
    updateClippersPosition();
  }, [players, updateClippersPosition]);

  useEffect(() => {
    if (!clippersPosition) {
      return;
    }

    const handleViewportChange = () => {
      updateClippersPosition();
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [clippersPosition, updateClippersPosition]);

  useEffect(() => {
    const revealCount = uniqueRevealedWires.length;
    if (revealCount <= processedRevealCountRef.current) {
      processedRevealCountRef.current = revealCount;
      return;
    }

    processedRevealCountRef.current = revealCount;
    const latestReveal = uniqueRevealedWires[revealCount - 1];
    if (latestReveal.card.kind !== "Bomb" || !latestReveal.card.color) {
      return;
    }

    const cueId = Date.now() + revealCount;
    setBombPileCue({
      id: cueId,
      color: latestReveal.card.color,
    });

    const timeoutId = window.setTimeout(() => {
      setBombPileCue((currentCue) =>
        currentCue?.id === cueId ? null : currentCue,
      );
    }, 1450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [uniqueRevealedWires]);

  useEffect(() => {
    if (previewAutoRevealToken <= 0) {
      processedPreviewAutoRevealTokenRef.current = 0;
      return;
    }

    if (!previewAutoRevealTargetId) {
      return;
    }

    if (processedPreviewAutoRevealTokenRef.current === previewAutoRevealToken) {
      return;
    }

    processedPreviewAutoRevealTokenRef.current = previewAutoRevealToken;
    handleRevealTargetSelection(previewAutoRevealTargetId);
  }, [handleRevealTargetSelection, previewAutoRevealTargetId, previewAutoRevealToken]);

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
        <div
          className="table-board-layout"
          aria-label="Game table layout"
          ref={tableBoardRef}
        >
          <div className="table-side-column table-side-column-left">
            <PlayerStatusCards
              players={leftSidePlayers}
              currentPlayerId={currentPlayerId}
              forcedTargetPlayerId={game.forcedTargetPlayerIdForNextTurn}
              showWireCounts={true}
              compactHandAnimation={{
                enabled: showCompactTargetPiles,
                readyPlayerIds: compactHandReadyPlayerIds,
              }}
              circularLayout={false}
              onPlayerClick={handleRevealTargetSelection}
              onPlayerHover={handlePlayerHover}
              onPlayerCardRef={setPlayerCardRef}
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
                    className={`table-pile-card table-pile-${color.toLowerCase()}${bombPileCue?.color === color ? " is-bomb-reveal-highlight" : ""}`}
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
                    {bombPileCue?.color === color && (
                      <span
                        key={`plus-${bombPileCue.id}`}
                        className="table-pile-plus-one"
                        aria-hidden="true"
                      >
                        +1
                      </span>
                    )}
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
              compactHandAnimation={{
                enabled: showCompactTargetPiles,
                readyPlayerIds: compactHandReadyPlayerIds,
              }}
              circularLayout={false}
              onPlayerClick={handleRevealTargetSelection}
              onPlayerHover={handlePlayerHover}
              onPlayerCardRef={setPlayerCardRef}
              clickablePlayerIds={canReveal ? cuttablePlayerIds : []}
            />
          </div>
          {cutDragCue && (
            <div
              key={`cut-drag-${cutDragCue.id}`}
              className="table-cut-drag-card"
              style={
                {
                  "--cut-start-x": `${cutDragCue.startX}px`,
                  "--cut-start-y": `${cutDragCue.startY}px`,
                  "--cut-dx": `${cutDragCue.deltaX}px`,
                  "--cut-dy": `${cutDragCue.deltaY}px`,
                } as CSSProperties
              }
              aria-hidden="true"
              onAnimationEnd={() => {
                setCutDragCue((currentCue) =>
                  currentCue?.id === cutDragCue.id ? null : currentCue,
                );
              }}
            />
          )}
          {canReveal && clippersPosition && (
            <div
              className="table-hover-clippers"
              style={
                {
                  "--clipper-x": `${clippersPosition.x}px`,
                  "--clipper-y": `${clippersPosition.y}px`,
                } as CSSProperties
              }
              aria-hidden="true"
            >
              ✂
            </div>
          )}
        </div>

        {!pendingDecision && !game.isRoundPreparation && (
          <p className="subtle table-action-hint">
            {cuttablePlayerIds.length > 0
              ? "Click a highlighted player card to cut a wire."
              : "No valid targets available right now."}
          </p>
        )}

        <div className="table-hand-popup" role="region" aria-label="Your hand">
          <div className="result prep-panel table-hand-popup-card">
            <p>
              <strong>
                {canShowPrepHand
                  ? "Your current hand (before shuffle):"
                  : "Your hand (hidden during turn phase):"}
              </strong>
            </p>
            <ul
              className={`wire-hand-fan hand-phase-${localHandPhase}${allPlayersReadyForRound ? " is-round-ready" : ""}`}
            >
              {displayedHandCards.map((card, index) => (
                <li
                  key={`${card.kind}-${card.color ?? "none"}-${index}`}
                  className="wire-hand-card-item"
                  style={{ "--fan-index": index } as CSSProperties}
                >
                  <WireVisualCard
                    kind={card.kind}
                    color={card.color}
                    subtitle={canShowPrepHand ? `Card ${index + 1}` : undefined}
                    hiddenBack={
                      !canShowPrepHand
                      || localHandPhase === "hiding"
                      || localHandPhase === "shuffling"
                      || localHandPhase === "stacked"
                    }
                  />
                </li>
              ))}
            </ul>

            {canShowPrepHand && (
              <button
                type="button"
                className="submit-button"
                disabled={busy || !hubReady || isReadyForRound}
                onClick={onMarkRoundReady}
              >
                {isReadyForRound ? "Ready submitted" : "I'm ready"}
              </button>
            )}
            <p className="subtle">
              {isRoundPreparation
                ? "Hands are hidden and shuffled only after everyone is ready."
                : "Hand box stays visible while turns play, with cards kept face-down."}
            </p>
          </div>
        </div>
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
