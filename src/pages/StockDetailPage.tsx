import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";

interface Stock {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  price: number;
  previous_price: number | null;
  day_change: number;
  day_change_percent: number;
  volume: number;
  market_cap: number | null;
  year_high: number | null;
  year_low: number | null;
  pe_ratio: number | null;
  dividend_yield: number | null;
  updated_at: string;
}

const fetchStock = async (symbol: string): Promise<Stock | null> => {
  const { data, error } = await supabase
    .from("stocks_public")
    .select("*")
    .eq("symbol", symbol.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    price: Number(data.price),
    previous_price: data.previous_price != null ? Number(data.previous_price) : null,
    day_change: Number(data.day_change),
    day_change_percent: Number(data.day_change_percent),
    volume: Number(data.volume),
    market_cap: data.market_cap != null ? Number(data.market_cap) : null,
    year_high: data.year_high != null ? Number(data.year_high) : null,
    year_low: data.year_low != null ? Number(data.year_low) : null,
    pe_ratio: data.pe_ratio != null ? Number(data.pe_ratio) : null,
    dividend_yield: data.dividend_yield != null ? Number(data.dividend_yield) : null,
  } as Stock;
};

const fmtNum = (n: number | null, decimals = 2) => n != null ? n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : "—";
const fmtCap = (n: number | null) => {
  if (n == null) return "—";
  if (n >= 1_000_000_000) return "KES " + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return "KES " + (n / 1_000_000).toFixed(2) + "M";
  return "KES " + n.toLocaleString();
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border bg-muted/30 p-4">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{label}</p>
    <p className="text-sm font-bold text-foreground tabular-nums">{value}</p>
  </div>
);

const StockDetailPage = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const { data: stock, isLoading } = useQuery({
    queryKey: ["stock", symbol],
    queryFn: () => fetchStock(symbol || ""),
    enabled: !!symbol,
  });

  useDocumentTitle(
    stock ? `${stock.symbol} – ${stock.name} | Kenya Fund Finder` : "Stock Detail – Kenya Fund Finder",
    stock ? `${stock.name} (${stock.symbol}) stock price, metrics, and performance on the NSE.` : ""
  );

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="container max-w-4xl py-8">
        <Link to="/stocks" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Stocks
        </Link>
        <h1 className="text-2xl font-bold">Stock Not Found</h1>
        <p className="text-muted-foreground mt-2">The symbol "{symbol}" was not found.</p>
      </div>
    );
  }

  const isUp = stock.day_change_percent > 0;
  const isDown = stock.day_change_percent < 0;

  return (
    <div className="min-h-screen">
      <div className="container max-w-4xl py-8 space-y-6">
        <Link to="/stocks" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Stocks
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{stock.symbol}</h1>
              <Badge variant="secondary" className="text-[10px]">{stock.sector}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{stock.name}</p>
          </div>
          <div className="sm:ml-auto text-right">
            <p className="text-3xl font-bold tabular-nums text-foreground">KES {fmtNum(stock.price)}</p>
            <p className={`text-sm font-semibold inline-flex items-center gap-1 ${isUp ? "text-green-500" : isDown ? "text-red-500" : "text-muted-foreground"}`}>
              {isUp && <TrendingUp className="h-4 w-4" />}
              {isDown && <TrendingDown className="h-4 w-4" />}
              {isUp ? "+" : ""}{fmtNum(stock.day_change)} ({isUp ? "+" : ""}{stock.day_change_percent.toFixed(2)}%)
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Previous Close" value={stock.previous_price != null ? `KES ${fmtNum(stock.previous_price)}` : "—"} />
          <MetricCard label="Volume" value={stock.volume.toLocaleString()} />
          <MetricCard label="Market Cap" value={fmtCap(stock.market_cap)} />
          <MetricCard label="P/E Ratio" value={fmtNum(stock.pe_ratio, 1)} />
          <MetricCard label="Dividend Yield" value={stock.dividend_yield != null ? stock.dividend_yield.toFixed(2) + "%" : "—"} />
          <MetricCard label="52-Week High" value={stock.year_high != null ? `KES ${fmtNum(stock.year_high)}` : "—"} />
          <MetricCard label="52-Week Low" value={stock.year_low != null ? `KES ${fmtNum(stock.year_low)}` : "—"} />
          <MetricCard label="Last Updated" value={new Date(stock.updated_at).toLocaleDateString()} />
        </div>

        {/* 52-week range bar */}
        {stock.year_low != null && stock.year_high != null && stock.year_high > stock.year_low && (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground mb-3">52-Week Range</p>
            <div className="flex items-center gap-3">
              <span className="text-xs tabular-nums text-muted-foreground">{fmtNum(stock.year_low)}</span>
              <div className="flex-1 h-2 rounded-full bg-muted relative">
                <div
                  className="absolute top-0 left-0 h-full rounded-full bg-accent"
                  style={{ width: `${Math.min(100, ((stock.price - stock.year_low) / (stock.year_high - stock.year_low)) * 100)}%` }}
                />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{fmtNum(stock.year_high)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockDetailPage;
