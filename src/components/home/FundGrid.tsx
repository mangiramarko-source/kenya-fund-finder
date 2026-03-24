import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { FundFromDB, YieldSnapshot } from "@/lib/api";
import type { ExchangeRate, Commodity } from "@/components/home/MarketTicker";

const categoryLabels: Record<string, string> = {
  money_market: "Money Market",
  fixed_income: "Fixed Income",
  balanced: "Balanced",
  equity: "Equity",
  bond: "Bond",
};

const categoryOrder = ["money_market", "fixed_income", "bond", "balanced", "equity"];

const fmtYield = (value: number, unit: string) => {
  if (unit === "%") return `${value}%`;
  return value.toFixed(2);
};

const currencyLabel = (unit: string) => {
  if (unit === "%") return "%";
  if (unit === "KES") return "KSh";
  return unit;
};

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  price: number;
  day_change: number;
  day_change_percent: number;
  volume: number;
  dividend_yield: number | null;
}

export function useStocksData() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("stocks_public")
        .select("id, symbol, name, sector, price, day_change, day_change_percent, volume, dividend_yield")
        .order("sort_order");
      setStocks(
        (data || []).map((s: any) => ({
          ...s,
          price: Number(s.price),
          day_change: Number(s.day_change),
          day_change_percent: Number(s.day_change_percent),
          volume: Number(s.volume),
          dividend_yield: s.dividend_yield != null ? Number(s.dividend_yield) : null,
        }))
      );
      setLoading(false);
    };
    fetch();

    const channel = supabase
      .channel("stocks-home-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stocks" }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { stocks, loading };
}

const ChangeIndicator = ({ change, pct }: { change: number; pct: number }) => {
  if (change > 0) return (
    <span className="inline-flex items-center gap-0.5 text-accent text-[10px] font-semibold tabular-nums">
      <TrendingUp className="h-2.5 w-2.5" />+{pct.toFixed(2)}%
    </span>
  );
  if (change < 0) return (
    <span className="inline-flex items-center gap-0.5 text-destructive text-[10px] font-semibold tabular-nums">
      <TrendingDown className="h-2.5 w-2.5" />{pct.toFixed(2)}%
    </span>
  );
  return <span className="text-muted-foreground text-[10px]"><Minus className="h-2.5 w-2.5 inline" /> 0.00%</span>;
};

const RateChangeIndicator = ({ current, previous }: { current: number; previous: number | null }) => {
  if (previous == null) return <span className="text-muted-foreground text-[10px]">—</span>;
  const diff = current - previous;
  const pct = previous !== 0 ? (diff / previous) * 100 : 0;
  if (diff > 0) return (
    <span className="inline-flex items-center gap-0.5 text-accent text-[10px] font-semibold tabular-nums">
      +{pct.toFixed(2)}%
    </span>
  );
  if (diff < 0) return (
    <span className="inline-flex items-center gap-0.5 text-destructive text-[10px] font-semibold tabular-nums">
      {pct.toFixed(2)}%
    </span>
  );
  return <span className="text-muted-foreground text-[10px]">0.00%</span>;
};

interface FundGridProps {
  funds: FundFromDB[];
  snapshots: Record<string, YieldSnapshot>;
  rates: ExchangeRate[];
  commodities: Commodity[];
  stocks: Stock[];
  loading: boolean;
  marketLoading: boolean;
  stocksLoading: boolean;
}

const MAX_VISIBLE = 8;

/* ─── Section Header (Yahoo Finance style) ─── */
const SectionHeader = ({ title, href, subtitle }: { title: string; href?: string; subtitle?: string }) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-baseline gap-3">
      {href ? (
        <Link to={href} className="group flex items-center gap-1.5">
          <h2 className="text-base font-bold text-foreground group-hover:text-accent transition-colors">{title}</h2>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
        </Link>
      ) : (
        <h2 className="text-base font-bold text-foreground">{title}</h2>
      )}
      {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
    </div>
  </div>
);

/* ─── Fund Category Column ─── */
const FundCategoryColumn = ({ category, funds }: { category: string; funds: FundFromDB[] }) => {
  const navigate = useNavigate();
  const bestYield = funds.length > 0 ? Math.max(...funds.map((f) => f.annual_yield)) : 0;
  const sorted = [...funds].sort((a, b) => b.annual_yield - a.annual_yield);
  const visible = sorted.slice(0, MAX_VISIBLE);
  const hasMore = sorted.length > MAX_VISIBLE;

  return (
    <div className="flex flex-col">
      <h3 className="text-[11px] font-bold text-foreground tracking-wide uppercase mb-1.5 px-1">{categoryLabels[category] || category}</h3>
      <div className="rounded-lg border border-border bg-card overflow-hidden flex-1 flex flex-col">
        <table className="w-full text-[10px] xl:text-[11px]">
          <thead>
            <tr className="text-[8px] xl:text-[9px] text-muted-foreground uppercase tracking-wider bg-muted/30">
              <th className="text-left pl-2 pr-0.5 py-1.5 font-medium">Fund</th>
              <th className="text-right px-0.5 py-1.5 font-medium w-12">Annual</th>
              <th className="text-right pl-0.5 pr-2 py-1.5 font-medium w-12">Daily</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((fund) => (
              <tr key={fund.id} onClick={() => navigate(`/compare/${fund.slug}`)} className="border-t border-border/30 hover:bg-muted/30 cursor-pointer transition-colors">
                <td className="pl-2 pr-0.5 py-[5px]">
                  <div className="flex items-center gap-0.5 min-w-0">
                    <Link to={`/compare/${fund.slug}`} onClick={(e) => e.stopPropagation()} className="font-medium text-foreground hover:text-accent transition-colors truncate block max-w-[80px] xl:max-w-[110px]" title={fund.name}>{fund.name}</Link>
                    {fund.annual_yield === bestYield && bestYield > 0 && (
                      <Badge variant="default" className="text-[5px] xl:text-[6px] px-0.5 py-0 h-2.5 bg-accent text-accent-foreground shrink-0 leading-none">TOP</Badge>
                    )}
                  </div>
                </td>
                <td className="text-right px-0.5 py-[5px] font-bold text-accent tabular-nums">{fmtYield(fund.annual_yield, fund.yield_unit)}</td>
                <td className="text-right pl-0.5 pr-2 py-[5px] text-muted-foreground tabular-nums">{fmtYield(fund.daily_yield, fund.yield_unit)}</td>
              </tr>
            ))}
            {visible.length < MAX_VISIBLE && Array.from({ length: MAX_VISIBLE - visible.length }).map((_, i) => (
              <tr key={`pad-${i}`} className="border-t border-border/30">
                <td className="pl-2 pr-0.5 py-[5px]"><span className="text-muted-foreground/20">—</span></td>
                <td /><td />
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-border mt-auto">
          {hasMore ? (
            <Link to={`/compare?type=${category}`} className="flex items-center justify-center px-2 py-1.5 text-[10px] font-semibold text-accent hover:bg-muted/30 transition-colors">
              See all {funds.length} →
            </Link>
          ) : (
            <div className="px-2 py-1.5 text-[10px] text-muted-foreground text-center">{funds.length} fund{funds.length !== 1 ? "s" : ""}</div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Currency Column ─── */
const CurrencyColumn = ({ rates }: { rates: ExchangeRate[] }) => {
  const visible = rates.slice(0, MAX_VISIBLE);
  const hasMore = rates.length > MAX_VISIBLE;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
      <table className="w-full text-[10px] xl:text-[11px]">
        <thead>
          <tr className="text-[8px] xl:text-[9px] text-muted-foreground uppercase tracking-wider bg-muted/30">
            <th className="text-left pl-2 pr-0.5 py-1.5 font-medium">Currency</th>
            <th className="text-right px-0.5 py-1.5 font-medium w-14">Rate</th>
            <th className="text-right pl-0.5 pr-2 py-1.5 font-medium w-14">Change</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr key={r.id} className="border-t border-border/30 hover:bg-muted/30 transition-colors">
              <td className="pl-2 pr-0.5 py-[5px]">
                <span className="font-bold text-foreground text-[10px] xl:text-[11px]">{r.currency_code}</span>
                <span className="block text-[7px] xl:text-[8px] text-muted-foreground truncate max-w-[80px] xl:max-w-[100px]">{r.currency_name}</span>
              </td>
              <td className="text-right px-0.5 py-[5px] font-bold text-accent tabular-nums">{r.rate.toFixed(2)}</td>
              <td className="text-right pl-0.5 pr-2 py-[5px]">
                <RateChangeIndicator current={r.rate} previous={r.previous_rate} />
              </td>
            </tr>
          ))}
          {visible.length < MAX_VISIBLE && Array.from({ length: MAX_VISIBLE - visible.length }).map((_, i) => (
            <tr key={`pad-${i}`} className="border-t border-border/30">
              <td className="pl-2 pr-0.5 py-[5px]"><span className="text-muted-foreground/20">—</span></td>
              <td /><td />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-border mt-auto">
        {hasMore ? (
          <Link to="/rates" className="flex items-center justify-center px-2 py-1.5 text-[10px] font-semibold text-accent hover:bg-muted/30 transition-colors">See all {rates.length} →</Link>
        ) : (
          <div className="px-2 py-1.5 text-[10px] text-muted-foreground text-center">{rates.length} rate{rates.length !== 1 ? "s" : ""}</div>
        )}
      </div>
    </div>
  );
};

/* ─── Commodities Column ─── */
const CommoditiesColumn = ({ commodities }: { commodities: Commodity[] }) => {
  const visible = commodities.slice(0, MAX_VISIBLE);
  const hasMore = commodities.length > MAX_VISIBLE;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
      <table className="w-full text-[10px] xl:text-[11px]">
        <thead>
          <tr className="text-[8px] xl:text-[9px] text-muted-foreground uppercase tracking-wider bg-muted/30">
            <th className="text-left pl-2 pr-0.5 py-1.5 font-medium">Item</th>
            <th className="text-right px-0.5 py-1.5 font-medium w-14">Price</th>
            <th className="text-right pl-0.5 pr-2 py-1.5 font-medium w-14">Change</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((c) => (
            <tr key={c.id} className="border-t border-border/30 hover:bg-muted/30 transition-colors">
              <td className="pl-2 pr-0.5 py-[5px]">
                <span className="font-bold text-foreground text-[10px] xl:text-[11px]">{c.symbol}</span>
                <span className="block text-[7px] xl:text-[8px] text-muted-foreground truncate max-w-[80px] xl:max-w-[100px]">{c.name}</span>
              </td>
              <td className="text-right px-0.5 py-[5px] font-bold text-accent tabular-nums">{c.price.toFixed(2)}</td>
              <td className="text-right pl-0.5 pr-2 py-[5px]">
                <RateChangeIndicator current={c.price} previous={c.previous_price} />
              </td>
            </tr>
          ))}
          {visible.length < MAX_VISIBLE && Array.from({ length: MAX_VISIBLE - visible.length }).map((_, i) => (
            <tr key={`pad-${i}`} className="border-t border-border/30">
              <td className="pl-2 pr-0.5 py-[5px]"><span className="text-muted-foreground/20">—</span></td>
              <td /><td />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-border mt-auto">
        {hasMore ? (
          <Link to="/commodities" className="flex items-center justify-center px-2 py-1.5 text-[10px] font-semibold text-accent hover:bg-muted/30 transition-colors">See all {commodities.length} →</Link>
        ) : (
          <div className="px-2 py-1.5 text-[10px] text-muted-foreground text-center">{commodities.length} item{commodities.length !== 1 ? "s" : ""}</div>
        )}
      </div>
    </div>
  );
};

/* ─── NSE Stocks Column ─── */
const StocksColumn = ({ stocks }: { stocks: Stock[] }) => {
  const visible = stocks.slice(0, MAX_VISIBLE);
  const hasMore = stocks.length > MAX_VISIBLE;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
      <table className="w-full text-[10px] xl:text-[11px]">
        <thead>
          <tr className="text-[8px] xl:text-[9px] text-muted-foreground uppercase tracking-wider bg-muted/30">
            <th className="text-left pl-2 pr-0.5 py-1.5 font-medium">Symbol</th>
            <th className="text-right px-0.5 py-1.5 font-medium w-12">Price</th>
            <th className="text-right pl-0.5 pr-2 py-1.5 font-medium w-14">Change</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((s) => (
            <tr key={s.id} className="border-t border-border/30 hover:bg-muted/30 transition-colors">
              <td className="pl-2 pr-0.5 py-[5px]">
                <span className="font-bold text-foreground text-[10px] xl:text-[11px]">{s.symbol}</span>
                <span className="block text-[7px] xl:text-[8px] text-muted-foreground truncate max-w-[80px] xl:max-w-[100px]">{s.name}</span>
              </td>
              <td className="text-right px-0.5 py-[5px] font-semibold text-foreground tabular-nums">{s.price.toFixed(2)}</td>
              <td className="text-right pl-0.5 pr-2 py-[5px]">
                <ChangeIndicator change={s.day_change} pct={s.day_change_percent} />
              </td>
            </tr>
          ))}
          {visible.length < MAX_VISIBLE && Array.from({ length: MAX_VISIBLE - visible.length }).map((_, i) => (
            <tr key={`pad-${i}`} className="border-t border-border/30">
              <td className="pl-2 pr-0.5 py-[5px]"><span className="text-muted-foreground/20">—</span></td>
              <td /><td />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-border mt-auto">
        {hasMore ? (
          <Link to="/stocks" className="flex items-center justify-center px-2 py-1.5 text-[10px] font-semibold text-accent hover:bg-muted/30 transition-colors">See all {stocks.length} →</Link>
        ) : (
          <div className="px-2 py-1.5 text-[10px] text-muted-foreground text-center">{stocks.length} stock{stocks.length !== 1 ? "s" : ""}</div>
        )}
      </div>
    </div>
  );
};

/* ─── Skeleton ─── */
const SectionSkeleton = ({ cols }: { cols: number }) => (
  <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
    {Array.from({ length: cols }).map((_, i) => (
      <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="bg-muted/30 px-2 py-1.5"><Skeleton className="h-3 w-12" /></div>
        <table className="w-full">
          <tbody>
            {Array.from({ length: 8 }).map((_, j) => (
              <tr key={j} className="border-t border-border/30">
                <td className="px-2 py-[5px]"><Skeleton className="h-3 w-20" /></td>
                <td className="px-1 py-[5px]"><Skeleton className="h-3 w-10" /></td>
                <td className="px-1 py-[5px]"><Skeleton className="h-3 w-10" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ))}
  </div>
);

/* ─── Main Grid (Yahoo Finance-inspired) ─── */
const FundGrid = ({ funds, snapshots, rates, commodities, stocks, loading, marketLoading, stocksLoading }: FundGridProps) => {
  const grouped: Record<string, FundFromDB[]> = {};
  funds.forEach((f) => {
    if (!grouped[f.fund_type]) grouped[f.fund_type] = [];
    grouped[f.fund_type].push(f);
  });

  const fundCategories = Object.keys(grouped).sort((a, b) => {
    const ai = categoryOrder.indexOf(a);
    const bi = categoryOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <div className="space-y-6">
      {/* ── Section 1: Trust Funds ── */}
      <section>
        <SectionHeader title="Trust Funds" href="/compare" subtitle="CMA-regulated unit trusts" />
        {loading ? (
          <SectionSkeleton cols={Math.min(fundCategories.length || 5, 5)} />
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(fundCategories.length, 5)}, minmax(0, 1fr))` }}>
            {fundCategories.map((cat) => (
              <FundCategoryColumn key={cat} category={cat} funds={grouped[cat]} />
            ))}
          </div>
        )}
      </section>

      {/* ── Section 2: Assets (Currency, Commodities, NSE Stocks) ── */}
      <section>
        <SectionHeader title="Assets" subtitle="Market data & prices" />
        {(marketLoading && stocksLoading) ? (
          <SectionSkeleton cols={3} />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col">
              <h3 className="text-[11px] font-bold text-foreground tracking-wide uppercase mb-1.5 px-1">
                <Link to="/rates" className="hover:text-accent transition-colors inline-flex items-center gap-1">Currencies <ArrowRight className="h-3 w-3" /></Link>
              </h3>
              <CurrencyColumn rates={rates} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-[11px] font-bold text-foreground tracking-wide uppercase mb-1.5 px-1">
                <Link to="/commodities" className="hover:text-accent transition-colors inline-flex items-center gap-1">Commodities <ArrowRight className="h-3 w-3" /></Link>
              </h3>
              <CommoditiesColumn commodities={commodities} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-[11px] font-bold text-foreground tracking-wide uppercase mb-1.5 px-1">
                <Link to="/stocks" className="hover:text-accent transition-colors inline-flex items-center gap-1">NSE Stocks <ArrowRight className="h-3 w-3" /></Link>
              </h3>
              <StocksColumn stocks={stocks} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

/* ─── Mobile Cards: Stocks ─── */
export const StocksMobileCards = ({ stocks, loading }: { stocks: Stock[]; loading: boolean }) => {
  if (loading) return (
    <div className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-3.5">
          <Skeleton className="h-5 w-20 mb-2" />
          <Skeleton className="h-4 w-40 mb-3" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ))}
    </div>
  );
  if (stocks.length === 0) return (
    <div className="rounded-xl border border-border bg-card text-center py-14">
      <p className="text-sm text-muted-foreground">No stocks available</p>
    </div>
  );

  return (
    <div className="space-y-2.5">
      {stocks.map((s) => (
        <Link key={s.id} to="/stocks" className="block rounded-xl border border-border bg-card p-3.5 hover:bg-muted/30 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="font-bold text-foreground">{s.symbol}</span>
              <span className="block text-xs text-muted-foreground">{s.name}</span>
            </div>
            <ChangeIndicator change={s.day_change} pct={s.day_change_percent} />
          </div>
          <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Price (KSh)</p>
            <p className="font-bold text-foreground text-lg tabular-nums">{s.price.toFixed(2)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default FundGrid;
