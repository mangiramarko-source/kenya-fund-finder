import { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TickerItem {
  id: string;
  label: string;
  value: number;
  previousValue: number | null;
  unit?: string;
}

const CurrencyTicker = () => {
  const [items, setItems] = useState<TickerItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase
        .from("exchange_rates")
        .select("id, currency_code, rate, previous_rate")
        .eq("is_active", true)
        .order("sort_order")
        .then(({ data }) =>
          (data || []).map((r: any) => ({
            id: `fx-${r.id}`,
            label: `${r.currency_code}/KES`,
            value: r.rate,
            previousValue: r.previous_rate,
          }))
        ),
      supabase
        .from("commodities")
        .select("id, name, symbol, price, previous_price, unit")
        .eq("is_active", true)
        .order("sort_order")
        .then(({ data }) =>
          (data || []).map((c: any) => ({
            id: `cmd-${c.id}`,
            label: c.symbol || c.name,
            value: c.price,
            previousValue: c.previous_price,
            unit: c.unit,
          }))
        ),
    ]).then(([rates, commodities]) => setItems([...rates, ...commodities]));
  }, []);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div
      className="w-full bg-[hsl(220,60%,12%)] overflow-hidden border-b border-border/30"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={scrollRef}
        className="flex whitespace-nowrap"
        style={{
          animation: `ticker-scroll ${items.length * 2}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {doubled.map((item, i) => {
          const diff = item.previousValue != null ? item.value - item.previousValue : null;
          const pct =
            diff != null && item.previousValue !== 0
              ? ((diff / item.previousValue!) * 100).toFixed(2)
              : null;
          const isUp = diff != null && diff > 0;
          const isDown = diff != null && diff < 0;

          const prevItem = i > 0 ? doubled[i - 1] : null;
          const showSep = prevItem && prevItem.id.startsWith("fx-") !== item.id.startsWith("fx-");

          return (
            <div
              key={`${item.id}-${i}`}
              className="inline-flex items-center gap-2 px-5 py-1.5 text-xs"
            >
              {showSep && (
                <span className="text-white/20 mr-1 text-sm select-none">│</span>
              )}
              <span className="font-semibold text-white/70">
                {item.label}
              </span>
              <span className="font-bold text-white tabular-nums">
                {item.value.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                {item.unit && (
                  <span className="text-white/40 font-normal ml-0.5 text-[10px]">
                    {item.unit}
                  </span>
                )}
              </span>
              {pct != null && (
                <span
                  className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${
                    isUp
                      ? "text-[hsl(152,70%,55%)]"
                      : isDown
                      ? "text-[hsl(0,85%,65%)]"
                      : "text-white/40"
                  }`}
                >
                  {isUp ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : isDown ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : null}
                  {isUp ? "+" : ""}
                  {pct}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CurrencyTicker;
