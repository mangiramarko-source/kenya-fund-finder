import { useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  /** Override auto trend detection so stroke matches an external change indicator. */
  trend?: "up" | "down" | "flat";
}

/**
 * Lightweight SVG sparkline — no recharts dependency.
 * Renders a simple polyline + gradient fill for trend visualization.
 */
const Sparkline = ({ data, width = 60, height = 20, color = "hsl(var(--accent))", className, trend }: SparklineProps) => {
  const id = useMemo(() => `spark-${Math.random().toString(36).slice(2, 8)}`, []);
  const isUp = trend
    ? trend === "up"
    : data.length >= 2 && data[data.length - 1] >= data[0];

  const path = useMemo(() => {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = 1;
    const w = width - pad * 2;
    const h = height - pad * 2;
    const points = data.map((v, i) => {
      const x = pad + (i / (data.length - 1)) * w;
      const y = pad + h - ((v - min) / range) * h;
      return `${x},${y}`;
    });
    return points.join(" ");
  }, [data, width, height]);

  if (!path) return null;
  const autoColor = trend === "flat" ? "hsl(var(--muted-foreground))" : isUp ? "hsl(var(--accent))" : "hsl(var(--destructive))";
  const strokeColor = color === "auto" ? autoColor : color;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={`${path} ${width - 1},${height} 1,${height}`}
        fill={`url(#${id})`}
      />
      <polyline
        points={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Sparkline;
