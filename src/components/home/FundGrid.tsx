import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
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

/* ─── Fund Category Card ─── */
const FundCategoryCard = ({ category, funds }: { category: string; funds: FundFromDB[] }) => {
  const navigate = useNavigate();
  const bestYield = funds.length > 0 ? Math.max(...funds.map((f) => f.annual_yield)) : 0;
  const sorted = [...funds].sort((a, b) => b.annual_yield - a.annual_yield);
  const visible = sorted.slice(0, MAX_VISIBLE);
  const hasMore = sorted.length > MAX_VISIBLE;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
      <div className="bg-muted/50 px-3 py-2 flex items-center justify-between border-b border-border">
        <h3 className="text-[11px] font-bold text-foreground tracking-wide uppercase">
          {categoryLabels[category] || category}
        </h3>
        <span className="text-[10px] text-muted-foreground">{funds.length}</span>
      </div>
      <table className="w-full text-[10px] xl:text-[11px]">
        <thead>
          <tr className="text-[8px] xl:text-[9px] text-muted-foreground uppercase tracking-wider">
            <th className="text-left pl-2.5 pr-0.5 py-1 font-medium w-4">#</th>
            <th className="text-left px-0.5 py-1 font-medium">Fund</th>
            <th className="text-center px-0.5 py-1 font-medium w-6">Unit</th>
            <th className="text-right px-0.5 py-1 font-medium w-10">Daily</th>
            <th className="text-right pl-0.5 pr-2.5 py-1 font-medium w-11">Annual</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((fund, i) => (
            <tr key={fund.id} onClick={() => navigate(`/compare/${fund.slug}`)} className="border-t border-border/30 hover:bg-muted/30 cursor-pointer transition-colors">
              <td className="pl-2.5 pr-0.5 py-[5px] text-muted-foreground tabular-nums text-[8px]">{i + 1}</td>
              <td className="px-0.5 py-[5px]">
                <div className="flex items-center gap-0.5 min-w-0">
                  <Link to={`/compare/${fund.slug}`} onClick={(e) => e.stopPropagation()} className="font-medium text-foreground hover:text-accent transition-colors truncate block max-w-[90px] xl:max-w-[120px]" title={fund.name}>{fund.name}</Link>
                  {fund.annual_yield === bestYield && bestYield > 0 && (
                    <Badge variant="default" className="text-[5px] xl:text-[6px] px-0.5 py-0 h-2.5 bg-accent text-accent-foreground shrink-0 leading-none">TOP</Badge>
                  )}
                </div>
              </td>
              <td className="text-center px-0.5 py-[5px] text-muted-foreground text-[8px]">{currencyLabel(fund.yield_unit)}</td>
              <td className="text-right px-0.5 py-[5px] text-muted-foreground tabular-nums">{fmtYield(fund.daily_yield, fund.yield_unit)}</td>
              <td className="text-right pl-0.5 pr-2.5 py-[5px] font-bold text-accent tabular-nums">{fmtYield(fund.annual_yield, fund.yield_unit)}</td>
            </tr>
          ))}
          {visible.length < MAX_VISIBLE && Array.from({ length: MAX_VISIBLE - visible.length }).map((_, i) => (
            <tr key={`pad-${i}`} className="border-t border-border/30">
              <td className="pl-2.5 pr-0.5 py-[5px] text-muted-foreground/30 tabular-nums text-[8px]">{visible.length + i + 1}</td>
              <td className="px-0.5 py-[5px]"><span className="text-muted-foreground/20">—</span></td>
              <td /><td /><td />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-border mt-auto">
        {hasMore ? (
          <Link to={`/compare?type=${category}`} className="flex items-center justify-center px-3 py-2 text-[10px] font-semibold text-accent hover:bg-muted/30 transition-colors">
            See all {funds.length} →
          </Link>
        ) : (
          <div className="px-3 py-2 text-[10px] text-muted-foreground text-center">{funds.length} fund{funds.length !== 1 ? "s" : ""}</div>
        )}
      </div>
    </div>
  );
};

/* ─── FX Rates Card ─── */
const RatesCard = ({ rates }: { rates: ExchangeRate[] }) => {
  const visible = rates.slice(0, MAX_VISIBLE);
  const hasMore = rates.length > MAX_VISIBLE;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
      <div className="bg-muted/50 px-3 py-2 flex items-center justify-between border-b border-border">
        <h3 className="text-[11px] font-bold text-foreground tracking-wide uppercase">Currency</h3>
        <span className="text-[10px] text-muted-foreground">{rates.length}</span>
      </div>
      <table className="w-full text-[10px] xl:text-[11px]">
        <thead>
          <tr className="text-[8px] xl:text-[9px] text-muted-foreground uppercase tracking-wider">
            <th className="text-left pl-2.5 pr-0.5 py-1 font-medium w-4">#</th>
            <th className="text-left px-0.5 py-1 font-medium">Currency</th>
            <th className="text-center px-0.5 py-1 font-medium w-6">Code</th>
            <th className="text-right px-0.5 py-1 font-medium w-10">Prev</th>
            <th className="text-right pl-0.5 pr-2.5 py-1 font-medium w-11">Rate</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r, i) => (
            <tr key={r.id} className="border-t border-border/30 hover:bg-muted/30 transition-colors">
              <td className="pl-2.5 pr-0.5 py-[5px] text-muted-foreground tabular-nums text-[8px]">{i + 1}</td>
              <td className="px-0.5 py-[5px]"><span className="font-medium text-foreground truncate block max-w-[90px] xl:max-w-[120px]" title={r.currency_name}>{r.currency_name}</span></td>
              <td className="text-center px-0.5 py-[5px] text-muted-foreground text-[8px]">{r.currency_code}</td>
              <td className="text-right px-0.5 py-[5px] text-muted-foreground tabular-nums">{r.previous_rate != null ? r.previous_rate.toFixed(2) : "—"}</td>
              <td className="text-right pl-0.5 pr-2.5 py-[5px] font-bold text-accent tabular-nums">{r.rate.toFixed(2)}</td>
            </tr>
          ))}
          {visible.length < MAX_VISIBLE && Array.from({ length: MAX_VISIBLE - visible.length }).map((_, i) => (
            <tr key={`pad-${i}`} className="border-t border-border/30">
              <td className="pl-2.5 pr-0.5 py-[5px] text-muted-foreground/30 tabular-nums text-[8px]">{visible.length + i + 1}</td>
              <td className="px-0.5 py-[5px]"><span className="text-muted-foreground/20">—</span></td>
              <td /><td /><td />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-border mt-auto">
        {hasMore ? (
          <Link to="/rates" className="flex items-center justify-center px-3 py-2 text-[10px] font-semibold text-accent hover:bg-muted/30 transition-colors">See all {rates.length} →</Link>
        ) : (
          <div className="px-3 py-2 text-[10px] text-muted-foreground text-center">{rates.length} rate{rates.length !== 1 ? "s" : ""}</div>
        )}
      </div>
    </div>
  );
};

/* ─── Commodities Card ─── */
const CommoditiesCard = ({ commodities }: { commodities: Commodity[] }) => {
  const visible = commodities.slice(0, MAX_VISIBLE);
  const hasMore = commodities.length > MAX_VISIBLE;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
      <div className="bg-muted/50 px-3 py-2 flex items-center justify-between border-b border-border">
        <h3 className="text-[11px] font-bold text-foreground tracking-wide uppercase">Commodities</h3>
        <span className="text-[10px] text-muted-foreground">{commodities.length}</span>
      </div>
      <table className="w-full text-[10px] xl:text-[11px]">
        <thead>
          <tr className="text-[8px] xl:text-[9px] text-muted-foreground uppercase tracking-wider">
            <th className="text-left pl-2.5 pr-0.5 py-1 font-medium w-4">#</th>
            <th className="text-left px-0.5 py-1 font-medium">Item</th>
            <th className="text-center px-0.5 py-1 font-medium w-6">Unit</th>
            <th className="text-right pl-0.5 pr-2.5 py-1 font-medium w-11">Price</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((c, i) => (
            <tr key={c.id} className="border-t border-border/30 hover:bg-muted/30 transition-colors">
              <td className="pl-2.5 pr-0.5 py-[5px] text-muted-foreground tabular-nums text-[8px]">{i + 1}</td>
              <td className="px-0.5 py-[5px]"><span className="font-medium text-foreground truncate block max-w-[90px] xl:max-w-[120px]" title={c.name}>{c.name}</span></td>
              <td className="text-center px-0.5 py-[5px] text-muted-foreground text-[8px]">{c.unit}</td>
              <td className="text-right pl-0.5 pr-2.5 py-[5px] font-bold text-accent tabular-nums">{c.price.toFixed(2)}</td>
            </tr>
          ))}
          {visible.length < MAX_VISIBLE && Array.from({ length: MAX_VISIBLE - visible.length }).map((_, i) => (
            <tr key={`pad-${i}`} className="border-t border-border/30">
              <td className="pl-2.5 pr-0.5 py-[5px] text-muted-foreground/30 tabular-nums text-[8px]">{visible.length + i + 1}</td>
              <td className="px-0.5 py-[5px]"><span className="text-muted-foreground/20">—</span></td>
              <td /><td />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-border mt-auto">
        {hasMore ? (
          <Link to="/commodities" className="flex items-center justify-center px-3 py-2 text-[10px] font-semibold text-accent hover:bg-muted/30 transition-colors">See all {commodities.length} →</Link>
        ) : (
          <div className="px-3 py-2 text-[10px] text-muted-foreground text-center">{commodities.length} item{commodities.length !== 1 ? "s" : ""}</div>
        )}
      </div>
    </div>
  );
};

/* ─── NSE Stocks Card ─── */
const formatVolume = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
};

const StocksCard = ({ stocks }: { stocks: Stock[] }) => {
  const visible = stocks.slice(0, MAX_VISIBLE);
  const hasMore = stocks.length > MAX_VISIBLE;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
      <div className="bg-muted/50 px-3 py-2 flex items-center justify-between border-b border-border">
        <h3 className="text-[11px] font-bold text-foreground tracking-wide uppercase">NSE Stocks</h3>
        <span className="text-[10px] text-muted-foreground">{stocks.length}</span>
      </div>
      <table className="w-full text-[10px] xl:text-[11px]">
        <thead>
          <tr className="text-[8px] xl:text-[9px] text-muted-foreground uppercase tracking-wider">
            <th className="text-left pl-2.5 pr-0.5 py-1 font-medium w-4">#</th>
            <th className="text-left px-0.5 py-1 font-medium">Symbol</th>
            <th className="text-right px-0.5 py-1 font-medium w-11">Price</th>
            <th className="text-right pl-0.5 pr-2.5 py-1 font-medium w-14">Change</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((s, i) => (
            <tr key={s.id} className="border-t border-border/30 hover:bg-muted/30 transition-colors">
              <td className="pl-2.5 pr-0.5 py-[5px] text-muted-foreground tabular-nums text-[8px]">{i + 1}</td>
              <td className="px-0.5 py-[5px]">
                <span className="font-bold text-foreground text-[10px] xl:text-[11px]">{s.symbol}</span>
                <span className="block text-[7px] xl:text-[8px] text-muted-foreground truncate max-w-[80px] xl:max-w-[110px]">{s.name}</span>
              </td>
              <td className="text-right px-0.5 py-[5px] font-semibold text-foreground tabular-nums">{s.price.toFixed(2)}</td>
              <td className="text-right pl-0.5 pr-2.5 py-[5px]">
                <ChangeIndicator change={s.day_change} pct={s.day_change_percent} />
              </td>
            </tr>
          ))}
          {visible.length < MAX_VISIBLE && Array.from({ length: MAX_VISIBLE - visible.length }).map((_, i) => (
            <tr key={`pad-${i}`} className="border-t border-border/30">
              <td className="pl-2.5 pr-0.5 py-[5px] text-muted-foreground/30 tabular-nums text-[8px]">{visible.length + i + 1}</td>
              <td className="px-0.5 py-[5px]"><span className="text-muted-foreground/20">—</span></td>
              <td /><td />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-border mt-auto">
        {hasMore ? (
          <Link to="/stocks" className="flex items-center justify-center px-3 py-2 text-[10px] font-semibold text-accent hover:bg-muted/30 transition-colors">See all {stocks.length} →</Link>
        ) : (
          <div className="px-3 py-2 text-[10px] text-muted-foreground text-center">{stocks.length} stock{stocks.length !== 1 ? "s" : ""}</div>
        )}
      </div>
    </div>
  );
};

/* ─── Grid Skeleton ─── */
const GridSkeleton = () => (
  <div className="grid grid-cols-4 gap-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="bg-muted/50 px-3 py-2 border-b border-border"><Skeleton className="h-3.5 w-20" /></div>
        <table className="w-full">
          <tbody>
            {Array.from({ length: 8 }).map((_, j) => (
              <tr key={j} className="border-t border-border/30">
                <td className="px-2.5 py-[5px]"><Skeleton className="h-3 w-4" /></td>
                <td className="px-1 py-[5px]"><Skeleton className="h-3 w-20" /></td>
                <td className="px-1 py-[5px]"><Skeleton className="h-3 w-8" /></td>
                <td className="px-1 py-[5px]"><Skeleton className="h-3 w-10" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ))}
  </div>
);

/* ─── Main Grid ─── */
const FundGrid = ({ funds, snapshots, rates, commodities, stocks, loading, marketLoading, stocksLoading }: FundGridProps) => {
  if (loading) return <GridSkeleton />;

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

  type CardDef =
    | { type: "fund"; category: string }
    | { type: "rates" }
    | { type: "commodities" }
    | { type: "stocks" };

  const cards: CardDef[] = [
    ...fundCategories.map((c) => ({ type: "fund" as const, category: c })),
    ...(rates.length > 0 ? [{ type: "rates" as const }] : []),
    ...(commodities.length > 0 ? [{ type: "commodities" as const }] : []),
    ...(stocks.length > 0 ? [{ type: "stocks" as const }] : []),
  ];

  // 4-column rows
  const rows: CardDef[][] = [];
  for (let i = 0; i < cards.length; i += 4) {
    rows.push(cards.slice(i, i + 4));
  }

  return (
    <div className="space-y-3">
      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-4 gap-3" style={{ alignItems: "stretch" }}>
          {row.map((card) => {
            if (card.type === "fund") return <FundCategoryCard key={card.category} category={card.category} funds={grouped[card.category]} />;
            if (card.type === "rates") return <RatesCard key="rates" rates={rates} />;
            if (card.type === "commodities") return <CommoditiesCard key="commodities" commodities={commodities} />;
            return <StocksCard key="stocks" stocks={stocks} />;
          })}
          {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, i) => <div key={`empty-${i}`} />)}
        </div>
      ))}
    </div>
  );
};

export default FundGrid;
