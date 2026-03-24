import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { FundFromDB, YieldSnapshot } from "@/lib/api";
import type { ExchangeRate, Commodity, Stock } from "@/components/home/MarketTicker";

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

interface FundGridProps {
  funds: FundFromDB[];
  snapshots: Record<string, YieldSnapshot>;
  rates: ExchangeRate[];
  commodities: Commodity[];
  loading: boolean;
  marketLoading: boolean;
}

const MAX_VISIBLE = 8;

/* ─── Fund Category Card ─── */
const FundCategoryCard = ({
  category,
  funds,
}: {
  category: string;
  funds: FundFromDB[];
}) => {
  const navigate = useNavigate();
  const bestYield = funds.length > 0 ? Math.max(...funds.map((f) => f.annual_yield)) : 0;
  const sorted = [...funds].sort((a, b) => b.annual_yield - a.annual_yield);
  const visible = sorted.slice(0, MAX_VISIBLE);
  const hasMore = sorted.length > MAX_VISIBLE;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="bg-muted/60 px-5 py-3 flex items-center justify-between border-b border-border">
        <h3 className="text-sm font-bold text-foreground tracking-wide uppercase">
          {categoryLabels[category] || category}
        </h3>
        <span className="text-xs text-muted-foreground font-medium">{funds.length} funds</span>
      </div>

      <table className="w-full text-[11px] lg:text-xs">
        <thead>
          <tr className="text-[9px] lg:text-[10px] text-muted-foreground uppercase tracking-wider">
            <th className="text-left pl-3 pr-0.5 py-1.5 lg:pl-4 lg:pr-1 lg:py-2 font-medium w-5 lg:w-6">#</th>
            <th className="text-left px-0.5 lg:px-1 py-1.5 lg:py-2 font-medium">Fund</th>
            <th className="text-center px-0.5 lg:px-1 py-1.5 lg:py-2 font-medium w-8 lg:w-10">Unit</th>
            <th className="text-right px-0.5 lg:px-1 py-1.5 lg:py-2 font-medium w-12 lg:w-14">Daily</th>
            <th className="text-right pl-0.5 pr-3 lg:pl-1 lg:pr-4 py-1.5 lg:py-2 font-medium w-14 lg:w-16">Annual</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((fund, i) => (
            <tr
              key={fund.id}
              onClick={() => navigate(`/compare/${fund.slug}`)}
              className="border-t border-border/40 hover:bg-muted/30 cursor-pointer transition-colors"
            >
              <td className="pl-3 pr-0.5 py-1.5 lg:pl-4 lg:pr-1 lg:py-2 text-muted-foreground tabular-nums text-[9px] lg:text-[10px]">{i + 1}</td>
              <td className="px-0.5 lg:px-1 py-1.5 lg:py-2">
                <div className="flex items-center gap-0.5 lg:gap-1 min-w-0">
                  <Link
                    to={`/compare/${fund.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-foreground hover:text-accent transition-colors truncate block max-w-[100px] lg:max-w-[140px]"
                    title={fund.name}
                  >
                    {fund.name}
                  </Link>
                  {fund.annual_yield === bestYield && bestYield > 0 && (
                    <Badge variant="default" className="text-[6px] lg:text-[7px] px-0.5 lg:px-1 py-0 h-3 bg-accent text-accent-foreground shrink-0 leading-none">
                      TOP
                    </Badge>
                  )}
                </div>
              </td>
              <td className="text-center px-0.5 lg:px-1 py-1.5 lg:py-2 text-muted-foreground text-[9px] lg:text-[10px]">{currencyLabel(fund.yield_unit)}</td>
              <td className="text-right px-0.5 lg:px-1 py-1.5 lg:py-2 text-muted-foreground tabular-nums">{fmtYield(fund.daily_yield, fund.yield_unit)}</td>
              <td className="text-right pl-0.5 pr-3 lg:pl-1 lg:pr-4 py-1.5 lg:py-2 font-bold text-accent tabular-nums">{fmtYield(fund.annual_yield, fund.yield_unit)}</td>
            </tr>
          ))}

          {visible.length < MAX_VISIBLE && Array.from({ length: MAX_VISIBLE - visible.length }).map((_, i) => (
            <tr key={`pad-${i}`} className="border-t border-border/40">
              <td className="pl-3 pr-0.5 py-1.5 lg:pl-4 lg:pr-1 lg:py-2 text-muted-foreground/30 tabular-nums text-[9px] lg:text-[10px]">{visible.length + i + 1}</td>
              <td className="px-0.5 lg:px-1 py-1.5 lg:py-2"><span className="text-muted-foreground/20">—</span></td>
              <td className="px-0.5 lg:px-1 py-1.5 lg:py-2" />
              <td className="px-0.5 lg:px-1 py-1.5 lg:py-2" />
              <td className="pl-0.5 pr-3 lg:pl-1 lg:pr-4 py-1.5 lg:py-2" />
            </tr>
          ))}

          {funds.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">No funds</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="border-t border-border mt-auto">
        {hasMore ? (
          <Link
            to={`/compare?type=${category}`}
            className="flex items-center justify-center gap-1 px-5 py-2.5 text-xs font-semibold text-accent hover:text-accent/80 hover:bg-muted/30 transition-colors"
          >
            See all {funds.length} funds →
          </Link>
        ) : (
          <div className="px-5 py-2.5 text-xs text-muted-foreground text-center">
            {funds.length} fund{funds.length !== 1 ? "s" : ""}
          </div>
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
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="bg-muted/60 px-5 py-3 flex items-center justify-between border-b border-border">
        <h3 className="text-sm font-bold text-foreground tracking-wide uppercase">FX Rates</h3>
        <span className="text-xs text-muted-foreground font-medium">{rates.length} rates</span>
      </div>

      <table className="w-full text-[11px] lg:text-xs">
        <thead>
          <tr className="text-[9px] lg:text-[10px] text-muted-foreground uppercase tracking-wider">
            <th className="text-left pl-3 pr-0.5 py-1.5 lg:pl-4 lg:pr-1 lg:py-2 font-medium w-5 lg:w-6">#</th>
            <th className="text-left px-0.5 lg:px-1 py-1.5 lg:py-2 font-medium">Currency</th>
            <th className="text-center px-0.5 lg:px-1 py-1.5 lg:py-2 font-medium w-8 lg:w-10">Code</th>
            <th className="text-right px-0.5 lg:px-1 py-1.5 lg:py-2 font-medium w-12 lg:w-14">Prev</th>
            <th className="text-right pl-0.5 pr-3 lg:pl-1 lg:pr-4 py-1.5 lg:py-2 font-medium w-14 lg:w-16">Rate</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r, i) => (
            <tr key={r.id} className="border-t border-border/40 hover:bg-muted/30 transition-colors">
              <td className="pl-3 pr-0.5 py-1.5 lg:pl-4 lg:pr-1 lg:py-2 text-muted-foreground tabular-nums text-[9px] lg:text-[10px]">{i + 1}</td>
              <td className="px-0.5 lg:px-1 py-1.5 lg:py-2">
                <span className="font-medium text-foreground truncate block max-w-[100px] lg:max-w-[140px]" title={r.currency_name}>
                  {r.currency_name}
                </span>
              </td>
              <td className="text-center px-0.5 lg:px-1 py-1.5 lg:py-2 text-muted-foreground text-[9px] lg:text-[10px]">{r.currency_code}</td>
              <td className="text-right px-0.5 lg:px-1 py-1.5 lg:py-2 text-muted-foreground tabular-nums">
                {r.previous_rate != null ? r.previous_rate.toFixed(2) : "—"}
              </td>
              <td className="text-right pl-0.5 pr-3 lg:pl-1 lg:pr-4 py-1.5 lg:py-2 font-bold text-accent tabular-nums">
                {r.rate.toFixed(2)}
              </td>
            </tr>
          ))}

          {visible.length < MAX_VISIBLE && Array.from({ length: MAX_VISIBLE - visible.length }).map((_, i) => (
            <tr key={`pad-${i}`} className="border-t border-border/40">
              <td className="pl-3 pr-0.5 py-1.5 lg:pl-4 lg:pr-1 lg:py-2 text-muted-foreground/30 tabular-nums text-[9px] lg:text-[10px]">{visible.length + i + 1}</td>
              <td className="px-0.5 lg:px-1 py-1.5 lg:py-2"><span className="text-muted-foreground/20">—</span></td>
              <td className="px-0.5 lg:px-1 py-1.5 lg:py-2" />
              <td className="px-0.5 lg:px-1 py-1.5 lg:py-2" />
              <td className="pl-0.5 pr-3 lg:pl-1 lg:pr-4 py-1.5 lg:py-2" />
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-border mt-auto">
        {hasMore ? (
          <Link
            to="/rates"
            className="flex items-center justify-center gap-1 px-5 py-2.5 text-xs font-semibold text-accent hover:text-accent/80 hover:bg-muted/30 transition-colors"
          >
            See all {rates.length} rates →
          </Link>
        ) : (
          <div className="px-5 py-2.5 text-xs text-muted-foreground text-center">
            {rates.length} rate{rates.length !== 1 ? "s" : ""}
          </div>
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
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="bg-muted/60 px-5 py-3 flex items-center justify-between border-b border-border">
        <h3 className="text-sm font-bold text-foreground tracking-wide uppercase">Commodities</h3>
        <span className="text-xs text-muted-foreground font-medium">{commodities.length} items</span>
      </div>

      <table className="w-full text-[11px] lg:text-xs">
        <thead>
          <tr className="text-[9px] lg:text-[10px] text-muted-foreground uppercase tracking-wider">
            <th className="text-left pl-3 pr-0.5 py-1.5 lg:pl-4 lg:pr-1 lg:py-2 font-medium w-5 lg:w-6">#</th>
            <th className="text-left px-0.5 lg:px-1 py-1.5 lg:py-2 font-medium">Item</th>
            <th className="text-center px-0.5 lg:px-1 py-1.5 lg:py-2 font-medium w-8 lg:w-10">Unit</th>
            <th className="text-right pl-0.5 pr-3 lg:pl-1 lg:pr-4 py-1.5 lg:py-2 font-medium w-14 lg:w-16">Price</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((c, i) => (
            <tr key={c.id} className="border-t border-border/40 hover:bg-muted/30 transition-colors">
              <td className="pl-3 pr-0.5 py-1.5 lg:pl-4 lg:pr-1 lg:py-2 text-muted-foreground tabular-nums text-[9px] lg:text-[10px]">{i + 1}</td>
              <td className="px-0.5 lg:px-1 py-1.5 lg:py-2">
                <span className="font-medium text-foreground truncate block max-w-[100px] lg:max-w-[140px]" title={c.name}>
                  {c.name}
                </span>
              </td>
              <td className="text-center px-0.5 lg:px-1 py-1.5 lg:py-2 text-muted-foreground text-[9px] lg:text-[10px]">{c.unit}</td>
              <td className="text-right pl-0.5 pr-3 lg:pl-1 lg:pr-4 py-1.5 lg:py-2 font-bold text-accent tabular-nums">
                {c.price.toFixed(2)}
              </td>
            </tr>
          ))}

          {visible.length < MAX_VISIBLE && Array.from({ length: MAX_VISIBLE - visible.length }).map((_, i) => (
            <tr key={`pad-${i}`} className="border-t border-border/40">
              <td className="pl-3 pr-0.5 py-1.5 lg:pl-4 lg:pr-1 lg:py-2 text-muted-foreground/30 tabular-nums text-[9px] lg:text-[10px]">{visible.length + i + 1}</td>
              <td className="px-0.5 lg:px-1 py-1.5 lg:py-2"><span className="text-muted-foreground/20">—</span></td>
              <td className="px-0.5 lg:px-1 py-1.5 lg:py-2" />
              <td className="pl-0.5 pr-3 lg:pl-1 lg:pr-4 py-1.5 lg:py-2" />
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-border mt-auto">
        {hasMore ? (
          <Link
            to="/commodities"
            className="flex items-center justify-center gap-1 px-5 py-2.5 text-xs font-semibold text-accent hover:text-accent/80 hover:bg-muted/30 transition-colors"
          >
            See all {commodities.length} items →
          </Link>
        ) : (
          <div className="px-5 py-2.5 text-xs text-muted-foreground text-center">
            {commodities.length} item{commodities.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Grid Skeleton ─── */
const GridSkeleton = () => (
  <div className="grid grid-cols-3 gap-5">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="bg-muted/60 px-5 py-3 border-b border-border"><Skeleton className="h-4 w-28" /></div>
        <table className="w-full">
          <tbody>
            {Array.from({ length: 8 }).map((_, j) => (
              <tr key={j} className="border-t border-border/40">
                <td className="px-5 py-2.5"><Skeleton className="h-3.5 w-5" /></td>
                <td className="px-2 py-2.5"><Skeleton className="h-3.5 w-28" /></td>
                <td className="px-2 py-2.5"><Skeleton className="h-3.5 w-10" /></td>
                <td className="px-2 py-2.5"><Skeleton className="h-3.5 w-12" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ))}
  </div>
);

/* ─── Main Grid ─── */
const FundGrid = ({ funds, snapshots, rates, commodities, loading, marketLoading }: FundGridProps) => {
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
    | { type: "commodities" };

  const cards: CardDef[] = [
    ...fundCategories.map((c) => ({ type: "fund" as const, category: c })),
    ...(rates.length > 0 ? [{ type: "rates" as const }] : []),
    ...(commodities.length > 0 ? [{ type: "commodities" as const }] : []),
  ];

  const rows: CardDef[][] = [];
  for (let i = 0; i < cards.length; i += 3) {
    rows.push(cards.slice(i, i + 3));
  }

  return (
    <div className="space-y-5">
      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-3 gap-5" style={{ alignItems: "stretch" }}>
          {row.map((card) => {
            if (card.type === "fund") {
              return <FundCategoryCard key={card.category} category={card.category} funds={grouped[card.category]} />;
            }
            if (card.type === "rates") {
              return <RatesCard key="rates" rates={rates} />;
            }
            return <CommoditiesCard key="commodities" commodities={commodities} />;
          })}
          {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => <div key={`empty-${i}`} />)}
        </div>
      ))}
    </div>
  );
};

export default FundGrid;
