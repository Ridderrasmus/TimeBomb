interface WireVisualCardProps {
  kind: string;
  color?: string | null;
  compact?: boolean;
  subtitle?: string;
}

const WIRE_COLOR_CLASS: Record<string, string> = {
  Green: "wire-color-green",
  Orange: "wire-color-orange",
  Pink: "wire-color-pink",
  Yellow: "wire-color-yellow",
  Blue: "wire-color-blue",
  Red: "wire-color-red",
};

export function WireVisualCard({
  kind,
  color,
  compact = false,
  subtitle,
}: WireVisualCardProps) {
  const colorClass = color ? WIRE_COLOR_CLASS[color] ?? "wire-color-none" : "wire-color-none";

  return (
    <div
      className={`wire-visual-card ${kind === "Bomb" ? "kind-bomb" : "kind-defuse"} ${colorClass}${compact ? " compact" : ""}`}
    >
      <span className="wire-visual-swatch" aria-hidden="true" />
      <div className="wire-visual-body">
        <p className="wire-visual-kind">{kind}</p>
        <p className="wire-visual-color">{color ?? "No color"}</p>
        {subtitle && <p className="wire-visual-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}
