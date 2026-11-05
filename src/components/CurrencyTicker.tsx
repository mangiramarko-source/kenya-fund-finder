import { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

export interface TickerItem {
  id: string;
  rawId: string;
  category: "fx" | "commodity";
  label: string;
  value: number;
  previousValue: number | null;
  unit?: string;
  sparkData?: number[];
}

export const DEFAULT_TICKER_ITEMS: TickerItem[] = [
  { id: "fx-usd", rawId: "USD", category: "fx", label: "USD/KES", value: 129.20, previousValue: 129.35 },
  { id: "fx-eur", rawId: "EUR", category: "fx", label: "EUR/KES", value: 139.80, previousValue: 140.10 },
  { id: "fx-gbp", rawId: "GBP", category: "fx", label: "GBP/KES", value: 167.40, previousValue: 167.85 },
  { id: "cmd-oil", rawId: "oil", category: "commodity", label: "Crude Oil", value: 74.80, previousValue: 75.20, unit: "USD/bbl" },
  { id: "cmd-gold", rawId: "gold", category: "commodity", label: "Gold", value: 2745.50, previousValue: 2735.00, unit: "USD/oz" },
  { id: "cmd-petrol", rawId: "petrol", category: "commodity", label: "EPRA Petrol", value: 180.60, previousValue: 182.00, unit: "KES/L" },
];

const CurrencyTicker = () => {
  const [items, setItems] = useState<TickerItem[]>(DEFAULT_TICKER_ITEMS);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [paused, setPaused] = useState(false);
  const navigate = useNavigate();

  // Touch tracking to distinguish tap from swipe
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isSwiping = useRef(false);

  const fetchItems = async () => {
    try {
      const [ratesRes, commoditiesRes, rateHistRes] = await Promise.all([
        supabase
          .from("exchange_rates_public" as any)
          .select("id, currency_code, rate, previous_rate")
          .order("sort_order"),
        supabase
          .from("commodities_public" as any)
          .select("id, name, symbol, price, previous_price, unit")
          .order("sort_order"),
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
      Object.keys(historyMap).forEach((k) => {
        historyMap[k] = historyMap[k].slice(-20);
      });

      const rates: TickerItem[] = (ratesRes.data || []).map((r: any) => ({
        id: `fx-${r.id}`,
        rawId: r.currency_code || r.id,
        category: "fx" as const,
        label: `${r.currency_code}/KES`,
        value: r.rate,
        previousValue: r.previous_rate,
        sparkData: historyMap[r.id],
      }));

      const commodities: TickerItem[] = (commoditiesRes.data || []).map((c: any) => ({
        id: `cmd-${c.id}`,
        rawId: c.symbol || c.name || c.id,
        category: "commodity" as const,
        label: c.symbol || c.name,
        value: c.price,
        previousValue: c.previous_price,
        unit: c.unit,
      }));

      const combined = [...rates, ...commodities];
      if (combined.length > 0) {
        setItems(combined);
      }
    } catch (err) {
      console.warn("Failed to fetch ticker items:", err);
    }
  };

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel("ticker-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "exchange_rates" }, () => fetchItems())
      .on("postgres_changes", { event: "*", schema: "public", table: "commodities" }, () => fetchItems())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  const handleTouchStart = (e: React.TouchEvent) => {
    setPaused(true);
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (dx > 8 || dy > 8) {
      isSwiping.current = true;
    }
  };

  const handleTouchEnd = () => {
    setTimeout(() => setPaused(false), 800);
  };

  const getItemUrl = (item: TickerItem) => {
    if (item.category === "fx") {
      return `/rates?tab=fx&item=${encodeURIComponent(item.rawId)}`;
    }
    return `/rates?tab=commodities&item=${encodeURIComponent(item.rawId)}`;
  };

  return (
    <div
      data-testid="currency-ticker-track"
      className="flex h-9 w-full min-w-0 max-w-full items-center overflow-hidden border-y border-zinc-200/90 dark:border-border/80 bg-zinc-100 dark:bg-card px-4 text-zinc-900 dark:text-card-foreground shadow-xs select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={scrollRef}
        className="animate-marquee flex w-max shrink-0 gap-8 whitespace-nowrap"
        style={{
          animationPlayState: paused ? "paused" : "running",
          animationDuration: `${items.length * (isMobile ? 3.5 : 4.5)}s`,
        }}
      >
        {doubled.map((item, i) => {
          const isClone = i >= items.length;
          const diff = item.previousValue != null ? item.value - item.previousValue : null;
          const pct =
            diff != null && item.previousValue !== 0
              ? ((diff / item.previousValue!) * 100).toFixed(2)
              : null;
          const isUp = diff != null && diff > 0;
          const isDown = diff != null && diff < 0;
          const destination = getItemUrl(item);

          return (
            <Link
              key={`${item.id}-${i}`}
              to={destination}
              aria-hidden={isClone ? "true" : undefined}
              tabIndex={isClone ? -1 : 0}
              onClick={(e) => {
                if (isSwiping.current) {
                  e.preventDefault();
                }
              }}
              className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer transition-opacity hover:opacity-75 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-emerald-500 rounded-sm"
            >
              <span className="text-zinc-700 dark:text-muted-foreground font-semibold tracking-tight">
                {item.label}
              </span>
              <span className="text-zinc-950 dark:text-foreground font-bold tabular-nums">
                {item.value.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              {pct != null ? (
                <span
                  className={
                    isUp
                      ? "text-emerald-600 dark:text-emerald-400 font-bold tabular-nums"
                      : isDown
                        ? "text-red-600 dark:text-red-400 font-bold tabular-nums"
                        : "text-zinc-500 dark:text-muted-foreground font-medium tabular-nums"
                  }
                >
                  {isUp ? "+" : ""}
                  {pct}%
                </span>
              ) : (
                <span className="text-zinc-500 dark:text-muted-foreground font-medium tabular-nums">0.00%</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default CurrencyTicker;
