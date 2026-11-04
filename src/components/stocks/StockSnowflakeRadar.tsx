import React from "react";
import type { StockScorecardResult } from "@/lib/stockFundamentalScorecard";

interface StockSnowflakeRadarProps {
  pillars: StockScorecardResult["pillars"];
  tone?: StockScorecardResult["tone"];
  size?: "sm" | "md" | "lg";
  className?: string;
}

const AXES: Array<{
  key: keyof StockScorecardResult["pillars"];
  label: string;
  shortLabel: string;
  angleDeg: number;
}> = [
  { key: "value", label: "VALUE", shortLabel: "VAL", angleDeg: -90 },
  { key: "income", label: "INCOME", shortLabel: "INC", angleDeg: -18 },
  { key: "quality", label: "QUALITY", shortLabel: "QLT", angleDeg: 54 },
  { key: "health", label: "HEALTH", shortLabel: "HLT", angleDeg: 126 },
  { key: "momentum", label: "MOMENTUM", shortLabel: "MOM", angleDeg: 198 },
];

const TONE_COLORS: Record<
  StockScorecardResult["tone"],
  { stroke: string; fill: string; dot: string }
> = {
  emerald: {
    stroke: "#10b981",
    fill: "rgba(16, 185, 129, 0.28)",
    dot: "#059669",
  },
  cyan: {
    stroke: "#06b6d4",
    fill: "rgba(6, 182, 212, 0.26)",
    dot: "#0891b2",
  },
  amber: {
    stroke: "#f59e0b",
    fill: "rgba(245, 158, 11, 0.26)",
    dot: "#d97706",
  },
  rose: {
    stroke: "#f43f5e",
    fill: "rgba(244, 63, 94, 0.26)",
    dot: "#e11d48",
  },
};

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Number((cx + radius * Math.cos(rad)).toFixed(2)),
    y: Number((cy + radius * Math.sin(rad)).toFixed(2)),
  };
}

export const StockSnowflakeRadar: React.FC<StockSnowflakeRadarProps> = ({
  pillars,
  tone = "emerald",
  size = "lg",
  className = "",
}) => {
  const isSmall = size === "sm";
  const isMedium = size === "md";
  const viewBoxSize = isSmall ? 48 : isMedium ? 120 : 210;
  const cx = viewBoxSize / 2;
  const cy = viewBoxSize / 2;
  const maxRadius = isSmall ? 19 : isMedium ? 42 : 66;
  const labelRadius = maxRadius + (isSmall ? 0 : isMedium ? 14 : 23);
  const palette = TONE_COLORS[tone] || TONE_COLORS.emerald;

  const rings = isSmall ? [0.5, 1] : [0.33, 0.66, 1];

  // Build smooth petal / radar polygon points
  const dataPoints = AXES.map((axis) => {
    const rawScore = pillars[axis.key] ?? 3;
    const normalized = Math.max(0.2, Math.min(1, rawScore / 6));
    return polarToCartesian(cx, cy, maxRadius * normalized, axis.angleDeg);
  });

  const polygonPointsAttr = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      className={className}
      role="img"
      aria-label={`5-Pillar Fundamental Snowflake: Value ${pillars.value}/6, Income ${pillars.income}/6, Quality ${pillars.quality}/6, Health ${pillars.health}/6, Momentum ${pillars.momentum}/6`}
    >
      {/* Concentric web rings */}
      {rings.map((ringScale, rIdx) => {
        const ringPts = AXES.map((axis) =>
          polarToCartesian(cx, cy, maxRadius * ringScale, axis.angleDeg)
        )
          .map((p) => `${p.x},${p.y}`)
          .join(" ");
        return (
          <polygon
            key={rIdx}
            points={ringPts}
            fill={rIdx === rings.length - 1 ? "currentColor" : "none"}
            fillOpacity={rIdx === rings.length - 1 ? 0.03 : 0}
            stroke="currentColor"
            strokeOpacity={0.16}
            strokeWidth={isSmall ? 0.8 : 1}
          />
        );
      })}

      {/* Axis spokes */}
      {AXES.map((axis) => {
        const outer = polarToCartesian(cx, cy, maxRadius, axis.angleDeg);
        return (
          <line
            key={axis.key}
            x1={cx}
            y1={cy}
            x2={outer.x}
            y2={outer.y}
            stroke="currentColor"
            strokeOpacity={0.16}
            strokeWidth={isSmall ? 0.75 : 1}
          />
        );
      })}

      {/* Filled Snowflake Polygon */}
      <polygon
        points={polygonPointsAttr}
        fill={palette.fill}
        stroke={palette.stroke}
        strokeWidth={isSmall ? 1.6 : 2.2}
        strokeLinejoin="round"
      />

      {/* Vertex Nodes */}
      {dataPoints.map((pt, idx) => (
        <circle
          key={AXES[idx].key}
          cx={pt.x}
          cy={pt.y}
          r={isSmall ? 1.6 : 3}
          fill={palette.stroke}
        />
      ))}

      {/* Axis Labels (only on md / lg) */}
      {!isSmall &&
        AXES.map((axis) => {
          const pos = polarToCartesian(cx, cy, labelRadius, axis.angleDeg);
          const score = pillars[axis.key];
          return (
            <g key={`label-${axis.key}`}>
              <text
                x={pos.x}
                y={pos.y - (isMedium ? 0 : 4)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground font-extrabold"
                style={{
                  fontSize: isMedium ? "7px" : "8.5px",
                  letterSpacing: "0.08em",
                }}
              >
                {isMedium ? axis.shortLabel : axis.label}
              </text>
              {!isMedium && (
                <text
                  x={pos.x}
                  y={pos.y + 7}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground font-bold tabular-nums"
                  style={{ fontSize: "8.5px" }}
                >
                  {score}/6
                </text>
              )}
            </g>
          );
        })}
    </svg>
  );
};
