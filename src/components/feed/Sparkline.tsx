import { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export function Sparkline({ symbol }: { symbol: string }) {
  // Generate a consistent pseudo-random trend based on the symbol string
  const data = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Seeded random number generator
    const random = (seed: number) => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    let currentValue = 100;
    const points = [];
    
    // Generate 7 points
    for (let i = 0; i < 7; i++) {
      points.push({ value: currentValue });
      // Random walk between -5% and +5%
      const change = (random(hash + i) * 10) - 5;
      currentValue = currentValue * (1 + change / 100);
    }
    
    return points;
  }, [symbol]);

  const isPositive = data[data.length - 1].value >= data[0].value;
  const color = isPositive ? "#10b981" : "#ef4444"; // emerald-500 or rose-500

  return (
    <div className="flex items-center gap-2 bg-muted/40 border border-border/50 rounded-lg px-2 py-1.5 w-fit">
      <span className="text-[11px] font-bold text-muted-foreground">{symbol}</span>
      <div className="w-[60px] h-[24px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              strokeWidth={2} 
              dot={false}
              isAnimationActive={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <span className={`text-[10px] font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isPositive ? '▲' : '▼'}
      </span>
    </div>
  );
}
