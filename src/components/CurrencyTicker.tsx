import { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TickerRate {
  id: string;
  currency_code: string;
  rate: number;
  previous_rate: number | null;
}

const CurrencyTicker = () => {
  const [rates, setRates] = useState<TickerRate[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("exchange_rates")
      .select("id, currency_code, rate, previous_rate")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setRates((data as TickerRate[]) || []));
  }, []);

  // Pause on hover
  const [paused, setPaused] = useState(false);

  if (rates.length === 0) return null;

  // Duplicate items for seamless loop
  const items = [...rates, ...rates];

  return (
    <div
      className="w-full bg-primary/95 backdrop-blur-sm overflow-hidden border-b border-border/30"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={scrollRef}
        className="flex whitespace-nowrap"
        style={{
          animation: `ticker-scroll ${rates.length * 4}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {items.map((r, i) => {
          const diff = r.previous_rate != null ? r.rate - r.previous_rate : null;
          const pct = diff != null && r.previous_rate !== 0
            ? ((diff / r.previous_rate!) * 100).toFixed(2)
            : null;
          const isUp = diff != null && diff > 0;
          const isDown = diff != null && diff < 0;

          return (
            <div
              key={`${r.id}-${i}`}
              className="inline-flex items-center gap-2 px-5 py-1.5 text-xs"
            >
              <span className="font-semibold text-primary-foreground/90">
                {r.currency_code}/KES
              </span>
              <span className="font-bold text-primary-foreground tabular-nums">
                {r.rate.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {pct != null && (
                <span
                  className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${
                    isUp
                      ? "text-accent"
                      : isDown
                      ? "text-destructive"
                      : "text-primary-foreground/50"
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
