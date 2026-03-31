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
      className="w-full bg-[hsl(220,60%,12%)] overflow-x-auto scrollbar-hide border-b border-border/30 cursor-grab active:cursor-grabbing"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div
        ref={scrollRef}
        className="flex whitespace-nowrap"
        style={{
          animation: `ticker-scroll ${items.length * (isMobile ? 1.2 : 2)}s linear infinite`,
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

          const prev = i > 0 ? doubled[i - 1] : null;
          const prevPrefix = prev ? prev.id.split("-")[0] : null;
          const curPrefix = item.id.split("-")[0];
          const showSep = prev && prevPrefix !== curPrefix;

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
              {item.sparkData && item.sparkData.length >= 3 && (
                <Sparkline
                  data={item.sparkData}
                  width={40}
                  height={14}
                  color="auto"
                  className="opacity-80"
                />
              )}
              <span className="font-bold text-white tabular-nums">
                {item.value.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                {item.unit && (
                  <span className="text-white/60 font-normal ml-0.5 text-[10px]">
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
