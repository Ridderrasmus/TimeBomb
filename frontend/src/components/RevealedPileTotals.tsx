interface RevealedPileWire {
  revealedFromPlayerId?: string;
  card: {
    kind: string;
    color?: string | null;
  };
}

interface RevealedPilePlayer {
  id: string;
  name: string;
}

interface RevealedPileTotalsProps {
  wires: RevealedPileWire[];
  players?: RevealedPilePlayer[];
  totalsByPlayer?: Record<string, number> | null;
}

interface ColorTotals {
  total: number;
  bomb: number;
  defuse: number;
}

const DISPLAY_COLORS = ["Green", "Orange", "Pink", "Yellow", "Blue", "Red"] as const;

const COLOR_CLASS: Record<string, string> = {
  Green: "wire-color-green",
  Orange: "wire-color-orange",
  Pink: "wire-color-pink",
  Yellow: "wire-color-yellow",
  Blue: "wire-color-blue",
  Red: "wire-color-red",
};

export function RevealedPileTotals({
  wires,
  players = [],
  totalsByPlayer,
}: RevealedPileTotalsProps) {
  const totalWires = wires.length;
  const bombTotal = wires.filter((wire) => wire.card.kind === "Bomb").length;
  const defuseTotal = totalWires - bombTotal;
  const bombPercent = totalWires > 0 ? Math.round((bombTotal / totalWires) * 100) : 0;
  const defusePercent =
    totalWires > 0 ? Math.round((defuseTotal / totalWires) * 100) : 0;

  const colorTotals = wires.reduce<Record<string, ColorTotals>>((totals, wire) => {
    if (!wire.card.color) {
      return totals;
    }

    const current = totals[wire.card.color] ?? { total: 0, bomb: 0, defuse: 0 };
    const isBomb = wire.card.kind === "Bomb";
    totals[wire.card.color] = {
      total: current.total + 1,
      bomb: current.bomb + (isBomb ? 1 : 0),
      defuse: current.defuse + (isBomb ? 0 : 1),
    };

    return totals;
  }, {});

  const derivedTotalsByPlayer = wires.reduce<Record<string, number>>((totals, wire) => {
    if (!wire.revealedFromPlayerId) {
      return totals;
    }

    totals[wire.revealedFromPlayerId] = (totals[wire.revealedFromPlayerId] ?? 0) + 1;
    return totals;
  }, {});

  const contributorIds = new Set<string>([
    ...Object.keys(derivedTotalsByPlayer),
    ...Object.keys(totalsByPlayer ?? {}),
    ...players.map((player) => player.id),
  ]);

  const topContributors = Array.from(contributorIds)
    .map((playerId) => {
      const additiveTotal = totalsByPlayer?.[playerId];
      const derivedTotal = derivedTotalsByPlayer[playerId] ?? 0;
      const total = additiveTotal ?? derivedTotal;
      const name = players.find((player) => player.id === playerId)?.name ?? playerId;
      return { playerId, name, total };
    })
    .filter((entry) => entry.total > 0)
    .sort((left, right) => right.total - left.total)
    .slice(0, 3);

  return (
    <section className="revealed-pile-totals" aria-label="Revealed pile totals">
      <p>
        <strong>Revealed pile totals</strong>
      </p>
      <div className="revealed-pile-summary">
        <p className="pile-summary-chip total">Total {totalWires}</p>
        <p className="pile-summary-chip defuse">Defuse {defuseTotal}</p>
        <p className="pile-summary-chip bomb">Bomb {bombTotal}</p>
      </div>
      <div className="revealed-pile-progress-grid" role="presentation">
        <div className="pile-progress-row defuse">
          <span className="pile-progress-label">Defuse</span>
          <span className="pile-progress-track">
            <span
              className="pile-progress-fill"
              style={{ width: `${defusePercent}%` }}
              aria-hidden="true"
            />
          </span>
          <span className="pile-progress-value">{defusePercent}%</span>
        </div>
        <div className="pile-progress-row bomb">
          <span className="pile-progress-label">Bomb</span>
          <span className="pile-progress-track">
            <span
              className="pile-progress-fill"
              style={{ width: `${bombPercent}%` }}
              aria-hidden="true"
            />
          </span>
          <span className="pile-progress-value">{bombPercent}%</span>
        </div>
      </div>
      {topContributors.length > 0 && (
        <div className="revealed-pile-player-chips" aria-label="Top reveal contributors">
          {topContributors.map((contributor) => (
            <p key={contributor.playerId} className="pile-player-chip">
              <span>{contributor.name}</span>
              <strong>{contributor.total}</strong>
            </p>
          ))}
        </div>
      )}
      <ul className="revealed-pile-color-grid">
        {DISPLAY_COLORS.map((color) => {
          const totals = colorTotals[color] ?? { total: 0, bomb: 0, defuse: 0 };
          const colorPercent =
            totalWires > 0 ? Math.round((totals.total / totalWires) * 100) : 0;

          return (
            <li key={color} className="revealed-pile-color-card">
              <p className="pile-color-name">
                <span
                  className={`pile-color-dot ${COLOR_CLASS[color]}`}
                  aria-hidden="true"
                />
                {color}
              </p>
              <p className="pile-color-total">{totals.total}</p>
              <p className="pile-color-breakdown">
                Bomb {totals.bomb} · Defuse {totals.defuse}
              </p>
              <span className="pile-color-meter" aria-hidden="true">
                <span style={{ width: `${colorPercent}%` }} />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
