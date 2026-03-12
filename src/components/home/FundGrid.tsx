import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { FundFromDB, YieldSnapshot } from "@/lib/api";
import type { ExchangeRate, Commodity } from "@/components/home/MarketTicker";

const categoryLabels: Record<string, string> = {
  money_market: "Money Market",
  fixed_income: "Fixed Income",
  balanced: "Balanced",
  equity: "Equity",
  bond: "Bond",
  fx_rates: "FX Rates",
  commodities: "Commodities",
};

const categoryOrder = ["money_market", "fixed_income", "bond", "balanced", "equity", "fx_rates", "commodities"];

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

const ROW_HEIGHT = 30;
const HEADER_HEIGHT = 34;
const SUBHEADER_HEIGHT = 28;
const MAX_VISIBLE = 8;
const FOOTER_HEIGHT = 32;

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
      <div className="bg-muted/70 px-3 py-2 flex items-center justify-between" style={{ minHeight: HEADER_HEIGHT }}>
        <h3 className="text-xs font-bold text-foreground tracking-wide">
          {categoryLabels[category] || category}
        </h3>
        <span className="text-[10px] text-muted-foreground tabular-nums">{funds.length}</span>
      </div>

      <div className="px-3" style={{ minHeight: SUBHEADER_HEIGHT }}>
        <div className="flex items-center text-[10px] text-muted-foreground font-medium py-1.5">
          <span className="flex-1 min-w-0">Fund</span>
          <span className="w-9 text-center shrink-0">Unit</span>
          <span className="w-[52px] text-right shrink-0">Daily</span>
          <span className="w-[56px] text-right shrink-0">Annual</span>
        </div>
      </div>

      <div className="flex-1 divide-y divide-border/50">
        {visible.map((fund) => (
          <div
            key={fund.id}
            onClick={() => navigate(`/compare/${fund.slug}`)}
            className="flex items-center px-3 hover:bg-muted/30 cursor-pointer transition-colors"
            style={{ height: ROW_HEIGHT }}
          >
            <div className="flex-1 min-w-0 pr-1 flex items-center gap-1">
              <Link
                to={`/compare/${fund.slug}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] font-medium text-foreground hover:text-accent transition-colors truncate leading-tight"
                title={fund.name}
              >
                {fund.name}
              </Link>
              {fund.annual_yield === bestYield && bestYield > 0 && (
                <Badge variant="default" className="text-[8px] px-1 py-0 h-3 bg-accent text-accent-foreground shrink-0">TOP</Badge>
              )}
            </div>
            <span className="w-9 text-center text-[10px] text-muted-foreground shrink-0">
              {currencyLabel(fund.yield_unit)}
            </span>
            <span className="w-[52px] text-right text-[10px] text-muted-foreground tabular-nums shrink-0">
              {fmtYield(fund.daily_yield, fund.yield_unit)}
            </span>
            <span className="w-[56px] text-right text-[11px] font-bold text-accent tabular-nums shrink-0">
              {fmtYield(fund.annual_yield, fund.yield_unit)}
            </span>
          </div>
        ))}

        {visible.length < MAX_VISIBLE && Array.from({ length: MAX_VISIBLE - visible.length }).map((_, i) => (
          <div key={`pad-${i}`} style={{ height: ROW_HEIGHT }} />
        ))}

        {funds.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">No funds</div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border" style={{ minHeight: FOOTER_HEIGHT }}>
        {hasMore ? (
          <Link
            to={`/compare?type=${category}`}
            className="flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] font-medium text-accent hover:text-accent/80 hover:bg-muted/30 transition-colors"
          >
            See all {funds.length} funds →
          </Link>
        ) : (
          <div className="px-3 py-1.5 text-[11px] text-muted-foreground text-center">
            {funds.length} fund{funds.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── FX Rates Card ─── */
const RatesCard = ({ rates }: { rates: ExchangeRate[] }) => (
  <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
    <div className="bg-muted/70 px-3 py-2 flex items-center justify-between" style={{ minHeight: HEADER_HEIGHT }}>
      <h3 className="text-xs font-bold text-foreground tracking-wide">FX Rates</h3>
      <span className="text-[10px] text-muted-foreground tabular-nums">{rates.length}</span>
    </div>

    <div className="px-3" style={{ minHeight: SUBHEADER_HEIGHT }}>
      <div className="flex items-center text-[10px] text-muted-foreground font-medium py-1.5">
        <span className="flex-1 min-w-0">Currency</span>
        <span className="w-9 text-center shrink-0">Code</span>
        <span className="w-[52px] text-right shrink-0">Prev</span>
        <span className="w-[56px] text-right shrink-0">Rate</span>
      </div>
    </div>

    <div className="flex-1 divide-y divide-border/50">
      {rates.map((r) => (
        <div key={r.id} className="flex items-center px-3" style={{ height: ROW_HEIGHT }}>
          <div className="flex-1 min-w-0 pr-1">
            <span className="text-[11px] font-medium text-foreground truncate block leading-tight" title={r.currency_name}>
              {r.currency_name}
            </span>
          </div>
          <span className="w-9 text-center text-[10px] text-muted-foreground shrink-0">{r.currency_code}</span>
          <span className="w-[52px] text-right text-[10px] text-muted-foreground tabular-nums shrink-0">
            {r.previous_rate != null ? r.previous_rate.toFixed(2) : "—"}
          </span>
          <span className="w-[56px] text-right text-[11px] font-bold text-accent tabular-nums shrink-0">
            {r.rate.toFixed(2)}
          </span>
        </div>
      ))}

      {rates.length < maxRows && Array.from({ length: maxRows - rates.length }).map((_, i) => (
        <div key={`pad-${i}`} style={{ height: ROW_HEIGHT }} />
      ))}
    </div>
  </div>
);

/* ─── Commodities Card ─── */
const CommoditiesCard = ({ commodities, maxRows }: { commodities: Commodity[]; maxRows: number }) => (
  <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
    <div className="bg-muted/70 px-3 py-2 flex items-center justify-between" style={{ minHeight: HEADER_HEIGHT }}>
      <h3 className="text-xs font-bold text-foreground tracking-wide">Commodities</h3>
      <span className="text-[10px] text-muted-foreground tabular-nums">{commodities.length}</span>
    </div>

    <div className="px-3" style={{ minHeight: SUBHEADER_HEIGHT }}>
      <div className="flex items-center text-[10px] text-muted-foreground font-medium py-1.5">
        <span className="flex-1 min-w-0">Item</span>
        <span className="w-9 text-center shrink-0">Unit</span>
        <span className="w-[52px] text-right shrink-0">Prev</span>
        <span className="w-[56px] text-right shrink-0">Price</span>
      </div>
    </div>

    <div className="flex-1 divide-y divide-border/50">
      {commodities.map((c) => (
        <div key={c.id} className="flex items-center px-3" style={{ height: ROW_HEIGHT }}>
          <div className="flex-1 min-w-0 pr-1">
            <span className="text-[11px] font-medium text-foreground truncate block leading-tight" title={c.name}>
              {c.name}
            </span>
          </div>
          <span className="w-9 text-center text-[10px] text-muted-foreground shrink-0">{c.unit}</span>
          <span className="w-[52px] text-right text-[10px] text-muted-foreground tabular-nums shrink-0">
            {c.previous_price != null ? c.previous_price.toFixed(2) : "—"}
          </span>
          <span className="w-[56px] text-right text-[11px] font-bold text-accent tabular-nums shrink-0">
            {c.price.toFixed(2)}
          </span>
        </div>
      ))}

      {commodities.length < maxRows && Array.from({ length: maxRows - commodities.length }).map((_, i) => (
        <div key={`pad-${i}`} style={{ height: ROW_HEIGHT }} />
      ))}
    </div>
  </div>
);

/* ─── Grid Skeleton ─── */
const GridSkeleton = () => (
  <div className="grid grid-cols-3 gap-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="bg-muted/70 px-3 py-2.5"><Skeleton className="h-4 w-24" /></div>
        {Array.from({ length: 6 }).map((_, j) => (
          <div key={j} className="flex items-center gap-2 px-3 py-2 border-t border-border">
            <Skeleton className="h-3 w-32 flex-1" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    ))}
  </div>
);

/* ─── Main Grid ─── */
const FundGrid = ({ funds, snapshots, rates, commodities, loading, marketLoading }: FundGridProps) => {
  if (loading) return <GridSkeleton />;

  // Group funds by category
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

  // Build a unified list of cards: fund categories + market cards
  type CardDef =
    | { type: "fund"; category: string; count: number }
    | { type: "rates"; count: number }
    | { type: "commodities"; count: number };

  const cards: CardDef[] = [
    ...fundCategories.map((c) => ({ type: "fund" as const, category: c, count: grouped[c].length })),
    ...(rates.length > 0 ? [{ type: "rates" as const, count: rates.length }] : []),
    ...(commodities.length > 0 ? [{ type: "commodities" as const, count: commodities.length }] : []),
  ];

  // Split into rows of 3
  const rows: CardDef[][] = [];
  for (let i = 0; i < cards.length; i += 3) {
    rows.push(cards.slice(i, i + 3));
  }

  return (
    <div className="space-y-4">
      {rows.map((row, ri) => {
        // All cards use MAX_VISIBLE rows for uniform height

        return (
          <div key={ri} className="grid grid-cols-3 gap-4" style={{ alignItems: "stretch" }}>
            {row.map((card, ci) => {
              if (card.type === "fund") {
                return <FundCategoryCard key={card.category} category={card.category} funds={grouped[card.category]} maxRows={maxInRow} />;
              }
              if (card.type === "rates") {
                return <RatesCard key="rates" rates={rates} maxRows={maxInRow} />;
              }
              return <CommoditiesCard key="commodities" commodities={commodities} maxRows={maxInRow} />;
            })}
            {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => <div key={`empty-${i}`} />)}
          </div>
        );
      })}
    </div>
  );
};

export default FundGrid;
