import { useEffect, useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { CountryFlagCircle } from "@/components/stocks/MobileCountryExchangeSheet";
import { fetchPublicData } from "@/lib/gateway";
import type { StockExchangeCode } from "@/lib/stockCache";
import { EAST_AFRICAN_MARKETS } from "@/lib/stockExchangeSelection";

interface ExchangeBreadthStats {
  total: number;
  gainers: number;
  losers: number;
}

interface DesktopCountryMarketStripProps {
  selectedExchange: StockExchangeCode;
  onSelectExchange: (exchange: StockExchangeCode) => void;
  activeStats?: ExchangeBreadthStats;
}

let cachedBreadth: Partial<Record<StockExchangeCode, ExchangeBreadthStats>> | null = null;

export default function DesktopCountryMarketStrip({
  selectedExchange,
  onSelectExchange,
  activeStats,
}: DesktopCountryMarketStripProps) {
  const [statsByExchange, setStatsByExchange] = useState<
    Partial<Record<StockExchangeCode, ExchangeBreadthStats>>
  >(() => cachedBreadth ?? {});

  useEffect(() => {
    if (cachedBreadth) return;
    let cancelled = false;
    fetchPublicData<{ exchange?: string | null; day_change?: number | string | null }>("stocks", {
      select: ["exchange", "day_change"],
      limit: 200,
    })
      .then(({ data }) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        const grouped: Partial<Record<StockExchangeCode, ExchangeBreadthStats>> = {};
        for (const row of data) {
          const ex = (row.exchange || "NSE").toUpperCase() as StockExchangeCode;
          const entry = grouped[ex] ?? { total: 0, gainers: 0, losers: 0 };
          const chg = Number(row.day_change ?? 0);
          entry.total += 1;
          if (chg > 0) entry.gainers += 1;
          else if (chg < 0) entry.losers += 1;
          grouped[ex] = entry;
        }
        cachedBreadth = grouped;
        setStatsByExchange(grouped);
      })
      .catch(() => {
        // Fallback silently to defaultCount per market
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
      role="tablist"
      aria-label="East African stock markets"
    >
      {EAST_AFRICAN_MARKETS.map((market) => {
        const active = selectedExchange === market.exchange;
        const stats =
          active && activeStats && activeStats.total > 0
            ? activeStats
            : statsByExchange[market.exchange];
        const total = stats?.total ?? market.defaultCount;

        return (
          <button
            key={market.exchange}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`desktop-country-tab-${market.exchange}`}
            onClick={() => onSelectExchange(market.exchange)}
            className={`group rounded-2xl border p-4 text-left transition-all cursor-pointer ${
              active
                ? "border-emerald-500 bg-emerald-500/[0.06] ring-2 ring-emerald-500/20 shadow-sm"
                : "border-border bg-card hover:border-border/90 hover:bg-muted/30"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <CountryFlagCircle
                  countryCode={market.countryCode}
                  countryName={market.countryName}
                  size={28}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-foreground">
                      {market.countryName}
                    </span>
                    <span
                      className={`text-[10px] font-bold tracking-wide ${
                        active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      }`}
                    >
                      {market.exchange}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {market.currency} · {market.exchangeName}
                  </p>
                </div>
              </div>

              {active ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
              ) : (
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5 text-[11px]">
              <span className="font-semibold text-foreground tabular-nums">
                {total} equities
              </span>
              {stats ? (
                <span className="font-medium tabular-nums">
                  <span className="text-emerald-500">{stats.gainers} up</span>
                  <span className="text-muted-foreground mx-1">·</span>
                  <span className="text-destructive">{stats.losers} dn</span>
                </span>
              ) : (
                <span className="text-muted-foreground">{market.currency}</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
