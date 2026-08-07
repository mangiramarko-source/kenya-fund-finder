import { useEffect, useState, useMemo, useCallback } from "react";
import { decodeHtmlEntities, isKenyanMarketOpen } from "@/lib/utils";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import {
  TrendingUp, TrendingDown, Minus, Bell, BellPlus, Plus,
  Settings2, X, Star, Search, Eye, Check, SlidersHorizontal,
  BarChart3, DollarSign, Gem, LayoutDashboard, Crown,
  Landmark, ArrowRight, Newspaper, Clock, Briefcase,
  Home, Zap, Users, Activity, MessageSquare, AlertTriangle, MoreHorizontal, Heart, Calculator
} from "lucide-react";
import PortfolioSnapshotPanel from "@/components/portfolio/PortfolioSnapshotPanel";
import { PortfolioCardsCarousel } from "@/components/portfolio/PortfolioCardsCarousel";
import { MarketSummary } from "@/components/MarketSummary";
import { YieldCalculator } from "@/components/YieldCalculator";
import { NseMarketStatusCard } from "@/components/desktop/NseMarketStatusCard";
import { WatchlistSummaryCard } from "@/components/desktop/WatchlistSummaryCard";
import { ExchangeRatesCard } from "@/components/desktop/ExchangeRatesCard";
import { MarketMoversCard } from "@/components/desktop/MarketMoversCard";
import { toast } from "sonner";
import { safeUUID } from "@/lib/safeUUID";
import { fetchPublishedNews, fetchLatestNewsPreview, FUND_TYPE_LABELS, type FundFromDB, type FundType, type NewsFromDB } from "@/lib/api";
import CurrencyTicker from "@/components/CurrencyTicker";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import { getNewsImage, handleNewsImageError } from "@/lib/news-images";
import WatchCard from "@/components/watchlist/WatchCard";
import TestimonialsSection from "@/components/TestimonialsSection";

import DisclaimerBlock from "@/components/DisclaimerBlock";
import { useSocialFeed, type FeedItem } from "@/hooks/useSocialFeed";
import { SocialFeed, SocialFeedCard } from "@/components/feed/SocialFeed";
import { FeedItemDetailModal } from "@/components/feed/FeedItemDetailModal";
import { useFeedInteractions } from "@/hooks/useFeedInteractions";

const INTERNATIONAL_SOURCES = new Set([
  "Reuters Business",
  "Reuters Markets",
  "Reuters",
  "BBC Business",
  "BBC News",
  "Financial Times Africa",
  "Financial Times",
  "Bloomberg",
  "Al Jazeera",
  "CNBC World",
  "CNBC",
  "Investing.com",
  "MarketWatch",
  "Seeking Alpha",
  "African Business",
  "The Africa Report",
  "Further Africa",
]);

const isInternationalFeedItem = (item: any): boolean => {
  const src = item.authorName || item.rawItem?.source || "";
  const cat = item.authorLabel || item.rawItem?.category || "";
  return INTERNATIONAL_SOURCES.has(src) || cat.toLowerCase().includes("international");
};
/* ─── Types ─── */
interface WatchlistItem { id: string; user_id: string; item_type: string; item_id: string; item_name: string; sort_order: number; }
interface FundYieldSnapshot { snapshot_date: string; annual_yield: number; fund_id: string; }
interface RateHistory { snapshot_date: string; rate: number; currency_code: string; }
interface StockPriceHistory { snapshot_date: string; price: number; stock_id: string; }

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
  if (diff > 0) return <span className="inline-flex items-center gap-0.5 text-accent text-[11px] font-semibold"><TrendingUp className="h-3 w-3" />+{pct}%</span>;
  if (diff < 0) return <span className="inline-flex items-center gap-0.5 text-destructive text-[11px] font-semibold"><TrendingDown className="h-3 w-3" />{pct}%</span>;
  return <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[11px]"><Minus className="h-3 w-3" />0.00%</span>;
};

/* ─── Alert Dialog ─── */
const QuickAlertDialog = ({
  open, onClose, assetType, assetId, assetName, currentPrice, unit,
}: {
  open: boolean; onClose: () => void;
  assetType: "stock" | "currency" | "commodity"; assetId: string; assetName: string; currentPrice: number; unit?: string;
}) => {
  const { createAlert } = usePriceAlerts();
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) { toast.error("Enter a valid price"); return; }
    setSaving(true);
    const result = await createAlert({ asset_type: assetType, asset_id: assetId, asset_name: assetName, target_price: price, condition });
    setSaving(false);
    if (result?.error) toast.error("Failed to create alert");
    else { toast.success(`Alert set: ${assetName} ${condition} ${price}`); onClose(); setTargetPrice(""); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader><DialogTitle className="text-base">Set Price Alert</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-1">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Asset</p>
            <p className="font-semibold text-sm text-foreground">{assetName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Current: <span className="font-semibold text-accent">{currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} {unit}</span></p>
          </div>
          <Select value={condition} onValueChange={(v) => setCondition(v as any)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="above"><span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3 text-accent" /> Above</span></SelectItem>
              <SelectItem value="below"><span className="inline-flex items-center gap-1"><TrendingDown className="h-3 w-3 text-destructive" /> Below</span></SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" step="0.01" placeholder="Target price" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className="text-[16px] sm:text-sm h-9" />
          <Button onClick={handleCreate} disabled={saving} className="w-full h-9 text-sm">{saving ? "Creating…" : "Create Alert"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


/* ─── FxCustomize Dialog ─── */
const FxCustomizeDialog = ({
  open, onClose, allRates, selectedRates, onToggleRate
}: {
  open: boolean; onClose: () => void;
  allRates: any[];
  selectedRates: string[];
  onToggleRate: (code: string) => void;
}) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-base">Select Exchange Rates</DialogTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Choose up to 4 currencies to display. ({selectedRates.length}/4 selected)
          </p>
        </DialogHeader>
        <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto mt-2 pr-2 hide-scrollbar">
          {allRates.map(rate => {
            const isSelected = selectedRates.includes(rate.currency_code);
            const isDisabled = !isSelected && selectedRates.length >= 4;
            return (
              <div 
                key={rate.currency_code} 
                className={`flex items-center justify-between p-2 rounded-lg border border-border/40 ${isDisabled ? 'opacity-50' : 'cursor-pointer hover:bg-muted/50'} transition-colors`}
                onClick={() => !isDisabled && onToggleRate(rate.currency_code)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[12px] font-bold">
                    {{
                        USD: '🇺🇸', GBP: '🇬🇧', EUR: '🇪🇺', JPY: '🇯🇵', ZAR: '🇿🇦', 
                        AUD: '🇦🇺', CAD: '🇨🇦', CHF: '🇨🇭', CNY: '🇨🇳', INR: '🇮🇳',
                        AED: '🇦🇪', UGX: '🇺🇬', TZS: '🇹🇿', RWF: '🇷🇼', BIF: '🇧🇮',
                        SAR: '🇸🇦', SGD: '🇸🇬', KES: '🇰🇪'
                    }[rate.currency_code] || rate.currency_code.substring(0,2)}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-foreground leading-none mb-1">{rate.currency_code}/KES</p>
                    <p className="text-[11px] text-muted-foreground leading-none">{rate.currency_name || rate.currency_code}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center w-5 h-5 rounded-md border border-border">
                  {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                </div>
              </div>
            )
          })}
        </div>
        <div className="pt-2">
           <Button className="w-full h-9" onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Customize Dialog ─── */

type AssetCategory = "all" | "stock" | "currency" | "commodity" | "fund";

const CATEGORY_TABS: { value: AssetCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "stock", label: "Stocks" },
  { value: "currency", label: "FX Rates" },
  { value: "commodity", label: "Commodities" },
  { value: "fund", label: "Funds" },
];

const matchWatchlistItem = (w: WatchlistItem, type: string, id: string, symbolOrCode?: string, name?: string) => {
  if (w.item_type !== type) return false;
  const targetId = String(id).toLowerCase();
  const itemId = String(w.item_id || "").toLowerCase();
  const itemName = String(w.item_name || "").toLowerCase();

  if (itemId === targetId) return true;
  if (symbolOrCode && (itemId === symbolOrCode.toLowerCase() || itemName.includes(symbolOrCode.toLowerCase()))) return true;
  if (name && (itemName === name.toLowerCase() || itemId === name.toLowerCase())) return true;
  return false;
};

const CustomizeDialog = ({
  open, onClose, watchlist, allStocks, allRates, allCommodities, allFunds, onToggleAsset,
}: {
  open: boolean; onClose: () => void;
  watchlist: WatchlistItem[];
  allStocks: Stock[]; allRates: ExchangeRate[]; allCommodities: Commodity[]; allFunds: FundFromDB[];
  onToggleAsset: (type: string, id: string, name: string, symbol?: string) => void;
}) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AssetCategory>("all");
  const [watchedOnly, setWatchedOnly] = useState(false);

  const isWatched = (type: string, id: string, symbol?: string, name?: string) =>
    watchlist.some(w => matchWatchlistItem(w, type, id, symbol, name));

  const q = search.trim().toLowerCase();
  const matches = (...vals: string[]) => !q || vals.some(v => v.toLowerCase().includes(q));

  const filteredStocks = allStocks
    .filter(s => matches(s.name, s.symbol))
    .filter(s => !watchedOnly || isWatched("stock", s.id, s.symbol, s.name));
  const filteredRates = allRates
    .filter(r => matches(r.currency_code, r.currency_name))
    .filter(r => !watchedOnly || isWatched("currency", r.id, r.currency_code, r.currency_name));
  const filteredCommodities = allCommodities
    .filter(c => matches(c.name, c.symbol))
    .filter(c => !watchedOnly || isWatched("commodity", c.id, c.symbol, c.name));
  const filteredFunds = allFunds
    .filter(f => matches(f.name, f.manager))
    .filter(f => !watchedOnly || isWatched("fund", f.id, f.slug, f.name));

  const showStocks = (category === "all" || category === "stock") && filteredStocks.length > 0;
  const showRates = (category === "all" || category === "currency") && filteredRates.length > 0;
  const showCommodities = (category === "all" || category === "commodity") && filteredCommodities.length > 0;
  const showFunds = (category === "all" || category === "fund") && filteredFunds.length > 0;

  const totalShown =
    (showStocks ? filteredStocks.length : 0) +
    (showRates ? filteredRates.length : 0) +
    (showCommodities ? filteredCommodities.length : 0) +
    (showFunds ? filteredFunds.length : 0);

  const watchedCount = watchlist.length;

  const counts: Record<AssetCategory, number> = {
    all: allStocks.length + allRates.length + allCommodities.length + allFunds.length,
    stock: allStocks.length,
    currency: allRates.length,
    commodity: allCommodities.length,
    fund: allFunds.length,
  };

  const activeFilterCount = (category !== "all" ? 1 : 0) + (watchedOnly ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[760px] max-h-[100vh] sm:max-h-[85vh] h-[100vh] sm:h-auto w-screen sm:w-full max-w-none sm:rounded-lg rounded-none flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="min-w-0 pr-8">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base">Customize Your Watchlist</DialogTitle>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {watchedCount} tracked
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pick the specific assets you want to track on your overview.
            </p>
          </div>
        </DialogHeader>

        {/* Mobile toolbar: search + filter sheet (consistent with Stocks/Rates pages) */}
        <div className="md:hidden px-4 pt-3 pb-3 border-b border-border flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-lg bg-muted/30 border-border w-full text-[16px]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="relative inline-flex items-center justify-center gap-1.5 h-9 px-3 shrink-0 rounded-md border border-border bg-card text-foreground text-xs font-medium transition-colors"
                aria-label="Filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent" />
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl border-border max-h-[85vh] p-0 flex flex-col">
              <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
                <div className="flex items-center justify-between gap-2">
                  <SheetTitle className="text-base">Filters</SheetTitle>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => { setCategory("all"); setWatchedOnly(false); }}
                      className="text-[11px] text-accent hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Category</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORY_TABS.map(tab => {
                      const active = category === tab.value;
                      return (
                        <button
                          key={tab.value}
                          onClick={() => setCategory(tab.value)}
                          className={`inline-flex items-center justify-between gap-2 rounded-lg border px-3 h-10 text-xs font-medium transition-colors ${
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border text-muted-foreground"
                          }`}
                        >
                          <span className="truncate">{tab.label}</span>
                          <span className={`tabular-nums text-[10px] shrink-0 ${active ? "opacity-90" : "opacity-70"}`}>
                            {counts[tab.value]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Show</p>
                  <button
                    onClick={() => setWatchedOnly(v => !v)}
                    className={`w-full inline-flex items-center justify-between rounded-lg border px-3 h-11 text-xs font-medium transition-colors ${
                      watchedOnly
                        ? "bg-accent/10 border-accent/40 text-accent"
                        : "bg-card border-border text-muted-foreground"
                    }`}
                    aria-pressed={watchedOnly}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Star className={`h-3.5 w-3.5 ${watchedOnly ? "fill-accent" : ""}`} />
                      Tracked only
                    </span>
                    {watchedOnly && <Check className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-border">
                <SheetClose asChild>
                  <Button className="w-full h-10 text-sm">
                    Show {totalShown} {totalShown === 1 ? "result" : "results"}
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop toolbar: search + watched-only toggle + category tabs */}
        <div className="hidden md:block px-5 pt-4 pb-3 space-y-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name, symbol, manager…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setWatchedOnly(v => !v)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 h-9 text-xs font-medium transition-colors ${
                watchedOnly
                  ? "bg-accent/10 border-accent/40 text-accent"
                  : "bg-card border-border text-muted-foreground hover:border-accent/30 hover:text-foreground"
              }`}
              aria-pressed={watchedOnly}
            >
              <Star className={`h-3.5 w-3.5 ${watchedOnly ? "fill-accent" : ""}`} />
              Tracked only
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_TABS.map(tab => {
              const active = category === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setCategory(tab.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:border-accent/30 hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <span className={`tabular-nums text-[10px] ${active ? "opacity-90" : "opacity-70"}`}>
                    {counts[tab.value]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable list area */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {totalShown === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-foreground">No matches</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {watchedOnly ? "You're not tracking anything in this view yet." : "Try a different search or filter."}
              </p>
              {(search || watchedOnly || category !== "all") && (
                <button
                  onClick={() => { setSearch(""); setWatchedOnly(false); setCategory("all"); }}
                  className="mt-3 text-[11px] text-accent hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {showStocks && (
                <AssetGroup label="Stocks" items={filteredStocks.map(s => ({ id: s.id, symbol: s.symbol, name: s.name, sub: s.symbol, watched: isWatched("stock", s.id, s.symbol, s.name) }))} onToggle={(id, name, symbol) => onToggleAsset("stock", id, name, symbol)} />
              )}
              {showRates && (
                <AssetGroup label="FX Rates" items={filteredRates.map(r => ({ id: r.id, symbol: r.currency_code, name: `${r.currency_code}/KES`, sub: r.currency_name, watched: isWatched("currency", r.id, r.currency_code, `${r.currency_code}/KES`) }))} onToggle={(id, name, symbol) => onToggleAsset("currency", id, name, symbol)} />
              )}
              {showCommodities && (
                <AssetGroup label="Commodities" items={filteredCommodities.map(c => ({ id: c.id, symbol: c.symbol, name: c.name, sub: c.symbol, watched: isWatched("commodity", c.id, c.symbol, c.name) }))} onToggle={(id, name, symbol) => onToggleAsset("commodity", id, name, symbol)} />
              )}
              {showFunds && (
                <AssetGroup label="Funds" items={filteredFunds.map(f => ({ id: f.id, symbol: f.slug || f.name, name: f.name, sub: `${f.manager} · ${(f.fund_type || "").replace("_", " ")}`, watched: isWatched("fund", f.id, f.slug, f.name) }))} onToggle={(id, name, symbol) => onToggleAsset("fund", id, name, symbol)} />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Changes save automatically.
          </p>
          <Button size="sm" onClick={onClose} className="h-8 text-xs">Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AssetGroup = ({
  label,
  items,
  onToggle
}: {
  label: string;
  items: { id: string; name: string; sub: string; symbol?: string; watched: boolean }[];
  onToggle: (id: string, name: string, symbol?: string) => void;
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <span className="text-[10px] text-muted-foreground tabular-nums">{items.length}</span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
      {items.map(item => (
        <div
          key={item.id}
          onClick={() => onToggle(item.id, item.name, item.symbol)}
          className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left cursor-pointer transition-colors ${
            item.watched ? "bg-emerald-500/10 border border-emerald-500/40 text-foreground font-semibold" : "bg-card border border-border hover:border-accent/20"
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
          </div>
          <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
            item.watched ? "bg-emerald-500 border-emerald-500 text-white" : "border-border bg-background"
          }`}>
            {item.watched ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ─── Mini Chart ─── */
/**
 * Pass color="auto" to derive stroke from data trend (green up / red down).
 * Pass an explicit trend prop to override auto detection (keeps line in sync
 * with an external % change indicator).
 *
 * Uses lightweight SVG Sparkline (no recharts) to keep the homepage critical
 * JS path small and improve Speed Index / LCP.
 */
const MiniChart = ({ data, color = "hsl(var(--accent))", trend }: { data: { snapshot_date: string; rate: number }[]; color?: string; trend?: "up" | "down" | "flat" }) => {
  if (data.length < 2) return null;
  const series = data.map((d) => d.rate);
  return (
    <div className="w-full" style={{ height: 60 }}>
      <Sparkline
        data={series}
        width={300}
        height={60}
        color={color}
        trend={trend}
        className="w-full h-full"
      />
    </div>
  );
};

/* ─── Detailed Highlight Card (desktop) ─── */
/**
 * Compact highlight card matching the reference design:
 *  - Header row: icon chip + LABEL
 *  - Body: name + large value + change/sub  (sparkline floated right)
 *  - Divider + 2-col stats grid
 * No full-width bottom chart — the inline sparkline carries the trend.
 */
const DetailedHighlightCard = ({ icon: Icon, label, name, value, sub, change, linkTo, color, chartData, sparkData, trend, extras }: {
  icon: any; label: string; name: string; value: string; sub?: string;
  change?: React.ReactNode; linkTo?: string; color?: string;
  chartData?: { snapshot_date: string; rate: number }[]; chartColor?: string;
  sparkData?: number[]; trend?: "up" | "down" | "flat"; extras?: { label: string; value: string }[];
}) => {
  // Fall back to deriving spark series from chartData when sparkData isn't provided
  const spark = sparkData && sparkData.length >= 3
    ? sparkData
    : chartData && chartData.length >= 3
      ? chartData.map((d) => d.rate)
      : undefined;

  const content = (
    <div className="rounded-xl border border-border bg-card p-4 hover:border-accent/30 transition-colors group flex flex-col cursor-pointer h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${color || "bg-primary/10"}`}>
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-semibold text-muted-foreground uppercase tracking-wider text-sm">{label}</span>
        </div>
        {linkTo && (
          <span className="text-[10px] text-accent inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            View <ArrowRight className="h-3 w-3" />
          </span>
        )}
      </div>

      {/* Body: name + value + change   |   sparkline (right) */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate" title={name}>{name}</p>
          <p className="text-2xl font-bold text-foreground tabular-nums mt-1 leading-none">{value}</p>
          <div className="flex items-center gap-2 mt-2">
            {change}
            {sub && <span className="text-[11px] text-muted-foreground truncate">{sub}</span>}
          </div>
        </div>
        {spark && (
          <Sparkline data={spark} width={88} height={36} color="auto" trend={trend} className="shrink-0" />
        )}
      </div>

      {/* Stats grid */}
      {extras && extras.length > 0 && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-3 pt-3 border-t border-border/60">
          {extras.map((e, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{e.label}</span>
              <span className="text-[11px] font-semibold tabular-nums text-foreground">{e.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  if (linkTo) return <Link to={linkTo} className="flex flex-col h-full">{content}</Link>;
  return content;
};

/* ─── Compact Highlight Card (mobile) — matches WatchCard row style ─── */
const HighlightCard = ({ icon: Icon, label, name, value, sub, change, linkTo, color }: {
  icon: any; label?: string; name: string; value: string; sub?: string;
  change?: React.ReactNode; linkTo?: string; color?: string;
}) => {
  const content = (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 hover:border-accent/30 transition-colors group cursor-pointer">
      <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${color || "bg-primary/10"}`}>
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        {label && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          </div>
        )}
        <p className="text-xs font-semibold text-foreground truncate">{name}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold tabular-nums text-foreground">{value}</p>
        <div className="mt-0.5">{change || (sub && <span className="text-[10px] text-muted-foreground">{sub}</span>)}</div>
      </div>
    </div>
  );
  if (linkTo) return <Link to={linkTo}>{content}</Link>;
  return content;
};

/* ─── Mobile Stock Highlight Card (mirrors StocksPage MobileStockCard) ─── */
const MobileStockHighlightCard = ({
  symbol, name, price, dayChange, dayChangePct, sparkData, linkTo,
}: {
  symbol: string; name: string; price: number; dayChange: number; dayChangePct: number;
  sparkData?: number[]; linkTo: string;
}) => {
  const positive = dayChange >= 0;
  const trend: "up" | "down" | "flat" = dayChange > 0 ? "up" : dayChange < 0 ? "down" : "flat";
  return (
    <Link
      to={linkTo}
      className="block rounded-xl border border-border bg-card hover:border-accent/30 transition-all active:scale-[0.99] overflow-hidden"
    >
      <div className="flex items-center gap-3 p-3.5">
        <div className="flex-1 min-w-0">
          <span className="font-bold text-foreground text-sm">{symbol}</span>
          <p className="text-[11px] text-muted-foreground truncate">{name}</p>
        </div>
        {sparkData && sparkData.length >= 2 && (
          <div className="shrink-0">
            <Sparkline data={sparkData} width={60} height={24} color="auto" trend={trend} />
          </div>
        )}
        <div className="text-right shrink-0">
          <p className="font-bold text-foreground text-sm tabular-nums">KES {price.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          {dayChange > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-accent text-[11px] font-semibold tabular-nums">
              <TrendingUp className="h-3 w-3" /> +{dayChangePct.toFixed(2)}%
            </span>
          ) : dayChange < 0 ? (
            <span className="inline-flex items-center gap-0.5 text-destructive text-[11px] font-semibold tabular-nums">
              <TrendingDown className="h-3 w-3" /> {dayChangePct.toFixed(2)}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[11px]">
              <Minus className="h-3 w-3" /> 0.00%
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

/* ─── Mobile Fund Highlight Card (mirrors FundMobileCards) ─── */
const MobileFundHighlightCard = ({
  name, annualYield, dailyYield, prevAnnualYield, linkTo,
}: {
  name: string; annualYield: number; dailyYield: number; prevAnnualYield?: number; linkTo: string;
}) => {
  const diff = prevAnnualYield != null ? annualYield - prevAnnualYield : null;
  const isFlat = diff != null && Math.abs(diff) < 0.0001;
  const isUp = diff != null && diff > 0;
  return (
    <Link
      to={linkTo}
      className="block rounded-xl border border-border bg-card hover:border-accent/30 transition-all active:scale-[0.99] overflow-hidden"
    >
      <div className="flex items-center gap-3 p-3.5">
        <div className="flex-1 min-w-0">
          <span className="font-bold text-foreground text-sm truncate block">{name}</span>
          {diff != null && (
            <span className={`mt-0.5 inline-flex items-center gap-1 text-xs font-medium tabular-nums ${
              isFlat ? "text-muted-foreground" : isUp ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
            }`}>
              {isFlat ? <Minus className="h-3 w-3" /> : isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{isFlat ? "" : isUp ? "+" : ""}{diff.toFixed(2)}%</span>
            </span>
          )}
        </div>
        <div className="text-right shrink-0 space-y-1">
          <div className="flex items-baseline justify-end gap-2">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-10 text-right leading-none">annual</span>
            <span className="text-accent tabular-nums leading-none w-14 text-right text-sm font-extrabold">{annualYield.toFixed(2)}%</span>
          </div>
          <div className="flex items-baseline justify-end gap-2">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-10 text-right leading-none">daily</span>
            <span className="text-muted-foreground tabular-nums font-normal leading-none w-14 text-right text-sm">{dailyYield.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

/* ─── Mobile section heading for grouped highlight cards ─── */
const MobileGroupHeading = ({ icon: Icon, label, tone = "muted" }: { icon: any; label: string; tone?: "success" | "destructive" | "primary" | "accent" | "muted" }) => {
  const toneClass =
    tone === "success" ? "text-success"
    : tone === "destructive" ? "text-destructive"
    : tone === "primary" ? "text-primary"
    : tone === "accent" ? "text-accent"
    : "text-muted-foreground";
  return (
    <div className="flex items-center gap-1.5 mt-1 mb-0.5">
      <Icon className={`h-3.5 w-3.5 ${toneClass}`} />
      <span className={`text-[11px] font-semibold uppercase tracking-wide ${toneClass}`}>{label}</span>
    </div>
  );
};

/* ─── Highlight List Card (desktop, mirrors mobile card style) ─── */
const HighlightListCard = ({
  title, sub, value, changePct, sparkData, trend, linkTo,
}: {
  title: string; sub: string; value: string;
  changePct?: number | null; sparkData?: number[];
  trend?: "up" | "down" | "flat"; linkTo: string;
}) => {
  return (
    <Link
      to={linkTo}
      className="block group hover:bg-muted/30 -mx-2 px-2 py-1.5 rounded-md transition-colors"
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <span className="font-bold text-foreground text-xs truncate block group-hover:text-accent transition-colors">{title}</span>
          <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
        </div>
        {sparkData && sparkData.length >= 2 && (
          <div className="shrink-0">
            <Sparkline data={sparkData} width={40} height={16} color="auto" trend={trend} />
          </div>
        )}
        <div className="text-right shrink-0">
          <p className="font-bold text-foreground text-[11px] tabular-nums">{value}</p>
          {changePct != null ? (
            changePct > 0 ? (
              <span className="inline-flex items-center gap-0.5 text-accent text-[9px] font-semibold tabular-nums">
                <TrendingUp className="h-2 w-2" /> +{changePct.toFixed(2)}%
              </span>
            ) : changePct < 0 ? (
              <span className="inline-flex items-center gap-0.5 text-destructive text-[9px] font-semibold tabular-nums">
                <TrendingDown className="h-2 w-2" /> {changePct.toFixed(2)}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[9px]">
                <Minus className="h-2 w-2" /> 0.00%
              </span>
            )
          ) : null}
        </div>
      </div>
    </Link>
  );
};

/* ─── Highlight Column (desktop) — heading + stacked HighlightListCards ─── */
const HighlightColumn = ({ icon: Icon, label, link, children }: {
  icon: any; label: string; link: string; children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <Link to={link} className="text-[10px] text-accent hover:underline inline-flex items-center gap-0.5">
        View <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
    {children}
  </div>
);

/* ─── Watchlist (grouped by asset type) ─── */
const WatchlistSubGroup = ({ label, count, children }: { label: string; count: number; children: React.ReactNode }) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <span className="text-[10px] text-muted-foreground/70">·</span>
      <span className="text-[10px] text-muted-foreground/70">{count}</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {children}
    </div>
  </div>
);

const WatchlistGroupedSection = ({
  watchedFunds, watchedStocks, watchedRates, watchedCommoditiesList,
  getFundHistory, getStockHistory, getStockSparkData, getHistory,
  openAlert, toggleAsset,
}: {
  watchedFunds: FundFromDB[];
  watchedStocks: Stock[];
  watchedRates: ExchangeRate[];
  watchedCommoditiesList: Commodity[];
  getFundHistory: (id: string) => { snapshot_date: string; rate: number }[];
  getStockHistory: (id: string) => { snapshot_date: string; rate: number }[];
  getStockSparkData: (id: string) => number[] | undefined;
  getHistory: (code: string) => { snapshot_date: string; rate: number }[];
  openAlert: (type: "stock" | "currency" | "commodity", id: string, name: string, price: number, unit?: string) => void;
  toggleAsset: (type: string, id: string, name: string) => void;
}) => {
  // Group funds by fund_type for clearer organisation
  const fundsByType = useMemo(() => {
    const grouped: Record<string, FundFromDB[]> = {};
    watchedFunds.forEach((f) => {
      const key = f.fund_type || "other";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(f);
    });
    return grouped;
  }, [watchedFunds]);

  const total =
    watchedFunds.length + watchedStocks.length + watchedRates.length + watchedCommoditiesList.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Star className="h-4 w-4 text-warning" /> Your Watchlist
        </h2>
        <span className="text-[10px] text-muted-foreground">{total} items</span>
      </div>

      <div className="space-y-5">
        {/* Funds (grouped by type) */}
        {watchedFunds.length > 0 && (
          <div className="space-y-4">
            {Object.entries(fundsByType).map(([type, list]) => {
              const label = FUND_TYPE_LABELS[type as FundType] || type.replace("_", " ");
              return (
                <WatchlistSubGroup key={type} label={label} count={list.length}>
                  {list.map((f) => {
                    const fHistory = getFundHistory(f.id);
                    const fundTrend: "up" | "down" | "flat" | undefined = fHistory.length >= 2
                      ? (fHistory[fHistory.length - 1].rate > fHistory[0].rate ? "up" : fHistory[fHistory.length - 1].rate < fHistory[0].rate ? "down" : "flat")
                      : undefined;
                    return (
                      <WatchCard key={f.id} title={f.name} sub={f.manager} value={`${Number(f.annual_yield || 0).toFixed(2)}%`}
                        change={<span className="text-[11px] text-muted-foreground">Daily: {Number(f.daily_yield || 0).toFixed(4)}%</span>}
                        chart={fHistory.length > 2 ? <MiniChart data={fHistory} color="hsl(var(--primary))" /> : undefined}
                        sparkData={fHistory.length > 2 ? fHistory.map(h => h.rate) : undefined}
                        trend={fundTrend}
                        linkTo={`/compare/${f.slug}`}
                        onRemove={() => toggleAsset("fund", f.id, f.name)} />
                    );
                  })}
                </WatchlistSubGroup>
              );
            })}
          </div>
        )}

        {/* Stocks */}
        {watchedStocks.length > 0 && (
          <WatchlistSubGroup label="Stocks" count={watchedStocks.length}>
            {watchedStocks.map(s => {
              const sHistory = getStockHistory(s.id);
              return (
                <WatchCard key={s.id} title={s.symbol} sub={s.name} value={`KES ${Number(s.price || 0).toFixed(2)}`}
                  change={<Change current={Number(s.price || 0)} previous={s.previous_price ? Number(s.previous_price) : null} />}
                  chart={sHistory.length > 2 ? <MiniChart data={sHistory} /> : undefined}
                  sparkData={getStockSparkData(s.id)}
                  trend={trendOf(s.price, s.previous_price)}
                  linkTo={`/stocks/${s.symbol}`}
                  onAlert={() => openAlert("stock", s.id, s.name, s.price, "KES")}
                  onRemove={() => toggleAsset("stock", s.id, s.name)} />
              );
            })}
          </WatchlistSubGroup>
        )}

        {/* FX Rates */}
        {watchedRates.length > 0 && (
          <WatchlistSubGroup label="FX Rates" count={watchedRates.length}>
            {watchedRates.map(r => {
              const history = getHistory(r.currency_code);
              return (
                <WatchCard key={r.id} title={`${r.currency_code}/KES`} sub={r.currency_name} value={`KES ${Number(r.rate).toFixed(2)}`}
                  change={<Change current={Number(r.rate)} previous={r.previous_rate != null ? Number(r.previous_rate) : null} />}
                  chart={history.length > 2 ? <MiniChart data={history} /> : undefined}
                  sparkData={history.length > 2 ? history.map(h => h.rate) : undefined}
                  trend={trendOf(Number(r.rate), r.previous_rate != null ? Number(r.previous_rate) : null)}
                  linkTo="/rates"
                  onAlert={() => openAlert("currency", r.id, `${r.currency_code}/KES`, Number(r.rate), "KES")}
                  onRemove={() => toggleAsset("currency", r.id, `${r.currency_code}/KES`)} />
              );
            })}
          </WatchlistSubGroup>
        )}

        {/* Commodities */}
        {watchedCommoditiesList.length > 0 && (
          <WatchlistSubGroup label="Commodities" count={watchedCommoditiesList.length}>
            {watchedCommoditiesList.map(c => (
              <WatchCard key={c.id} title={c.name} sub={c.symbol} value={`${Number(c.price).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${c.unit}`}
                change={<Change current={Number(c.price)} previous={c.previous_price != null ? Number(c.previous_price) : null} />}
                trend={trendOf(Number(c.price), c.previous_price != null ? Number(c.previous_price) : null)}
                linkTo="/commodities"
                onAlert={() => openAlert("commodity", c.id, c.name, Number(c.price), c.unit)}
                onRemove={() => toggleAsset("commodity", c.id, c.name)} />
            ))}
          </WatchlistSubGroup>
        )}
      </div>
    </div>
  );
};

/* ─── Main Page ─── */
const OverviewPage = () => {
  useDocumentTitle(
    "Kenya Fund Finder – Stocks, Unit Trusts, FX & Commodities",
    "Compare CMA-regulated unit trusts, NSE stocks, FX rates, and commodity prices. Daily-updated data, calculators, and price alerts for Kenyan investors.",
    {
      title: "Kenya Fund Finder – Stocks, Unit Trusts, FX & Commodities",
      description: "Compare CMA-regulated unit trusts, NSE stocks, FX rates, and commodity prices for Kenyan investors.",
    }
  );
  const navigate = useNavigate();
  const { user } = useAuth();
  const { rates, commodities, stocks, loading: marketLoading } = useMarketData();
  const { alerts } = usePriceAlerts();
  const { toggleLike, addComment, getPostInteraction } = useFeedInteractions();

  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [news, setNews] = useState<NewsFromDB[]>([]);
  const [rateHistory, setRateHistory] = useState<RateHistory[]>([]);
  const [fundSnapshots, setFundSnapshots] = useState<FundYieldSnapshot[]>([]);
  const [stockHistory, setStockHistory] = useState<StockPriceHistory[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  
  const [fxCustomizeOpen, setFxCustomizeOpen] = useState(false);
  const [selectedFxRates, setSelectedFxRates] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kf_selected_fx_rates');
      return saved ? JSON.parse(saved) : ['USD', 'GBP'];
    } catch {
      return ['USD', 'GBP'];
    }
  });

  useEffect(() => {
    localStorage.setItem('kf_selected_fx_rates', JSON.stringify(selectedFxRates));
  }, [selectedFxRates]);

  const toggleFxRate = (code: string) => {
    setSelectedFxRates(prev => {
      if (prev.includes(code)) {
        return prev.filter(c => c !== code);
      }
      if (prev.length >= 4) return prev;
      return [...prev, code];
    });
  };

  const [profileName, setProfileName] = useState("");
  // Top tab: "overview", "watchlist", or "portfolio"
  const [mobileTab, setMobileTab] = useState<"overview" | "watchlist" | "portfolio">("overview");

  const feedItems = useSocialFeed(news, stocks, funds, rates, commodities);
  const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null);
  const [watchlistPromptOpen, setWatchlistPromptOpen] = useState(false);

  const [alertDialog, setAlertDialog] = useState<{
    open: boolean; assetType: "stock" | "currency" | "commodity";
    assetId: string; assetName: string; currentPrice: number; unit?: string;
  }>({ open: false, assetType: "stock", assetId: "", assetName: "", currentPrice: 0 });

  const fetchAllData = useCallback(() => {
    // Fetch funds directly from the public view (avoids the public-data edge function
    // round-trip / cold-start, which was lagging the Money Markets column on first paint).
    supabase
      .from("funds_public")
      .select("id, slug, name, manager, cma_licensed, annual_yield, daily_yield, seven_day_yield, thirty_day_yield, fund_type, minimum_investment, management_fee, withdrawal_time, description, website, fact_sheet_date, yield_unit, is_published, updated_at")
      .eq("is_published", true)
      .order("annual_yield", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setFunds(((data as any) || []).map((f: any) => ({
          ...f,
          fund_type: (f.fund_type || "money_market") as FundType,
          yield_unit: f.yield_unit || "%",
          annual_yield: Number(f.annual_yield),
          daily_yield: Number(f.daily_yield),
          seven_day_yield: Number(f.seven_day_yield),
          thirty_day_yield: Number(f.thirty_day_yield),
          minimum_investment: Number(f.minimum_investment),
          management_fee: Number(f.management_fee),
        })));
      })
      .then(undefined, () => {})
      .then(() => setFundsLoading(false));
    fetchPublishedNews().then(n => setNews(n)).catch(() => {});
    // 90-day window for history (much smaller payloads than limit=500/1000 unfiltered)
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    supabase.from("exchange_rate_history_public" as any)
      .select("snapshot_date, rate, currency_code")
      .gte("snapshot_date", since)
      .order("snapshot_date", { ascending: true })
      .then(({ data }) => setRateHistory(((data as any) || []).map((h: any) => ({ ...h, rate: Number(h.rate) }))));
    supabase.from("fund_yield_snapshots")
      .select("snapshot_date, annual_yield, fund_id")
      .gte("snapshot_date", since)
      .order("snapshot_date", { ascending: true })
      .then(({ data }) => setFundSnapshots(((data as any) || []).map((s: any) => ({ ...s, annual_yield: Number(s.annual_yield) }))));
    supabase.from("stock_price_history" as any)
      .select("snapshot_date, price, stock_id")
      .gte("snapshot_date", since)
      .order("snapshot_date", { ascending: true })
      .then(({ data }) => setStockHistory(((data as any) || []).map((h: any) => ({ ...h, price: Number(h.price) }))));
  }, []);

  useEffect(() => {
    fetchAllData();
    // Refresh every 5 min during market hours (Mon-Fri 8am-6pm EAT)
    const interval = window.setInterval(() => {
      if (isKenyanMarketOpen()) {
        fetchAllData();
      }
    }, 5 * 60_000);
    return () => window.clearInterval(interval);
  }, [fetchAllData]);

  // Fetch profile display name
  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => { if (data?.display_name) setProfileName(data.display_name); });
    } else { setProfileName(""); }
  }, [user]);

  const fetchWatchlist = useCallback(async () => {
    let localItems: WatchlistItem[] = [];
    try {
      const saved = localStorage.getItem("kf_local_watchlist");
      if (saved) localItems = JSON.parse(saved);
    } catch {}

    if (!user) {
      setWatchlist(localItems);
      setWatchlistLoading(false);
      return;
    }

    const { data, error } = await supabase.from("user_watchlist").select("*").eq("user_id", user.id).order("sort_order");
    if (!error && data && data.length > 0) {
      const dbItems = data as WatchlistItem[];
      const combined = [...dbItems];
      localItems.forEach(loc => {
        if (!combined.some(db => db.item_type === loc.item_type && (db.item_id === loc.item_id || db.item_name === loc.item_name))) {
          combined.push(loc);
        }
      });
      setWatchlist(combined);
    } else {
      setWatchlist(localItems);
    }
    setWatchlistLoading(false);
  }, [user]);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

  const toggleAsset = async (type: string, id: string, name: string, symbol?: string) => {
    const existing = watchlist.find(w => matchWatchlistItem(w, type, id, symbol, name));
    let nextWatchlist: WatchlistItem[];
    if (existing) {
      nextWatchlist = watchlist.filter(w => !matchWatchlistItem(w, type, id, symbol, name));
      setWatchlist(nextWatchlist);
      localStorage.setItem("kf_local_watchlist", JSON.stringify(nextWatchlist));
      toast.success(`Removed ${name}`);
      if (user) {
        await supabase.from("user_watchlist").delete().eq("id", existing.id);
      }
    } else {
      const tempItem: WatchlistItem = {
        id: safeUUID(),
        user_id: user?.id || "guest",
        item_type: type,
        item_id: id,
        item_name: name,
        sort_order: watchlist.length
      };
      nextWatchlist = [...watchlist, tempItem];
      setWatchlist(nextWatchlist);
      localStorage.setItem("kf_local_watchlist", JSON.stringify(nextWatchlist));
      toast.success(`Added ${name}`);
      if (user) {
        await supabase.from("user_watchlist").insert({
          user_id: user.id,
          item_type: type,
          item_id: id,
          item_name: name
        });
      }
    }
  };

  const openAlert = (assetType: "stock" | "currency" | "commodity", assetId: string, assetName: string, currentPrice: number, unit?: string) => {
    if (!user) { navigate("/auth"); return; }
    setAlertDialog({ open: true, assetType, assetId, assetName, currentPrice, unit });
  };

  // Derived watchlist data
  const watchedStockIds = useMemo(() => watchlist.filter(w => w.item_type === "stock").map(w => w.item_id), [watchlist]);
  const watchedCurrencyIds = useMemo(() => watchlist.filter(w => w.item_type === "currency").map(w => w.item_id), [watchlist]);
  const watchedCommodityIds = useMemo(() => watchlist.filter(w => w.item_type === "commodity").map(w => w.item_id), [watchlist]);
  const watchedFundIds = useMemo(() => watchlist.filter(w => w.item_type === "fund").map(w => w.item_id), [watchlist]);

  const watchedStocks = useMemo(() => stocks.filter(s => watchedStockIds.includes(s.id)), [stocks, watchedStockIds]);
  const watchedRates = useMemo(() => rates.filter(r => watchedCurrencyIds.includes(r.id)), [rates, watchedCurrencyIds]);
  const watchedCommoditiesList = useMemo(() => commodities.filter(c => watchedCommodityIds.includes(c.id)), [commodities, watchedCommodityIds]);
  const watchedFunds = useMemo(() => funds.filter(f => watchedFundIds.includes(f.id)), [funds, watchedFundIds]);

  const derivedWatchlistItems = useMemo(() => {
    if (watchlist.length === 0) return [];
    const result: Array<{ id: string; symbol: string; name: string; price: number; day_change_percent?: number }> = [];
    watchlist.forEach(w => {
      if (w.item_type === "stock") {
        const s = stocks.find(st => matchWatchlistItem(w, "stock", st.id, st.symbol, st.name));
        if (s) result.push({ id: s.id, symbol: s.symbol, name: s.name, price: s.price, day_change_percent: s.day_change_percent });
        else result.push({ id: w.id, symbol: (w.item_name || "STK").substring(0, 4).toUpperCase(), name: w.item_name || "Stock", price: 0, day_change_percent: 0 });
      } else if (w.item_type === "currency") {
        const r = rates.find(rt => matchWatchlistItem(w, "currency", rt.id, rt.currency_code, rt.currency_name));
        if (r) result.push({ id: r.id, symbol: `${r.currency_code}/KES`, name: r.currency_name || r.currency_code, price: r.rate, day_change_percent: r.day_change_percent });
        else result.push({ id: w.id, symbol: w.item_name || "FX", name: w.item_name || "Currency", price: 0, day_change_percent: 0 });
      } else if (w.item_type === "commodity") {
        const c = commodities.find(cm => matchWatchlistItem(w, "commodity", cm.id, cm.symbol, cm.name));
        if (c) result.push({ id: c.id, symbol: c.symbol, name: c.name, price: c.price, day_change_percent: c.day_change_percent });
        else result.push({ id: w.id, symbol: w.item_name || "CMD", name: w.item_name || "Commodity", price: 0, day_change_percent: 0 });
      } else if (w.item_type === "fund") {
        const f = funds.find(fn => matchWatchlistItem(w, "fund", fn.id, fn.slug, fn.name));
        if (f) result.push({ id: f.id, symbol: f.name.substring(0, 4).toUpperCase(), name: f.name, price: f.buy_price || f.sell_price || 100, day_change_percent: f.effective_yield || 0 });
        else result.push({ id: w.id, symbol: (w.item_name || "FND").substring(0, 4).toUpperCase(), name: w.item_name || "Fund", price: 100, day_change_percent: 0 });
      }
    });
    return result;
  }, [watchlist, stocks, rates, commodities, funds]);

  const displayFxRates = useMemo(() => {
    if (!rates || rates.length === 0) return [];
    const filtered = rates.filter(r => selectedFxRates.includes(r.currency_code));
    return (filtered.length > 0 ? filtered : rates.slice(0, 4)).slice(0, 4);
  }, [rates, selectedFxRates]);

  const hasWatchlist = watchedStocks.length > 0 || watchedRates.length > 0 || watchedCommoditiesList.length > 0 || watchedFunds.length > 0;

  // Only block on essentials: market data and (for signed-in users) the watchlist itself.
  // Funds + historical snapshots stream in progressively to keep TTFP fast.
  const loading = marketLoading || (!!user && watchlistLoading);

  // Best performers
  const bestStock = useMemo(() => stocks.length ? [...stocks].sort((a, b) => b.day_change_percent - a.day_change_percent)[0] : null, [stocks]);
  const topGainers = useMemo(
    () => [...stocks].filter(s => s.day_change_percent > 0).sort((a, b) => b.day_change_percent - a.day_change_percent).slice(0, 3),
    [stocks]
  );
  const topLosers = useMemo(
    () => [...stocks].filter(s => s.day_change_percent < 0).sort((a, b) => a.day_change_percent - b.day_change_percent).slice(0, 3),
    [stocks]
  );
  const bestMM = useMemo(() => {
    const mm = funds.filter(f => f.fund_type === "money_market");
    return mm.length ? [...mm].sort((a, b) => b.annual_yield - a.annual_yield)[0] : null;
  }, [funds]);
  const moneyMarketFunds = useMemo(
    () => funds.filter(f => f.fund_type === "money_market").sort((a, b) => b.annual_yield - a.annual_yield).slice(0, 3),
    [funds]
  );
  const bestFI = useMemo(() => {
    const fi = funds.filter(f => f.fund_type === "fixed_income");
    return fi.length ? [...fi].sort((a, b) => b.annual_yield - a.annual_yield)[0] : null;
  }, [funds]);
  const bestFXRate = useMemo(() => rates.length ? rates[0] : null, [rates]);
  const goldCommodity = useMemo(() => commodities.find(c => c.name.toLowerCase().includes("gold")) || null, [commodities]);
  const silverCommodity = useMemo(() => commodities.find(c => c.name.toLowerCase().includes("silver")) || null, [commodities]);
  const topFXRates = useMemo(
    () => [...rates].filter(r => ["USD", "EUR", "GBP"].includes(r.currency_code)),
    [rates]
  );
  const topCommodities = useMemo(
    () => commodities.filter(c => {
      const name = c.name.toLowerCase();
      return name.includes("gold") || name.includes("silver") || name.includes("oil") || name.includes("brent") || name.includes("wti");
    }).slice(0, 3), 
    [commodities]
  );

  const mmFunds = useMemo(() => funds.filter(f => f.fund_type === "money_market"), [funds]);
  const fiFunds = useMemo(() => funds.filter(f => f.fund_type === "fixed_income"), [funds]);
  const bestMMYield = useMemo(() => mmFunds.length ? Math.max(...mmFunds.map(f => f.annual_yield)) : 0, [mmFunds]);

  const getHistory = (code: string) => rateHistory.filter(h => h.currency_code === code).slice(-30);
  const getFundHistory = (fundId: string) => fundSnapshots.filter(s => s.fund_id === fundId).slice(-30).map(s => ({ snapshot_date: s.snapshot_date, rate: s.annual_yield }));
  const getStockHistory = (stockId: string) => stockHistory.filter(h => h.stock_id === stockId).slice(-30).map(h => ({ snapshot_date: h.snapshot_date, rate: h.price }));
  const getStockSparkData = (stockId: string) => stockHistory.filter(h => h.stock_id === stockId).slice(-30).map(h => h.price);

  const displayName = profileName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  const [activeUpdateCategory, setActiveUpdateCategory] = useState("All");

  const sortedStocks = useMemo(() => {
    if (!stocks) return [];
    return [...stocks].sort((a, b) => b.day_change_percent - a.day_change_percent);
  }, [stocks]);
  
  const topGainer = sortedStocks[0];
  const topLoser = sortedStocks[sortedStocks.length - 1];

  const scomStock = useMemo(() => {
    if (!stocks || stocks.length === 0) return null;
    return stocks.find(s => s.symbol === "SCOM" || s.name.toLowerCase().includes("safaricom")) || stocks[0];
  }, [stocks]);

  const usdRate = rates?.find(r => r.currency_code === "USD");
  const gbpRate = rates?.find(r => r.currency_code === "GBP");
  const eurRate = rates?.find(r => r.currency_code === "EUR");

  const topMoneyMarket = useMemo(() => {
    if (!funds) return null;
    return [...funds].filter(f => (f.fund_type as string) === "Money Market" || f.fund_type === "money_market").sort((a, b) => b.annual_yield - a.annual_yield)[0];
  }, [funds]);

  const filteredFeedItems = useMemo(() => {
    let list = [...feedItems];
    if (activeUpdateCategory === "Kenyan") {
      list = list.filter(item => !isInternationalFeedItem(item));
    } else if (activeUpdateCategory === "International") {
      list = list.filter(item => isInternationalFeedItem(item));
    } else if (activeUpdateCategory === "Latest") {
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } else if (activeUpdateCategory === "Oldest") {
      list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    return list;
  }, [feedItems, activeUpdateCategory]);

  const newTodayCount = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    return (news || []).filter(item => {
      if (!item.date_published) return false;
      const pubTime = new Date(item.date_published).getTime();
      return !isNaN(pubTime) && (now - pubTime) <= oneDayMs;
    }).length;
  }, [news]);

  // No global loading block - we will handle loading states inside the layout to prevent FCP lag.

  return (
    <>
      <main className="px-4 py-6 md:grid md:grid-cols-12 md:gap-6 md:px-6">
        <h1 className="sr-only">KenyaFundFinder market overview</h1>

        {/* Left Column - Desktop Only */}
        <div className="hidden md:flex md:flex-col md:col-span-3 space-y-4 sticky top-20 h-fit">
          <NseMarketStatusCard />
          <WatchlistSummaryCard
            items={derivedWatchlistItems}
            stocks={stocks as any}
            onOpenCustomize={() => setWatchlistPromptOpen(true)}
          />
        </div>

        {/* Middle Column - Feed */}
        <div className="md:col-span-6 flex flex-col w-full max-w-full overflow-hidden">
          {/* On mobile, PortfolioCardsCarousel stays horizontal here */}
          <div className="md:hidden">
            <PortfolioCardsCarousel orientation="horizontal" />
          </div>

          <div className="mb-4 flex items-baseline justify-between mt-0 md:mt-0">
            <h2 className="text-xl font-semibold tracking-tight">Market News</h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              {newTodayCount} new today
            </span>
          </div>

          <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
            {["All", "Kenyan", "International", "Latest", "Oldest"].map((f) => (
              <button
                key={f}
                onClick={() => setActiveUpdateCategory(f)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  activeUpdateCategory === f
                    ? "bg-foreground text-background"
                    : "border border-border bg-card text-muted-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <SocialFeed items={filteredFeedItems} loading={loading} />
          </div>
        </div>

        {/* Right Column - Desktop Only */}
        <div className="hidden md:flex md:flex-col md:col-span-3 space-y-4 sticky top-20 h-[calc(100vh-6rem)] overflow-y-auto pr-1">
          <ExchangeRatesCard
            rates={displayFxRates}
            onOpenCustomize={() => setFxCustomizeOpen(true)}
          />
          <MarketMoversCard stocks={stocks as any} />
        </div>
      </main>

      <FeedItemDetailModal
        item={selectedFeedItem}
        open={!!selectedFeedItem}
        onOpenChange={(open) => {
          if (!open) setSelectedFeedItem(null);
        }}
        interaction={selectedFeedItem ? getPostInteraction(selectedFeedItem.id, selectedFeedItem.likes || 0) : undefined}
        onLikeToggle={toggleLike}
        onAddComment={addComment}
      />

      <CustomizeDialog
        open={watchlistPromptOpen}
        onClose={() => setWatchlistPromptOpen(false)}
        watchlist={watchlist}
        allStocks={stocks}
        allRates={rates}
        allCommodities={commodities}
        allFunds={funds}
        onToggleAsset={toggleAsset}
      />

      <FxCustomizeDialog
        open={fxCustomizeOpen}
        onClose={() => setFxCustomizeOpen(false)}
        allRates={rates}
        selectedRates={selectedFxRates}
        onToggleRate={toggleFxRate}
      />
    </>
  );
};

/* WatchCard moved to src/components/watchlist/WatchCard.tsx (shared with /watchlist page) */

const SectionPanel = ({ title, icon: Icon, link, linkLabel, count, sub, children }: {
  title: string; icon: any; link: string; linkLabel: string; count: number; sub?: string; children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <Badge variant="secondary" className="text-[10px] h-5">{count}</Badge>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </div>
      <Link to={link} className="text-[10px] text-accent hover:underline inline-flex items-center gap-1">{linkLabel} <ArrowRight className="h-3 w-3" /></Link>
    </div>
    {children}
  </div>
);

/* ─── Mobile Fund Card (matches /funds page style) ─── */
const FundCardMobile = ({ fund, isBest }: { fund: FundFromDB; isBest?: boolean }) => (
  <Link
    to={`/compare/${fund.slug}`}
    className="block rounded-xl border border-border bg-card hover:border-accent/30 transition-all active:scale-[0.99] overflow-hidden"
  >
    <div className="flex items-center gap-3 p-3.5">
      <div className="flex-1 min-w-0">
        <span className="font-bold text-foreground text-sm truncate block">{fund.name}</span>
        <p className="text-[11px] text-muted-foreground truncate">{fund.manager}</p>
      </div>
      <div className="text-right shrink-0 space-y-1">
        <div className="flex items-baseline justify-end gap-2">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-10 text-right leading-none">annual</span>
          <span className={`tabular-nums leading-none w-14 text-right text-sm font-extrabold ${isBest ? "text-accent" : "text-foreground"}`}>
            {fund.annual_yield.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-baseline justify-end gap-2">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-10 text-right leading-none">daily</span>
          <span className="text-muted-foreground tabular-nums font-normal leading-none w-14 text-right text-sm">
            {fund.daily_yield.toFixed(4)}%
          </span>
        </div>
      </div>
    </div>
  </Link>
);

export default OverviewPage;
