import { Link } from "react-router-dom";
import { ArrowRight, DollarSign, Settings2, Star, TrendingDown, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸", GBP: "🇬🇧", EUR: "🇪🇺", JPY: "🇯🇵", ZAR: "🇿🇦", AUD: "🇦🇺",
  CAD: "🇨🇦", CHF: "🇨🇭", CNY: "🇨🇳", INR: "🇮🇳", AED: "🇦🇪", UGX: "🇺🇬",
  TZS: "🇹🇿", RWF: "🇷🇼", SAR: "🇸🇦", SGD: "🇸🇬",
};

const pct = (current: number, previous?: number | null) => {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
};

const Delta = ({ value }: { value: number | null }) => {
  if (value == null) return <span className="text-[11px] text-muted-foreground">—</span>;
  const up = value >= 0;
  return (
    <span className={`text-[11px] font-semibold tabular-nums ${up ? "text-up" : "text-down"}`}>
      {up ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
};

const Panel = ({
  title,
  icon: Icon,
  link,
  linkLabel = "See all",
  action,
  children,
}: {
  title: string;
  icon: any;
  link?: string;
  linkLabel?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden animate-rise">
    <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/50">
      <h2 className="flex items-center gap-2 text-[13px] font-bold text-foreground">
        <Icon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
        {title}
      </h2>
      {action ??
        (link ? (
          <Link to={link} className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
            {linkLabel} <ArrowRight className="h-3 w-3" />
          </Link>
        ) : null)}
    </header>
    <div className="divide-y divide-border/40">{children}</div>
  </section>
);

const Row = ({
  to,
  label,
  sub,
  value,
  delta,
  leading,
}: {
  to: string;
  label: string;
  sub?: string;
  value: string;
  delta?: React.ReactNode;
  leading?: React.ReactNode;
}) => (
  <Link to={to} className="flex items-center gap-3 px-4 py-3 active:bg-muted/50 transition-colors">
    {leading}
    <div className="min-w-0 flex-1">
      <p className="text-[13px] font-semibold text-foreground truncate">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{sub}</p>}
    </div>
    <div className="text-right shrink-0">
      <p className="text-[13px] font-bold text-foreground tabular-nums">{value}</p>
      {delta && <div className="mt-0.5">{delta}</div>}
    </div>
  </Link>
);

const Loading = () => (
  <div className="px-4 py-3 space-y-3">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex items-center justify-between gap-3">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 w-16" />
        </div>
        <Skeleton className="h-3 w-14" />
      </div>
    ))}
  </div>
);

interface MobileHomePanelsProps {
  loading?: boolean;
  isSignedIn?: boolean;
  watchedStocks: any[];
  rates: any[];
  selectedFxRates: string[];
  topGainers: any[];
  topLosers: any[];
  moneyMarketFunds: any[];
  onCustomize: () => void;
}

const MobileHomePanels = ({
  loading,
  isSignedIn,
  watchedStocks,
  rates,
  selectedFxRates,
  topGainers,
  topLosers,
  moneyMarketFunds,
  onCustomize,
}: MobileHomePanelsProps) => {
  const fxRows = (rates || []).filter((r) => selectedFxRates.includes(r.currency_code)).slice(0, 4);
  const movers = [
    ...(topGainers || []).slice(0, 3).map((s) => ({ ...s, up: true })),
    ...(topLosers || []).slice(0, 2).map((s) => ({ ...s, up: false })),
  ];

  return (
    <div className="lg:hidden space-y-3 px-4 pb-4">
      <Panel
        title="Your watchlist"
        icon={Star}
        action={
          <button
            type="button"
            onClick={onCustomize}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent"
          >
            Edit <Settings2 className="h-3 w-3" />
          </button>
        }
      >
        {watchedStocks.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <p className="text-[13px] font-semibold text-foreground">Nothing tracked yet</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {isSignedIn
                ? "Add stocks, funds, FX or commodities to follow them here."
                : "Sign in to build a watchlist that syncs across devices."}
            </p>
            <button
              type="button"
              onClick={onCustomize}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-semibold text-accent-foreground"
            >
              <Settings2 className="h-3.5 w-3.5" /> Customize
            </button>
          </div>
        ) : (
          watchedStocks.slice(0, 5).map((s) => (
            <Row
              key={s.id}
              to={`/stocks/${s.symbol}`}
              label={s.symbol}
              sub={s.name}
              value={Number(s.price).toFixed(2)}
              delta={<Delta value={s.day_change_percent != null ? Number(s.day_change_percent) : null} />}
            />
          ))
        )}
      </Panel>

      <Panel title="Exchange rates" icon={DollarSign} link="/rates">
        {loading && fxRows.length === 0 ? (
          <Loading />
        ) : (
          fxRows.map((r) => (
            <Row
              key={r.currency_code}
              to="/rates"
              leading={
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[13px] shrink-0">
                  {CURRENCY_FLAGS[r.currency_code] || r.currency_code.slice(0, 2)}
                </span>
              }
              label={`${r.currency_code}/KES`}
              sub={r.currency_name || r.currency_code}
              value={`KES ${Number(r.rate).toFixed(2)}`}
              delta={<Delta value={pct(Number(r.rate), r.previous_rate != null ? Number(r.previous_rate) : null)} />}
            />
          ))
        )}
      </Panel>

      <Panel title="Market movers" icon={TrendingUp} link="/stocks">
        {loading && movers.length === 0 ? (
          <Loading />
        ) : (
          movers.map((s) => (
            <Row
              key={`${s.up ? "g" : "l"}-${s.id}`}
              to={`/stocks/${s.symbol}`}
              leading={
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                    s.up ? "bg-up/10 text-up" : "bg-down/10 text-down"
                  }`}
                >
                  {s.up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </span>
              }
              label={s.symbol}
              sub={s.name}
              value={Number(s.price).toFixed(2)}
              delta={<Delta value={s.day_change_percent != null ? Number(s.day_change_percent) : null} />}
            />
          ))
        )}
      </Panel>

      {moneyMarketFunds.length > 0 && (
        <Panel title="Top money market yields" icon={Star} link="/funds">
          {moneyMarketFunds.slice(0, 4).map((f) => (
            <Row
              key={f.id}
              to={`/compare/${f.slug}`}
              label={f.name}
              sub="Annual yield"
              value={`${Number(f.annual_yield).toFixed(2)}%`}
            />
          ))}
        </Panel>
      )}
    </div>
  );
};

export default MobileHomePanels;
