import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, TrendingDown, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

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

const PAGE_SIZE = 20;

const fetchStocks = async (): Promise<Stock[]> => {
  const { data, error } = await supabase
    .from("stocks_public")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return (data || []).map((s: any) => ({
    ...s,
    price: Number(s.price),
    previous_price: s.previous_price != null ? Number(s.previous_price) : null,
    day_change: Number(s.day_change),
    day_change_percent: Number(s.day_change_percent),
    volume: Number(s.volume),
    market_cap: s.market_cap != null ? Number(s.market_cap) : null,
    year_high: s.year_high != null ? Number(s.year_high) : null,
    year_low: s.year_low != null ? Number(s.year_low) : null,
    pe_ratio: s.pe_ratio != null ? Number(s.pe_ratio) : null,
    dividend_yield: s.dividend_yield != null ? Number(s.dividend_yield) : null,
  }));
};

type SortKey = "symbol" | "name" | "price" | "day_change_percent" | "volume" | "market_cap" | "pe_ratio" | "dividend_yield";

const StocksPage = () => {
  useDocumentTitle(
    "NSE Stocks – Kenya Fund Finder",
    "Track Nairobi Securities Exchange stock prices, daily changes, and key metrics."
  );

  const { data: stocks = [], isLoading } = useQuery({ queryKey: ["stocks"], queryFn: fetchStocks });

  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  const sectors = useMemo(() => {
    const s = new Set(stocks.map((st) => st.sector));
    return Array.from(s).sort();
  }, [stocks]);

  const filtered = useMemo(() => {
    let list = stocks;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    if (sectorFilter !== "all") {
      list = list.filter((s) => s.sector === sectorFilter);
    }
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === "string") return sortAsc ? (av as string).localeCompare(bv as string) : (bv as string).localeCompare(av as string);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [stocks, search, sectorFilter, sortKey, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
    setPage(0);
  };

  const SortHeader = ({ label, field, className = "" }: { label: string; field: SortKey; className?: string }) => (
    <th
      className={`px-2 py-2 font-medium cursor-pointer hover:text-foreground transition-colors select-none ${className}`}
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {sortKey === field && <ArrowUpDown className="h-3 w-3 text-accent" />}
      </span>
    </th>
  );

  const fmtNum = (n: number | null, decimals = 2) => n != null ? n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : "—";
  const fmtVol = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toString();
  };
  const fmtCap = (n: number | null) => {
    if (n == null) return "—";
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    return n.toLocaleString();
  };

  return (
    <div className="min-h-screen">
      <div className="container py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">NSE Stocks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Nairobi Securities Exchange stock prices and key metrics.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or symbol..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={sectorFilter} onValueChange={(v) => { setSectorFilter(v); setPage(0); }}>
            <SelectTrigger className="w-48 h-9 text-sm">
              <SelectValue placeholder="All Sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              {sectors.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground self-center">
            {filtered.length} stock{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : paged.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {stocks.length === 0 ? "No stocks available yet." : "No stocks match your search."}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/50">
                  <th className="text-left pl-4 pr-1 py-2 font-medium w-6">#</th>
                  <SortHeader label="Symbol" field="symbol" className="text-left" />
                  <SortHeader label="Name" field="name" className="text-left" />
                  <th className="text-left px-2 py-2 font-medium">Sector</th>
                  <SortHeader label="Price (KES)" field="price" className="text-right" />
                  <SortHeader label="Change" field="day_change_percent" className="text-right" />
                  <SortHeader label="Volume" field="volume" className="text-right" />
                  <SortHeader label="Mkt Cap" field="market_cap" className="text-right" />
                  <SortHeader label="P/E" field="pe_ratio" className="text-right" />
                  <SortHeader label="Div %" field="dividend_yield" className="text-right pr-4" />
                </tr>
              </thead>
              <tbody>
                {paged.map((stock, i) => {
                  const isUp = stock.day_change_percent > 0;
                  const isDown = stock.day_change_percent < 0;
                  return (
                    <tr key={stock.id} className="border-t border-border/40 hover:bg-muted/30 transition-colors">
                      <td className="pl-4 pr-1 py-2 text-muted-foreground tabular-nums">{page * PAGE_SIZE + i + 1}</td>
                      <td className="px-2 py-2">
                        <Link to={`/stocks/${stock.symbol}`} className="font-bold text-foreground hover:text-accent transition-colors">
                          {stock.symbol}
                        </Link>
                      </td>
                      <td className="px-2 py-2">
                        <Link to={`/stocks/${stock.symbol}`} className="text-foreground hover:text-accent transition-colors truncate block max-w-[180px]" title={stock.name}>
                          {stock.name}
                        </Link>
                      </td>
                      <td className="px-2 py-2">
                        <Badge variant="secondary" className="text-[9px] font-medium">{stock.sector}</Badge>
                      </td>
                      <td className="text-right px-2 py-2 font-semibold tabular-nums">{fmtNum(stock.price)}</td>
                      <td className="text-right px-2 py-2">
                        <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${isUp ? "text-green-500" : isDown ? "text-red-500" : "text-muted-foreground"}`}>
                          {isUp && <TrendingUp className="h-3 w-3" />}
                          {isDown && <TrendingDown className="h-3 w-3" />}
                          {isUp ? "+" : ""}{stock.day_change_percent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="text-right px-2 py-2 text-muted-foreground tabular-nums">{fmtVol(stock.volume)}</td>
                      <td className="text-right px-2 py-2 text-muted-foreground tabular-nums">{fmtCap(stock.market_cap)}</td>
                      <td className="text-right px-2 py-2 text-muted-foreground tabular-nums">{fmtNum(stock.pe_ratio, 1)}</td>
                      <td className="text-right px-2 pr-4 py-2 text-muted-foreground tabular-nums">{stock.dividend_yield != null ? stock.dividend_yield.toFixed(1) + "%" : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StocksPage;
