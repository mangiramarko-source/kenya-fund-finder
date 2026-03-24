import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, DollarSign, Landmark, TrendingUp, Briefcase, Scale, BarChart3, Gem, ArrowRight } from "lucide-react";
import type { FundFromDB, YieldSnapshot } from "@/lib/api";
import type { ExchangeRate, Commodity, Stock } from "@/components/home/MarketTicker";

const categoryMeta: Record<string, { label: string; icon: typeof LineChart; colorVar: string }> = {
  stocks:       { label: "NSE Stocks",    icon: LineChart,   colorVar: "--cat-stocks" },
  fx_rates:     { label: "FX Rates",      icon: DollarSign,  colorVar: "--cat-fx" },
  money_market: { label: "Money Market",  icon: Landmark,    colorVar: "--cat-money-market" },
  fixed_income: { label: "Fixed Income",  icon: TrendingUp,  colorVar: "--cat-fixed-income" },
  bond:         { label: "Bonds",         icon: Briefcase,   colorVar: "--cat-bond" },
  balanced:     { label: "Balanced",      icon: Scale,       colorVar: "--cat-balanced" },
  equity:       { label: "Equity",        icon: BarChart3,   colorVar: "--cat-equity" },
  commodities:  { label: "Commodities",   icon: Gem,         colorVar: "--cat-commodities" },
};

const categoryOrder = ["stocks", "fx_rates", "money_market", "fixed_income", "bond", "balanced", "equity", "commodities"];

const fmtYield = (value: number, unit: string) => {
  if (unit === "%") return `${value}%`;
  return value.toFixed(2);
};

const currencyLabel = (unit: string) => {
  if (unit === "%") return "%";
  if (unit === "KES") return "KSh";
  return unit;
};

interface FundGridProps {
  funds: FundFromDB[];
  snapshots: Record<string, YieldSnapshot>;
  rates: ExchangeRate[];
  commodities: Commodity[];
  stocks: Stock[];
  loading: boolean;
  marketLoading: boolean;
}

const MAX_VISIBLE = 5;

/* ─── Shared Card Shell ─── */
const CardShell = ({
  catKey,
  count,
  countLabel,
  children,
  footer,
  animDelay = 0,
}: {
  catKey: string;
  count: number;
  countLabel: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  animDelay?: number;
}) => {
  const meta = categoryMeta[catKey] || { label: catKey, icon: BarChart3, colorVar: "--accent" };
  const Icon = meta.icon;

  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden flex flex-col card-lift animate-fade-in"
      style={{
        animationDelay: `${animDelay}ms`,
        borderTop: `2px solid hsl(var(${meta.colorVar}))`,
      }}
    >
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center h-6 w-6 rounded-lg"
            style={{ background: `hsl(var(${meta.colorVar}) / 0.12)` }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: `hsl(var(${meta.colorVar}))` }} />
          </div>
          <h3 className="text-xs font-bold text-foreground tracking-wide uppercase">
            {meta.label}
          </h3>
        </div>
        <span
          className="text-[10px] font-semibold tabular-nums rounded-full px-2 py-0.5"
          style={{
            background: `hsl(var(${meta.colorVar}) / 0.08)`,
            color: `hsl(var(${meta.colorVar}))`,
          }}
        >
          {count} {countLabel}
        </span>
      </div>

      {/* Table content */}
      {children}

      {/* Footer */}
      <div className="border-t border-border mt-auto">{footer}</div>
    </div>
  );
};

/* ─── Section Header ─── */
const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="flex items-center gap-3 mb-3 mt-1">
    <h2 className="text-sm font-bold text-foreground tracking-wide uppercase">{title}</h2>
    <div className="h-px flex-1 bg-border" />
    <span className="text-[10px] text-muted-foreground font-medium">{subtitle}</span>
  </div>
);

/* ─── Fund Category Card ─── */
const FundCategoryCard = ({
  category,
  funds,
  delay,
}: {
  category: string;
  funds: FundFromDB[];
  delay: number;
}) => {
  const navigate = useNavigate();
  const bestYield = funds.length > 0 ? Math.max(...funds.map((f) => f.annual_yield)) : 0;
  const sorted = [...funds].sort((a, b) => b.annual_yield - a.annual_yield);
  const visible = sorted.slice(0, MAX_VISIBLE);
  const hasMore = sorted.length > MAX_VISIBLE;

  return (
    <CardShell
      catKey={category}
      count={funds.length}
      countLabel="funds"
      animDelay={delay}
      footer={
        hasMore ? (
          <Link
            to={`/compare?type=${category}`}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-semibold text-accent hover:bg-muted/40 transition-colors group"
          >
            View all {funds.length} funds <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ) : (
          <div className="px-4 py-2 text-[10px] text-muted-foreground text-center tabular-nums">
            {funds.length} fund{funds.length !== 1 ? "s" : ""}
          </div>
        )
      }
    >
      <table className="w-full text-[11px] lg:text-xs">
        <thead>
          <tr className="text-[9px] lg:text-[10px] text-muted-foreground uppercase tracking-wider border-t border-border/40">
            <th className="text-left pl-4 pr-1 py-1.5 font-medium w-6">#</th>
            <th className="text-left px-1 py-1.5 font-medium">Fund</th>
            <th className="text-center px-1 py-1.5 font-medium w-9">Unit</th>
            <th className="text-right px-1 py-1.5 font-medium w-14">Daily</th>
            <th className="text-right pl-1 pr-4 py-1.5 font-medium w-16">Annual</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((fund, i) => (
            <tr
              key={fund.id}
              onClick={() => navigate(`/compare/${fund.slug}`)}
              className="border-t border-border/30 hover:bg-muted/30 cursor-pointer transition-colors"
            >
              <td className="pl-4 pr-1 py-1.5 text-muted-foreground/60 tabular-nums text-[10px]">{i + 1}</td>
              <td className="px-1 py-1.5">
                <div className="flex items-center gap-1 min-w-0">
                  <Link
                    to={`/compare/${fund.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-foreground hover:text-accent transition-colors truncate block max-w-[120px] lg:max-w-[150px]"
                    title={fund.name}
                  >
                    {fund.name}
                  </Link>
                  {fund.annual_yield === bestYield && bestYield > 0 && (
                    <Badge variant="default" className="text-[6px] px-1 py-0 h-3 bg-accent text-accent-foreground shrink-0 leading-none">
                      TOP
                    </Badge>
                  )}
                </div>
              </td>
              <td className="text-center px-1 py-1.5 text-muted-foreground text-[10px]">{currencyLabel(fund.yield_unit)}</td>
              <td className="text-right px-1 py-1.5 text-muted-foreground tabular-nums">{fmtYield(fund.daily_yield, fund.yield_unit)}</td>
              <td className="text-right pl-1 pr-4 py-1.5 font-bold text-accent tabular-nums">{fmtYield(fund.annual_yield, fund.yield_unit)}</td>
            </tr>
          ))}
          {visible.length < MAX_VISIBLE && Array.from({ length: MAX_VISIBLE - visible.length }).map((_, i) => (
            <tr key={`pad-${i}`} className="border-t border-border/20">
              <td className="pl-4 pr-1 py-1.5 text-muted-foreground/20 tabular-nums text-[10px]">{visible.length + i + 1}</td>
              <td className="px-1 py-1.5"><span className="text-muted-foreground/15">—</span></td>
              <td className="px-1 py-1.5" /><td className="px-1 py-1.5" /><td className="pl-1 pr-4 py-1.5" />
            </tr>
          ))}
          {funds.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">No funds available</td></tr>
          )}
        </tbody>
      </table>
    </CardShell>
  );
};

/* ─── FX Rates Card ─── */
const RatesCard = ({ rates, delay }: { rates: ExchangeRate[]; delay: number }) => {
  const visible = rates.slice(0, MAX_VISIBLE);
  const hasMore = rates.length > MAX_VISIBLE;

  return (
    <CardShell
      catKey="fx_rates"
      count={rates.length}
      countLabel="pairs"
      animDelay={delay}
      footer={
        hasMore ? (
          <Link to="/rates" className="flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-semibold text-accent hover:bg-muted/40 transition-colors group">
            View all {rates.length} rates <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ) : (
          <div className="px-4 py-2 text-[10px] text-muted-foreground text-center tabular-nums">{rates.length} rate{rates.length !== 1 ? "s" : ""}</div>
        )
      }
    >
      <table className="w-full text-[11px] lg:text-xs">
        <thead>
          <tr className="text-[9px] lg:text-[10px] text-muted-foreground uppercase tracking-wider border-t border-border/40">
            <th className="text-left pl-4 pr-1 py-1.5 font-medium w-6">#</th>
            <th className="text-left px-1 py-1.5 font-medium">Currency</th>
            <th className="text-center px-1 py-1.5 font-medium w-10">Code</th>
            <th className="text-right px-1 py-1.5 font-medium w-14">Prev</th>
            <th className="text-right pl-1 pr-4 py-1.5 font-medium w-16">Rate</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r, i) => (
            <tr key={r.id} className="border-t border-border/30 hover:bg-muted/30 transition-colors">
              <td className="pl-4 pr-1 py-1.5 text-muted-foreground/60 tabular-nums text-[10px]">{i + 1}</td>
              <td className="px-1 py-1.5">
                <span className="font-medium text-foreground truncate block max-w-[120px] lg:max-w-[150px]" title={r.currency_name}>{r.currency_name}</span>
              </td>
              <td className="text-center px-1 py-1.5 text-muted-foreground text-[10px]">{r.currency_code}</td>
              <td className="text-right px-1 py-1.5 text-muted-foreground tabular-nums">{r.previous_rate != null ? r.previous_rate.toFixed(2) : "—"}</td>
              <td className="text-right pl-1 pr-4 py-1.5 font-bold text-accent tabular-nums">{r.rate.toFixed(2)}</td>
            </tr>
          ))}
          {visible.length < MAX_VISIBLE && Array.from({ length: MAX_VISIBLE - visible.length }).map((_, i) => (
            <tr key={`pad-${i}`} className="border-t border-border/20">
              <td className="pl-4 pr-1 py-1.5 text-muted-foreground/20 tabular-nums text-[10px]">{visible.length + i + 1}</td>
              <td className="px-1 py-1.5"><span className="text-muted-foreground/15">—</span></td>
              <td className="px-1 py-1.5" /><td className="px-1 py-1.5" /><td className="pl-1 pr-4 py-1.5" />
            </tr>
          ))}
        </tbody>
      </table>
    </CardShell>
  );
};

/* ─── Commodities Card ─── */
const CommoditiesCard = ({ commodities, delay }: { commodities: Commodity[]; delay: number }) => {
  const visible = commodities.slice(0, MAX_VISIBLE);
  const hasMore = commodities.length > MAX_VISIBLE;

  return (
    <CardShell
      catKey="commodities"
      count={commodities.length}
      countLabel="items"
      animDelay={delay}
      footer={
        hasMore ? (
          <Link to="/commodities" className="flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-semibold text-accent hover:bg-muted/40 transition-colors group">
            View all {commodities.length} items <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ) : (
          <div className="px-4 py-2 text-[10px] text-muted-foreground text-center tabular-nums">{commodities.length} item{commodities.length !== 1 ? "s" : ""}</div>
        )
      }
    >
      <table className="w-full text-[11px] lg:text-xs">
        <thead>
          <tr className="text-[9px] lg:text-[10px] text-muted-foreground uppercase tracking-wider border-t border-border/40">
            <th className="text-left pl-4 pr-1 py-1.5 font-medium w-6">#</th>
            <th className="text-left px-1 py-1.5 font-medium">Item</th>
            <th className="text-center px-1 py-1.5 font-medium w-10">Unit</th>
            <th className="text-right pl-1 pr-4 py-1.5 font-medium w-16">Price</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((c, i) => (
            <tr key={c.id} className="border-t border-border/30 hover:bg-muted/30 transition-colors">
              <td className="pl-4 pr-1 py-1.5 text-muted-foreground/60 tabular-nums text-[10px]">{i + 1}</td>
              <td className="px-1 py-1.5">
                <span className="font-medium text-foreground truncate block max-w-[120px] lg:max-w-[150px]" title={c.name}>{c.name}</span>
              </td>
              <td className="text-center px-1 py-1.5 text-muted-foreground text-[10px]">{c.unit}</td>
              <td className="text-right pl-1 pr-4 py-1.5 font-bold text-accent tabular-nums">{c.price.toFixed(2)}</td>
            </tr>
          ))}
          {visible.length < MAX_VISIBLE && Array.from({ length: MAX_VISIBLE - visible.length }).map((_, i) => (
            <tr key={`pad-${i}`} className="border-t border-border/20">
              <td className="pl-4 pr-1 py-1.5 text-muted-foreground/20 tabular-nums text-[10px]">{visible.length + i + 1}</td>
              <td className="px-1 py-1.5"><span className="text-muted-foreground/15">—</span></td>
              <td className="px-1 py-1.5" /><td className="pl-1 pr-4 py-1.5" />
            </tr>
          ))}
        </tbody>
      </table>
    </CardShell>
  );
};

/* ─── Stocks Card ─── */
const StocksCard = ({ stocks, delay }: { stocks: Stock[]; delay: number }) => {
  const visible = stocks.slice(0, MAX_VISIBLE);
  const hasMore = stocks.length > MAX_VISIBLE;

  return (
    <CardShell
      catKey="stocks"
      count={stocks.length}
      countLabel="listed"
      animDelay={delay}
      footer={
        hasMore ? (
          <Link to="/stocks" className="flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-semibold text-accent hover:bg-muted/40 transition-colors group">
            View all {stocks.length} stocks <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ) : (
          <div className="px-4 py-2 text-[10px] text-muted-foreground text-center tabular-nums">{stocks.length} stock{stocks.length !== 1 ? "s" : ""}</div>
        )
      }
    >
      <table className="w-full text-[11px] lg:text-xs">
        <thead>
          <tr className="text-[9px] lg:text-[10px] text-muted-foreground uppercase tracking-wider border-t border-border/40">
            <th className="text-left pl-4 pr-1 py-1.5 font-medium w-6">#</th>
            <th className="text-left px-1 py-1.5 font-medium">Stock</th>
            <th className="text-center px-1 py-1.5 font-medium w-12">Symbol</th>
            <th className="text-right px-1 py-1.5 font-medium w-14">Chg%</th>
            <th className="text-right pl-1 pr-4 py-1.5 font-medium w-16">Price</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((s, i) => (
            <tr key={s.id} className="border-t border-border/30 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => window.location.href = '/stocks'}>
              <td className="pl-4 pr-1 py-1.5 text-muted-foreground/60 tabular-nums text-[10px]">{i + 1}</td>
              <td className="px-1 py-1.5">
                <span className="font-medium text-foreground truncate block max-w-[120px] lg:max-w-[150px]" title={s.name}>{s.name}</span>
              </td>
              <td className="text-center px-1 py-1.5 text-muted-foreground text-[10px] font-mono">{s.symbol}</td>
              <td className={`text-right px-1 py-1.5 tabular-nums font-semibold ${s.day_change_percent > 0 ? 'text-accent' : s.day_change_percent < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {s.day_change_percent > 0 ? '+' : ''}{s.day_change_percent.toFixed(2)}%
              </td>
              <td className="text-right pl-1 pr-4 py-1.5 font-bold text-foreground tabular-nums">{s.price.toFixed(2)}</td>
            </tr>
          ))}
          {visible.length < MAX_VISIBLE && Array.from({ length: MAX_VISIBLE - visible.length }).map((_, i) => (
            <tr key={`pad-${i}`} className="border-t border-border/20">
              <td className="pl-4 pr-1 py-1.5 text-muted-foreground/20 tabular-nums text-[10px]">{visible.length + i + 1}</td>
              <td className="px-1 py-1.5"><span className="text-muted-foreground/15">—</span></td>
              <td className="px-1 py-1.5" /><td className="px-1 py-1.5" /><td className="pl-1 pr-4 py-1.5" />
            </tr>
          ))}
        </tbody>
      </table>
    </CardShell>
  );
};

/* ─── Grid Skeleton ─── */
const GridSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-lg" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <table className="w-full">
            <tbody>
              {Array.from({ length: 5 }).map((_, j) => (
                <tr key={j} className="border-t border-border/30">
                  <td className="px-4 py-2"><Skeleton className="h-3 w-4" /></td>
                  <td className="px-1 py-2"><Skeleton className="h-3 w-24" /></td>
                  <td className="px-1 py-2"><Skeleton className="h-3 w-8" /></td>
                  <td className="px-1 py-2"><Skeleton className="h-3 w-12" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  </div>
);

/* ─── Main Grid ─── */
const FundGrid = ({ funds, snapshots, rates, commodities, stocks, loading, marketLoading }: FundGridProps) => {
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

  // Build market cards
  const marketCards: React.ReactNode[] = [];
  let delayCounter = 0;
  if (stocks.length > 0) marketCards.push(<StocksCard key="stocks" stocks={stocks} delay={delayCounter++ * 60} />);
  if (rates.length > 0) marketCards.push(<RatesCard key="rates" rates={rates} delay={delayCounter++ * 60} />);
  if (commodities.length > 0) marketCards.push(<CommoditiesCard key="commodities" commodities={commodities} delay={delayCounter++ * 60} />);

  // Build fund cards
  const fundCards = fundCategories.map((cat) => (
    <FundCategoryCard key={cat} category={cat} funds={grouped[cat]} delay={delayCounter++ * 60} />
  ));

  // Chunk into rows of 3
  const chunk = (arr: React.ReactNode[], size: number) => {
    const result: React.ReactNode[][] = [];
    for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
    return result;
  };

  const marketRows = chunk(marketCards, 3);
  const fundRows = chunk(fundCards, 3);

  return (
    <div className="space-y-6">
      {/* Markets Section */}
      {marketCards.length > 0 && (
        <section>
          <SectionHeader title="Markets" subtitle="Live market data" />
          {marketRows.map((row, ri) => (
            <div key={`m-${ri}`} className="grid grid-cols-3 gap-4" style={{ alignItems: "stretch" }}>
              {row}
              {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => <div key={`me-${i}`} />)}
            </div>
          ))}
        </section>
      )}

      {/* Investment Funds Section */}
      {fundCards.length > 0 && (
        <section>
          <SectionHeader title="Investment Funds" subtitle="CMA-regulated unit trusts" />
          <div className="space-y-4">
            {fundRows.map((row, ri) => (
              <div key={`f-${ri}`} className="grid grid-cols-3 gap-4" style={{ alignItems: "stretch" }}>
                {row}
                {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => <div key={`fe-${i}`} />)}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default FundGrid;
