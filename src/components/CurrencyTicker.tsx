import { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import Sparkline from "./Sparkline";

interface TickerItem {
  id: string;
  label: string;
  value: number;
  previousValue: number | null;
  unit?: string;
  sparkData?: number[];
}

const CurrencyTicker = () => {
  const [items, setItems] = useState<TickerItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [paused, setPaused] = useState(false);

  const fetchItems = async () => {
    const [ratesRes, commoditiesRes, stocksRes, rateHistRes] = await Promise.all([
      supabase
        .from("exchange_rates_public" as any)
        .select("id, currency_code, rate, previous_rate")
        .order("sort_order"),
      supabase
        .from("commodities_public" as any)
        .select("id, name, symbol, price, previous_price, unit")
        .order("sort_order"),
      supabase
        .from("stocks_public" as any)
        .select("id, symbol, price, previous_price, day_change_percent")
        .order("sort_order")
        .limit(10),
      supabase
        .from("exchange_rate_history_public" as any)
        .select("exchange_rate_id, rate, snapshot_date")
        .order("snapshot_date", { ascending: true })
        .limit(500),
    ]);

    // Build sparkline data map for FX rates
    const historyMap: Record<string, number[]> = {};
    ((rateHistRes.data as any) || []).forEach((h: any) => {
      const id = h.exchange_rate_id;
      if (!historyMap[id]) historyMap[id] = [];
      historyMap[id].push(Number(h.rate));
    });
    // Keep only last 20 points per rate
    Object.keys(historyMap).forEach(k => {
      historyMap[k] = historyMap[k].slice(-20);
    });

    const rates: TickerItem[] = (ratesRes.data || []).map((r: any) => ({
      id: `fx-${r.id}`,
      label: `${r.currency_code}/KES`,
      value: r.rate,
      previousValue: r.previous_rate,
      sparkData: historyMap[r.id],
    }));
    const stocks: TickerItem[] = (stocksRes.data || []).map((s: any) => ({
      id: `stk-${s.id}`,
      label: s.symbol,
      value: s.price,
      previousValue: s.previous_price,
    }));
    const commodities: TickerItem[] = (commoditiesRes.data || []).map((c: any) => ({
      id: `cmd-${c.id}`,
      label: c.symbol || c.name,
      value: c.price,
      previousValue: c.previous_price,
      unit: c.unit,
    }));
    setItems([...stocks, ...rates, ...commodities]);
  };

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel("ticker-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "exchange_rates" }, () => fetchItems())
      .on("postgres_changes", { event: "*", schema: "public", table: "commodities" }, () => fetchItems())
      .on("postgres_changes", { event: "*", schema: "public", table: "stocks" }, () => fetchItems())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div
      className="flex h-9 items-center overflow-hidden border-b border-border/80 bg-card text-card-foreground px-4 shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div
        ref={scrollRef}
        className="animate-marquee flex gap-8 whitespace-nowrap"
        style={{
          animationPlayState: paused ? "paused" : "running",
          animationDuration: `${items.length * (isMobile ? 3.5 : 4.5)}s`
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

          return (
            <div
              key={`${item.id}-${i}`}
              className="flex items-center gap-2 text-xs font-medium"
            >
              <span className="text-muted-foreground font-semibold">
                {item.label}
              </span>
              <span className="text-foreground font-bold">
                {item.value.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              {pct != null ? (
                <span className={isUp ? "text-emerald-500 font-bold" : isDown ? "text-red-500 font-bold" : "text-muted-foreground font-medium"}>
                  {isUp ? "+" : ""}{pct}%
                </span>
              ) : (
                <span className="text-muted-foreground">0.00%</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CurrencyTicker;
