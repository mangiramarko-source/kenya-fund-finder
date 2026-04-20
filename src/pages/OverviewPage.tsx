import { useEffect, useState, useMemo, useCallback } from "react";
import { decodeHtmlEntities } from "@/lib/utils";
import Sparkline from "@/components/Sparkline";
import { Link, useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/hooks/useAuth";
import { useMarketData, type ExchangeRate, type Commodity, type Stock } from "@/components/home/MarketTicker";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Bell,
  BellPlus,
  Plus,
  Settings2,
  X,
  Star,
  Search,
  Eye,
  Check,
  BarChart3,
  DollarSign,
  Gem,
  LayoutDashboard,
  Crown,
  Landmark,
  ArrowRight,
  Newspaper,
  Clock,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { fetchFunds, fetchPublishedNews, type FundFromDB, type NewsFromDB } from "@/lib/api";
import CurrencyTicker from "@/components/CurrencyTicker";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import { getNewsImage, handleNewsImageError } from "@/lib/news-images";

/* ─── Types ─── */
interface WatchlistItem {
  id: string;
  user_id: string;
  item_type: string;
  item_id: string;
  item_name: string;
  sort_order: number;
}
interface FundYieldSnapshot {
  snapshot_date: string;
  annual_yield: number;
  fund_id: string;
}
interface RateHistory {
  snapshot_date: string;
  rate: number;
  currency_code: string;
}
interface StockPriceHistory {
  snapshot_date: string;
  price: number;
  stock_id: string;
}

const SECTIONS = [
  { id: "stocks", label: "Stocks", icon: TrendingUp, description: "Kenyan stock market" },
  { id: "fx", label: "FX Rates", icon: DollarSign, description: "Currency exchange rates" },
  { id: "commodities", label: "Commodities", icon: Gem, description: "Gold, oil, crypto & more" },
  { id: "money_market", label: "Money Market", icon: BarChart3, description: "Fund yields & rates" },
  { id: "fixed_income", label: "Fixed Income", icon: Landmark, description: "Fixed income fund yields" },
] as const;

/* ─── Change Indicator ─── */
const trendOf = (current: number, previous: number | null | undefined): "up" | "down" | "flat" | undefined => {
  if (previous == null) return undefined;
  const diff = current - previous;
  if (diff > 0) return "up";
  if (diff < 0) return "down";
  return "flat";
};

const Change = ({ current, previous }: { current: number; previous: number | null }) => {
  if (previous == null) return <span className="text-muted-foreground text-xs">—</span>;
  const diff = current - previous;
  const pct = previous !== 0 ? ((diff / previous) * 100).toFixed(2) : "0.00";
  if (diff > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-accent text-[11px] font-semibold">
        <TrendingUp className="h-3 w-3" />+{pct}%
      </span>
    );
  if (diff < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-destructive text-[11px] font-semibold">
        <TrendingDown className="h-3 w-3" />
        {pct}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[11px]">
      <Minus className="h-3 w-3" />
      0.00%
    </span>
  );
};

/* ─── Mini Chart ─── */
const MiniChart = ({ data, color }: { data: { snapshot_date: string; rate: number }[]; color?: string }) => {
  if (data.length < 2) return null;

  const firstVal = data[0].rate;
  const lastVal = data[data.length - 1].rate;
  const isPositive = lastVal >= firstVal;

  const strokeColor = color || (isPositive ? "#22c55e" : "#ef4444");
  const gradientId = isPositive ? "gradient-up" : "gradient-down";

  return (
    <ResponsiveContainer width="100%" height={60}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="gradient-up" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradient-down" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="snapshot_date" hide />
        <YAxis domain={["auto", "auto"]} hide />
        <Area
          type="monotone"
          dataKey="rate"
          stroke={strokeColor}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

/* ─── Detailed Highlight Card ─── */
const DetailedHighlightCard = ({
  icon: Icon,
  label,
  name,
  value,
  sub,
  change,
  linkTo,
  color,
  chartData,
  chartColor,
  sparkData,
  trend,
  extras,
}: any) => {
  const content = (
    <div
      className={`rounded-xl border border-border bg-card p-4 hover:border-accent/30 transition-colors group flex flex-col cursor-pointer h-full`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${color || "bg-primary/10"}`}>
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
        {linkTo && (
          <span className="text-[10px] text-accent inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            View <ArrowRight className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate" title={name}>
            {name}
          </p>
          <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">{value}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {change}
            {sub && <span className="text-[10px] text-muted-foreground truncate">{sub}</span>}
          </div>
        </div>
        {sparkData && sparkData.length >= 3 && (
          <Sparkline data={sparkData} width={64} height={28} color="auto" trend={trend} className="shrink-0 mt-2" />
        )}
      </div>
      {extras && extras.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 pt-2 border-t border-border/50">
          {extras.map((e: any, i: number) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">{e.label}</span>
              <span className="text-[10px] font-semibold tabular-nums text-foreground">{e.value}</span>
            </div>
          ))}
        </div>
      )}
      {chartData && chartData.length > 2 && (
        <div className="mt-2 -mx-1 flex-1 min-h-[50px]">
          <MiniChart data={chartData} color={chartColor} />
        </div>
      )}
    </div>
  );
  if (linkTo)
    return (
      <Link to={linkTo} className="flex flex-col h-full">
        {content}
      </Link>
    );
  return content;
};

/* ─── Compact Highlight Card (mobile) ─── */
const HighlightCard = ({ icon: Icon, label, name, value, sub, change, linkTo, color }: any) => (
  <Link
    to={linkTo || "#"}
    className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 hover:border-accent/30 transition-colors group"
  >
    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${color || "bg-primary/10"}`}>
      <Icon className="h-3.5 w-3.5 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xs font-semibold text-foreground truncate">{name}</p>
    </div>
    <div className="text-right shrink-0">
      <p className="text-sm font-bold tabular-nums text-foreground">{value}</p>
      <div className="mt-0.5">
        {change || (sub && <span className="text-[10px] text-muted-foreground">{sub}</span>)}
      </div>
    </div>
  </Link>
);

const OverviewPage = () => {
  useDocumentTitle("Kenya Fund Finder – Overview");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { rates, commodities, stocks, loading: marketLoading } = useMarketData();
  const { alerts } = usePriceAlerts();

  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [rateHistory, setRateHistory] = useState<RateHistory[]>([]);
  const [stockHistory, setStockHistory] = useState<StockPriceHistory[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [profileName, setProfileName] = useState("");

  const fetchAllData = useCallback(() => {
    fetchFunds()
      .then(setFunds)
      .catch(() => {})
      .finally(() => setFundsLoading(false));
    supabase
      .from("exchange_rate_history_public" as any)
      .select("snapshot_date, rate, currency_code")
      .order("snapshot_date", { ascending: true })
      .limit(500)
      .then(({ data }) => setRateHistory(((data as any) || []).map((h: any) => ({ ...h, rate: Number(h.rate) }))));
    supabase
      .from("stock_price_history" as any)
      .select("snapshot_date, price, stock_id")
      .order("snapshot_date", { ascending: true })
      .limit(1000)
      .then(({ data }) => setStockHistory(((data as any) || []).map((h: any) => ({ ...h, price: Number(h.price) }))));
  }, []);

  useEffect(() => {
    fetchAllData();
    const interval = window.setInterval(fetchAllData, 60_000);
    return () => window.clearInterval(interval);
  }, [fetchAllData]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.display_name) setProfileName(data.display_name);
        });
      supabase
        .from("user_watchlist")
        .select("*")
        .eq("user_id", user.id)
        .then(({ data }) => setWatchlist((data as WatchlistItem[]) || []));
    }
  }, [user]);

  const watchedStocks = useMemo(() => {
    const ids = watchlist.filter((w) => w.item_type === "stock").map((w) => w.item_id);
    return stocks.filter((s) => ids.includes(s.id));
  }, [stocks, watchlist]);

  const getStockHistory = (stockId: string) =>
    stockHistory
      .filter((h) => h.stock_id === stockId)
      .slice(-30)
      .map((h) => ({ snapshot_date: h.snapshot_date, rate: h.price }));
  const getStockSparkData = (stockId: string) =>
    stockHistory
      .filter((h) => h.stock_id === stockId)
      .slice(-30)
      .map((h) => h.price);

  const displayName = profileName || user?.email?.split("@")[0] || "there";
  const greeting =
    new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  if (marketLoading || fundsLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="px-4 md:px-6 py-6 max-w-[1600px] space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {user ? `${greeting}, ${displayName}` : "Market Overview"}
        </h1>
        <p className="text-sm text-muted-foreground">Real-time insights from the Kenyan market.</p>
      </div>

      {user && watchedStocks.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" /> Your Watchlist
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {watchedStocks.map((s) => {
              const sHistory = getStockHistory(s.id);
              const isPositive = s.price >= (s.previous_price || s.price);
              return (
                <DetailedHighlightCard
                  key={s.id}
                  label="Stock"
                  name={s.name}
                  value={`KES ${s.price.toFixed(2)}`}
                  change={<Change current={s.price} previous={s.previous_price} />}
                  chartData={sHistory}
                  chartColor={isPositive ? "#22c55e" : "#ef4444"}
                  sparkData={getStockSparkData(s.id)}
                  trend={trendOf(s.price, s.previous_price)}
                  linkTo={`/stocks/${s.id}`}
                />
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">Market Highlights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stocks.slice(0, 3).map((s) => {
            const isPos = s.price >= (s.previous_price || s.price);
            return (
              <DetailedHighlightCard
                key={s.id}
                icon={TrendingUp}
                label="Stock Highlight"
                name={s.name}
                value={`KES ${s.price.toFixed(2)}`}
                change={<Change current={s.price} previous={s.previous_price} />}
                chartData={getStockHistory(s.id)}
                chartColor={isPos ? "#22c55e" : "#ef4444"}
                linkTo={`/stocks/${s.id}`}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default OverviewPage;
