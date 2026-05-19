import { useMemo } from "react";
import { SCORE_BAND_COLOR, type FundScore } from "@/lib/fundScore";

interface Props {
  score: FundScore;
  size?: number;
  showLabels?: boolean;
  className?: string;
}

/**
 * The Kenya Fund Score visual — a 4-axis radar/diamond.
 * Axes (clockwise from top): Yield · Liquidity · Trust · Cost.
 * Each axis renders 0..25, total shown in the centre.
 */
const FundScoreDiamond = ({ score, size = 64, showLabels = false, className }: Props) => {
  const color = SCORE_BAND_COLOR[score.band];
  const labelPad = showLabels ? 28 : 6;
  const viewBox = size + labelPad * 2;
  const cx = viewBox / 2;
  const cy = viewBox / 2;
  const r = size / 2;

  // axes order: top, right, bottom, left
  const axes = useMemo(
    () => [
      { v: score.yield, dx: 0, dy: -1, label: "Yield" },
      { v: score.liquidity, dx: 1, dy: 0, label: "Liquidity" },
      { v: score.trust, dx: 0, dy: 1, label: "Trust" },
      { v: score.cost, dx: -1, dy: 0, label: "Cost" },
    ],
    [score],
  );

  const points = axes.map((a) => {
    const ratio = Math.max(0.06, Math.min(1, a.v / 25));
    return `${cx + a.dx * r * ratio},${cy + a.dy * r * ratio}`;
  });

  const gridPoints = (ratio: number) =>
    axes.map((a) => `${cx + a.dx * r * ratio},${cy + a.dy * r * ratio}`).join(" ");

  return (
    <svg
      width={viewBox}
      height={viewBox}
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      className={className}
      aria-label={`Kenya Fund Score ${score.total} of 100`}
    >
      {/* grid rings */}
      {[0.33, 0.66, 1].map((ratio) => (
        <polygon
          key={ratio}
          points={gridPoints(ratio)}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={0.75}
          opacity={ratio === 1 ? 0.8 : 0.4}
        />
      ))}
      {/* axes lines */}
      {axes.map((a, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={cx + a.dx * r}
          y2={cy + a.dy * r}
          stroke="hsl(var(--border))"
          strokeWidth={0.5}
          opacity={0.5}
        />
      ))}
      {/* filled score polygon */}
      <polygon
        points={points.join(" ")}
        fill={color}
        fillOpacity={0.22}
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* centre score */}
      <circle cx={cx} cy={cy} r={size * 0.26} fill="hsl(var(--card))" stroke={color} strokeWidth={1} />
      <text
        x={cx}
        y={cy + size * 0.04}
        textAnchor="middle"
        fontSize={size * 0.26}
        fontWeight={700}
        fill={color}
        fontFamily="ui-monospace, JetBrains Mono, monospace"
      >
        {score.total}
      </text>
      {showLabels && (
        <>
          {axes.map((a, i) => (
            <text
              key={i}
              x={cx + a.dx * (r + 14)}
              y={cy + a.dy * (r + 14) + 3}
              textAnchor="middle"
              fontSize={9}
              fill="hsl(var(--muted-foreground))"
              fontWeight={600}
              letterSpacing={0.5}
            >
              {a.label.toUpperCase()}
            </text>
          ))}
        </>
      )}
    </svg>
  );
};

export default FundScoreDiamond;
