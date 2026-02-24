import { PlayerStatusCards } from "./PlayerStatusCards";

type GameVariant = "Standard" | "Evolution";
type LobbyStateName = "Lobby" | "InProgress" | "Completed";
type WireColor = "Green" | "Orange" | "Pink" | "Yellow" | "Blue" | "Red";

interface RulesDraft {
  variant: GameVariant;
  randomizeCardColors: boolean;
  selectedBombColors?: WireColor[] | null;
}

interface PlayerSummary {
  id: string;
  name: string;
  remainingWireCount: number;
  isActiveTurnPlayer: boolean;
}

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
  onSaveRules: () => void;
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
  onSaveRules,
  onStartGame,
}: GameLobbyUiProps) {
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
            onChange={(event) =>
              onRulesDraftChange({
                ...rulesDraft,
                variant: event.target.value as GameVariant,
              })
            }
            disabled={!isCreator || busy}
          >
            <option value="Standard">Standard</option>
            <option value="Evolution">Evolution</option>
          </select>

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

          {isCreator ? (
            <button
              type="button"
              className="submit-button"
              onClick={onSaveRules}
              disabled={busy || !hubReady}
            >
              Save rules
            </button>
          ) : (
            <p className="subtle">Only the creator can change rules.</p>
          )}
        </section>
      )}

      {lobbyState === "Lobby" && isCreator ? (
        <button
          type="button"
          className="submit-button"
          onClick={onStartGame}
          disabled={busy || !hubReady}
        >
          Start game
        </button>
      ) : lobbyState === "Lobby" ? (
        <p className="subtle">Only the creator can start the game.</p>
      ) : null}
    </>
  );
}