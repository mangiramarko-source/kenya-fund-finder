import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchPublicData } from "@/lib/gateway";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Sparkles,
  Layers,
  BarChart3,
  Newspaper,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Bot,
  Columns,
} from "lucide-react";

import StockTickerTape, { StockTickerItem } from "@/components/stocks/StockTickerTape";
import LeftSectorSidebar from "@/components/stocks/LeftSectorSidebar";
import SectorPerformanceGrid, { SectorMetric } from "@/components/stocks/SectorPerformanceGrid";
import FiftyTwoWeekRangeBar from "@/components/stocks/FiftyTwoWeekRangeBar";
import RichStockNewsCard from "@/components/stocks/RichStockNewsCard";
import StockAiCopilotPanel from "@/components/stocks/StockAiCopilotPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

export const StocksDemoPage: React.FC = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [expandedStockSymbol, setExpandedStockSymbol] = useState<string | null>("EQTY");

  // Mobile Tab toggle: "sectors" | "stocks" | "ai"
  const [mobileTab, setMobileTab] = useState<"sectors" | "stocks" | "ai">("stocks");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [stocksRes, newsRes] = await Promise.all([
          fetchPublicData<Stock[]>("stocks"),
          supabase.from("news_articles_public").select("*").order("published_at", { ascending: false }).limit(6),
        ]);

        if (stocksRes.data) {
          setStocks(stocksRes.data);
        }
        if (newsRes.data) {
          setNews(newsRes.data);
        }
      } catch (err) {
        console.error("Error loading demo stocks data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Compute sector statistics dynamically
  const sectorMetrics = useMemo<SectorMetric[]>(() => {
    if (!stocks || stocks.length === 0) return [];

    const map: Record<string, { count: number; totalCap: number; totalVol: number; changeSum: number }> = {};

    stocks.forEach((s) => {
      const sec = s.sector || "Other";
      if (!map[sec]) {
        map[sec] = { count: 0, totalCap: 0, totalVol: 0, changeSum: 0 };
      }
      map[sec].count += 1;
      map[sec].totalCap += s.market_cap || 0;
      map[sec].totalVol += s.volume || 0;
      map[sec].changeSum += s.day_change_percent || 0;
    });

    return Object.keys(map)
      .map((secName) => ({
        name: secName,
        count: map[secName].count,
        totalMarketCap: map[secName].totalCap,
        totalVolume: map[secName].totalVol,
        avgDayChangePercent: map[secName].count > 0 ? map[secName].changeSum / map[secName].count : 0,
      }))
      .sort((a, b) => b.totalMarketCap - a.totalMarketCap);
  }, [stocks]);

  // Stocks map for quick lookup by symbol
  const stocksMap = useMemo<Record<string, StockTickerItem>>(() => {
    const res: Record<string, StockTickerItem> = {};
    stocks.forEach((s) => {
      res[s.symbol] = {
        id: s.id,
        symbol: s.symbol,
        name: s.name,
        price: s.price,
        day_change: s.day_change,
        day_change_percent: s.day_change_percent,
      };
    });
    return res;
  }, [stocks]);

  // Filter stocks based on search query and sector selection
  const filteredStocks = useMemo(() => {
    return stocks.filter((s) => {
      const matchQuery =
        s.symbol.toLowerCase().includes(search.toLowerCase()) ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.sector.toLowerCase().includes(search.toLowerCase());
      const matchSector = selectedSector === null || s.sector === selectedSector;
      return matchQuery && matchSector;
    });
  }, [stocks, search, selectedSector]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* DEMO NOTICE BANNER */}
      <div className="bg-emerald-600 text-white py-2 px-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs md:text-sm font-medium">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 animate-pulse shrink-0" />
            <span>
              <strong>3-COLUMN STOCKS DEMO</strong> — Left: Sectors | Center: Stocks | Right: AI Copilot
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/stocks"
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg transition-colors font-semibold text-xs"
            >
              ← Exit Demo
            </Link>
          </div>
        </div>
      </div>

      {/* TOP SCROLLING TICKER TAPE */}
      <StockTickerTape stocks={stocks} onSelectStock={(sym) => setExpandedStockSymbol(sym)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-6">
        {/* Mobile Column Navigation Tabs */}
        <div className="lg:hidden flex bg-card border border-border p-1 rounded-xl gap-1 text-xs font-semibold">
          <button
            onClick={() => setMobileTab("sectors")}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              mobileTab === "sectors" ? "bg-emerald-500 text-white" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> Sectors
          </button>
          <button
            onClick={() => setMobileTab("stocks")}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              mobileTab === "stocks" ? "bg-emerald-500 text-white" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" /> Stocks ({filteredStocks.length})
          </button>
          <button
            onClick={() => setMobileTab("ai")}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              mobileTab === "ai" ? "bg-emerald-500 text-white" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Bot className="h-3.5 w-3.5" /> AI Copilot
          </button>
        </div>

        {/* 3-COLUMN DESKTOP GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================= COLUMN 1: LEFT SIDEBAR (Sectors List matching uploaded UI) ================= */}
          <div
            className={`lg:col-span-3 ${
              mobileTab === "sectors" ? "block" : "hidden lg:block"
            }`}
          >
            <LeftSectorSidebar
              sectors={sectorMetrics}
              selectedSector={selectedSector}
              onSelectSector={(sec) => {
                setSelectedSector(sec);
                setMobileTab("stocks"); // Auto switch to middle column on mobile tap
              }}
              onSelectStock={(sym) => {
                setExpandedStockSymbol(sym);
                setMobileTab("stocks");
              }}
            />
          </div>

          {/* ================= COLUMN 2: MIDDLE MAIN (Stocks & Range Bars & Rich News) ================= */}
          <div
            className={`lg:col-span-6 space-y-6 ${
              mobileTab === "stocks" ? "block" : "hidden lg:block"
            }`}
          >
            {/* Search & Filter Header */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-foreground">NSE Equities</h1>
                  <p className="text-xs text-muted-foreground">
                    Live market prices & 52-week channels
                  </p>
                </div>
                {selectedSector && (
                  <Badge variant="secondary" className="px-2.5 py-1 text-xs">
                    Filtered: {selectedSector}
                  </Badge>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by symbol, company, or sector..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-card border-border rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Stocks List */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <Skeleton key={n} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStocks.map((s) => {
                  const isUp = s.day_change_percent > 0;
                  const isDown = s.day_change_percent < 0;
                  const isExpanded = expandedStockSymbol === s.symbol;

                  return (
                    <div
                      key={s.id}
                      className={`rounded-xl border bg-card p-3.5 transition-all duration-200 ${
                        isExpanded
                          ? "border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30"
                          : "border-border hover:border-foreground/20"
                      }`}
                    >
                      {/* Top Row: Symbol, Name, Price */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-foreground">{s.symbol}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 truncate">
                              {s.sector}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate" title={s.name}>
                            {s.name}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold text-base text-foreground tabular-nums">
                            KSh {s.price.toFixed(2)}
                          </div>
                          <div
                            className={`flex items-center justify-end gap-0.5 text-xs font-semibold tabular-nums ${
                              isUp ? "text-emerald-500" : isDown ? "text-destructive" : "text-muted-foreground"
                            }`}
                          >
                            {isUp && <TrendingUp className="h-3 w-3" />}
                            {isDown && <TrendingDown className="h-3 w-3" />}
                            {!isUp && !isDown && <Minus className="h-3 w-3" />}
                            <span>
                              {isUp ? "+" : ""}
                              {s.day_change_percent.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 52-Week Range Slider */}
                      <div className="mt-3 pt-2 border-t border-border/60">
                        <FiftyTwoWeekRangeBar
                          currentPrice={s.price}
                          yearLow={s.year_low}
                          yearHigh={s.year_high}
                        />
                      </div>

                      {/* Card Footer Link */}
                      <div className="mt-2.5 pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/40">
                        <span className="text-[11px]">Vol: {s.volume?.toLocaleString() || "—"}</span>
                        <Link
                          to={`/stocks/${s.symbol}`}
                          className="flex items-center gap-1 text-emerald-500 font-semibold hover:underline text-[11px]"
                        >
                          Details <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rich Market News Feed */}
            {news.length > 0 && (
              <div className="pt-6 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Newspaper className="h-4 w-4 text-emerald-500" /> Stock News & Tags
                  </h2>
                </div>
                <div className="space-y-3">
                  {news.slice(0, 3).map((item) => (
                    <RichStockNewsCard key={item.id} article={item} stocksMap={stocksMap} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ================= COLUMN 3: RIGHT SIDEBAR (AI Copilot UI) ================= */}
          <div
            className={`lg:col-span-3 ${
              mobileTab === "ai" ? "block" : "hidden lg:block"
            }`}
          >
            <StockAiCopilotPanel
              stocks={stocksMap ? Object.values(stocksMap) : []}
              selectedSymbol={expandedStockSymbol}
              onSelectStock={(sym) => setExpandedStockSymbol(sym)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StocksDemoPage;
