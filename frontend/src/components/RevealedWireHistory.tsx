import { WireVisualCard } from "./WireVisualCard";

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

interface RevealedWireHistoryProps {
  wires: RevealedWireHistoryEntry[];
  players: PlayerName[];
}

const getPlayerName = (players: PlayerName[], playerId: string) =>
  players.find((player) => player.id === playerId)?.name ?? playerId;

export function RevealedWireHistory({ wires, players }: RevealedWireHistoryProps) {
  const recentReveals = wires.slice(-3).reverse();

  return (
    <section className="revealed-history">
      <p>
        <strong>Revealed wires</strong>
      </p>
      {wires.length === 0 ? (
        <p className="subtle">No wires revealed yet.</p>
      ) : (
        <>
          <ul className="reveal-lane" aria-label="Recent reveals">
            {recentReveals.map((wire, index) => (
              <li
                key={`lane-${wire.round}-${wire.turn}-${index}`}
                className={`reveal-lane-item ${index === 0 ? "is-latest" : ""}`}
              >
                <WireVisualCard
                  kind={wire.card.kind}
                  color={wire.card.color}
                  compact
                  subtitle={`R${wire.round} · T${wire.turn}`}
                />
                <p className="reveal-lane-meta">
                  {getPlayerName(players, wire.activePlayerId)} →{" "}
                  {getPlayerName(players, wire.revealedFromPlayerId)}
                </p>
              </li>
            ))}
          </ul>
          <ul className="wire-history-list">
            {wires
              .slice()
              .reverse()
              .map((wire, index) => (
                <li
                  key={`${wire.round}-${wire.turn}-${index}`}
                  className={`wire-history-item ${wire.card.kind === "Bomb" ? "bomb-reveal" : "defuse-reveal"}`}
                >
                  <div className="wire-history-title">
                    <span className="wire-history-turn">
                      R{wire.round} · T{wire.turn}
                    </span>
                    <WireVisualCard
                      kind={wire.card.kind}
                      color={wire.card.color}
                      compact
                    />
                  </div>
                  <p className="wire-history-meta">
                    {getPlayerName(players, wire.activePlayerId)} cut{" "}
                    {getPlayerName(players, wire.revealedFromPlayerId)}
                  </p>
                  {wire.effect && <p className="wire-history-effect">{wire.effect}</p>}
                  {wire.defusedColorAssigned && (
                    <p className="wire-history-effect">
                      Defused color: {wire.defusedColorAssigned}
                    </p>
                  )}
                  {wire.reactivatedColor && (
                    <p className="wire-history-effect">
                      Reactivated color: {wire.reactivatedColor}
                    </p>
                  )}
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  );
}
