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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import {
  TrendingUp, TrendingDown, Minus, Bell, BellPlus, Plus,
  Settings2, X, Star, Search, Eye, Check, SlidersHorizontal,
  BarChart3, DollarSign, Gem, LayoutDashboard, Crown,
  Landmark, ArrowRight, Newspaper, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { fetchFunds, fetchLatestNewsPreview, FUND_TYPE_LABELS, type FundFromDB, type FundType, type NewsFromDB } from "@/lib/api";
import CurrencyTicker from "@/components/CurrencyTicker";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import { getNewsImage, handleNewsImageError } from "@/lib/news-images";
import WatchCard from "@/components/watchlist/WatchCard";

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

/* ─── Customize Dialog ─── */
type AssetCategory = "all" | "stock" | "currency" | "commodity" | "fund";

const CATEGORY_TABS: { value: AssetCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "stock", label: "Stocks" },
  { value: "currency", label: "FX Rates" },
  { value: "commodity", label: "Commodities" },
  { value: "fund", label: "Funds" },
];

const CustomizeDialog = ({
  open, onClose, watchlist, allStocks, allRates, allCommodities, allFunds, onToggleAsset,
}: {
  open: boolean; onClose: () => void;
  watchlist: WatchlistItem[];
  allStocks: Stock[]; allRates: ExchangeRate[]; allCommodities: Commodity[]; allFunds: FundFromDB[];
  onToggleAsset: (type: string, id: string, name: string) => void;
}) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AssetCategory>("all");
  const [watchedOnly, setWatchedOnly] = useState(false);

  const isWatched = (type: string, id: string) => watchlist.some(w => w.item_type === type && w.item_id === id);

  const q = search.trim().toLowerCase();
  const matches = (...vals: string[]) => !q || vals.some(v => v.toLowerCase().includes(q));

  const filteredStocks = allStocks
    .filter(s => matches(s.name, s.symbol))
    .filter(s => !watchedOnly || isWatched("stock", s.id));
  const filteredRates = allRates
    .filter(r => matches(r.currency_code, r.currency_name))
    .filter(r => !watchedOnly || isWatched("currency", r.id));
  const filteredCommodities = allCommodities
    .filter(c => matches(c.name, c.symbol))
    .filter(c => !watchedOnly || isWatched("commodity", c.id));
  const filteredFunds = allFunds
    .filter(f => matches(f.name, f.manager))
    .filter(f => !watchedOnly || isWatched("fund", f.id));

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
                <AssetGroup label="Stocks" items={filteredStocks.map(s => ({ id: s.id, name: s.name, sub: s.symbol, watched: isWatched("stock", s.id) }))} onToggle={(id, name) => onToggleAsset("stock", id, name)} />
              )}
              {showRates && (
                <AssetGroup label="FX Rates" items={filteredRates.map(r => ({ id: r.id, name: `${r.currency_code}/KES`, sub: r.currency_name, watched: isWatched("currency", r.id) }))} onToggle={(id, name) => onToggleAsset("currency", id, name)} />
              )}
              {showCommodities && (
                <AssetGroup label="Commodities" items={filteredCommodities.map(c => ({ id: c.id, name: c.name, sub: c.symbol, watched: isWatched("commodity", c.id) }))} onToggle={(id, name) => onToggleAsset("commodity", id, name)} />
              )}
              {showFunds && (
                <AssetGroup label="Funds" items={filteredFunds.map(f => ({ id: f.id, name: f.name, sub: `${f.manager} · ${f.fund_type.replace("_", " ")}`, watched: isWatched("fund", f.id) }))} onToggle={(id, name) => onToggleAsset("fund", id, name)} />
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

const AssetGroup = ({ label, items, onToggle }: { label: string; items: { id: string; name: string; sub: string; watched: boolean }[]; onToggle: (id: string, name: string) => void }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <span className="text-[10px] text-muted-foreground tabular-nums">{items.length}</span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
      {items.map(item => (
        <button key={item.id} onClick={() => onToggle(item.id, item.name)} className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${item.watched ? "bg-accent/10 border border-accent/30" : "bg-card border border-border hover:border-accent/20"}`}>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
          </div>
          {item.watched ? <Check className="h-3.5 w-3.5 text-accent shrink-0" /> : <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        </button>
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
}) => (
  <Link to={linkTo || "#"} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 hover:border-accent/30 transition-colors group">
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
  </Link>
);

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
      className="block rounded-xl border border-border bg-card hover:border-accent/30 transition-all overflow-hidden"
    >
      <div className="flex items-center gap-3 p-3.5">
        <div className="flex-1 min-w-0">
          <span className="font-bold text-foreground text-sm truncate block">{title}</span>
          <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
        </div>
        {sparkData && sparkData.length >= 2 && (
          <div className="shrink-0">
            <Sparkline data={sparkData} width={60} height={24} color="auto" trend={trend} />
          </div>
        )}
        <div className="text-right shrink-0">
          <p className="font-bold text-foreground text-sm tabular-nums">{value}</p>
          {changePct != null ? (
            changePct > 0 ? (
              <span className="inline-flex items-center gap-0.5 text-accent text-[11px] font-semibold tabular-nums">
                <TrendingUp className="h-3 w-3" /> +{changePct.toFixed(2)}%
              </span>
            ) : changePct < 0 ? (
              <span className="inline-flex items-center gap-0.5 text-destructive text-[11px] font-semibold tabular-nums">
                <TrendingDown className="h-3 w-3" /> {changePct.toFixed(2)}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[11px]">
                <Minus className="h-3 w-3" /> 0.00%
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
                      <WatchCard key={f.id} title={f.name} sub={f.manager} value={`${f.annual_yield.toFixed(2)}%`}
                        change={<span className="text-[11px] text-muted-foreground">Daily: {f.daily_yield.toFixed(4)}%</span>}
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
                <WatchCard key={s.id} title={s.symbol} sub={s.name} value={`KES ${s.price.toFixed(2)}`}
                  change={<Change current={s.price} previous={s.previous_price} />}
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
    "Kenya Fund Finder – Compare Stocks, Unit Trusts, FX & Commodities",
    "Kenya's leading platform for comparing CMA-regulated unit trusts, NSE stocks, FX rates, and commodity prices. Daily-updated data, calculators, and alerts.",
    {
      title: "Kenya Fund Finder – Compare Stocks, Unit Trusts, FX & Commodities",
      description: "Kenya's leading platform for comparing CMA-regulated unit trusts, NSE stocks, FX rates, and commodity prices.",
    }
  );
  const navigate = useNavigate();
  const { user } = useAuth();
  const { rates, commodities, stocks, loading: marketLoading } = useMarketData();
  const { alerts } = usePriceAlerts();

  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [news, setNews] = useState<NewsFromDB[]>([]);
  const [rateHistory, setRateHistory] = useState<RateHistory[]>([]);
  const [fundSnapshots, setFundSnapshots] = useState<FundYieldSnapshot[]>([]);
  const [stockHistory, setStockHistory] = useState<StockPriceHistory[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  // Mobile-only top tab: "overview" or "watchlist"
  const [mobileTab, setMobileTab] = useState<"overview" | "watchlist">("overview");
  const [watchlistPromptOpen, setWatchlistPromptOpen] = useState(false);

  const [alertDialog, setAlertDialog] = useState<{
    open: boolean; assetType: "stock" | "currency" | "commodity";
    assetId: string; assetName: string; currentPrice: number; unit?: string;
  }>({ open: false, assetType: "stock", assetId: "", assetName: "", currentPrice: 0 });

  const fetchAllData = useCallback(() => {
    fetchFunds().then(setFunds).catch(() => {}).finally(() => setFundsLoading(false));
    fetchLatestNewsPreview(4).then(n => setNews(n)).catch(() => {});
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
    // Refresh every 5 min — market data realtime already updates live prices
    const interval = window.setInterval(fetchAllData, 5 * 60_000);
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
    if (!user) { setWatchlist([]); setWatchlistLoading(false); return; }
    const { data, error } = await supabase.from("user_watchlist").select("*").eq("user_id", user.id).order("sort_order");
    if (error) { console.error("Failed to fetch watchlist:", error); }
    setWatchlist((data as WatchlistItem[]) || []);
    setWatchlistLoading(false);
  }, [user]);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);



  const toggleAsset = async (type: string, id: string, name: string) => {
    if (!user) { navigate("/auth"); return; }
    const existing = watchlist.find(w => w.item_type === type && w.item_id === id);
    if (existing) {
      setWatchlist(prev => prev.filter(w => w.id !== existing.id));
      const { error } = await supabase.from("user_watchlist").delete().eq("id", existing.id);
      if (error) { toast.error("Failed to update"); fetchWatchlist(); return; }
      toast.success(`Removed ${name}`);
    } else {
      const tempItem: WatchlistItem = { id: crypto.randomUUID(), user_id: user.id, item_type: type, item_id: id, item_name: name, sort_order: 0 };
      setWatchlist(prev => [...prev, tempItem]);
      const { error } = await supabase.from("user_watchlist").insert({ user_id: user.id, item_type: type, item_id: id, item_name: name });
      if (error) { toast.error("Failed to update"); fetchWatchlist(); return; }
      toast.success(`Added ${name}`);
      fetchWatchlist();
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

  const hasWatchlist = watchedStocks.length > 0 || watchedRates.length > 0 || watchedCommoditiesList.length > 0 || watchedFunds.length > 0;

  const loading = marketLoading || fundsLoading || watchlistLoading;

  // Best performers
  const bestStock = useMemo(() => stocks.length ? [...stocks].sort((a, b) => b.day_change_percent - a.day_change_percent)[0] : null, [stocks]);
  const topGainers = useMemo(
    () => [...stocks].filter(s => s.day_change_percent > 0).sort((a, b) => b.day_change_percent - a.day_change_percent).slice(0, 5),
    [stocks]
  );
  const topLosers = useMemo(
    () => [...stocks].filter(s => s.day_change_percent < 0).sort((a, b) => a.day_change_percent - b.day_change_percent).slice(0, 5),
    [stocks]
  );
  const bestMM = useMemo(() => {
    const mm = funds.filter(f => f.fund_type === "money_market");
    return mm.length ? [...mm].sort((a, b) => b.annual_yield - a.annual_yield)[0] : null;
  }, [funds]);
  const moneyMarketFunds = useMemo(
    () => funds.filter(f => f.fund_type === "money_market").sort((a, b) => b.annual_yield - a.annual_yield).slice(0, 5),
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
    () => [...rates].sort((a, b) => Number(b.rate) - Number(a.rate)).slice(0, 5),
    [rates]
  );
  const topCommodities = useMemo(() => commodities.slice(0, 5), [commodities]);

  const mmFunds = useMemo(() => funds.filter(f => f.fund_type === "money_market"), [funds]);
  const fiFunds = useMemo(() => funds.filter(f => f.fund_type === "fixed_income"), [funds]);
  const bestMMYield = useMemo(() => mmFunds.length ? Math.max(...mmFunds.map(f => f.annual_yield)) : 0, [mmFunds]);

  const getHistory = (code: string) => rateHistory.filter(h => h.currency_code === code).slice(-30);
  const getFundHistory = (fundId: string) => fundSnapshots.filter(s => s.fund_id === fundId).slice(-30).map(s => ({ snapshot_date: s.snapshot_date, rate: s.annual_yield }));
  const getStockHistory = (stockId: string) => stockHistory.filter(h => h.stock_id === stockId).slice(-30).map(h => ({ snapshot_date: h.snapshot_date, rate: h.price }));
  const getStockSparkData = (stockId: string) => stockHistory.filter(h => h.stock_id === stockId).slice(-30).map(h => h.price);

  const displayName = profileName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-6 min-h-[80vh] space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        {/* Mobile-only extra placeholders to reserve scroll height (prevents CLS on phones) */}
        <div className="md:hidden space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="hidden md:block">
      <CurrencyTicker />
    </div>
    <div className="px-4 md:px-6 py-6 max-w-[1600px]">
    <div className="space-y-5">
      {/* Header */}
      <div>
        {/* Mobile header */}
        <div className="md:hidden rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-foreground truncate">
                {user ? `${greeting} ${displayName}` : "Market overview"}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {user ? "Your personalized market overview" : "Best performers across Kenyan markets"}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2">
                <SectionLiveStatus section="overview" hideLive />
              </p>
            </div>
            <SectionLiveStatus section="overview" hideDate />
          </div>
          <div className="mt-4">
            {user ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs h-9 gap-1.5 flex-1 rounded-full" onClick={() => setCustomizeOpen(true)}>
                  <Settings2 className="h-3.5 w-3.5" /> Customize
                </Button>
                <Button asChild variant="outline" size="sm" className="text-xs h-9 gap-1.5 rounded-full px-4">
                  <Link to="/alerts"><Bell className="h-3.5 w-3.5" />{alerts.length}</Link>
                </Button>
              </div>
            ) : (
              <Button size="sm" className="text-xs h-9 gap-1.5 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate("/auth")}>
                <Settings2 className="h-3.5 w-3.5" /> Sign in to customize
              </Button>
            )}
          </div>
        </div>

        {/* Mobile-only top tabs: Overview / Watchlist */}
        <div className="md:hidden mt-3 grid grid-cols-2 gap-1 p-1 rounded-full border border-border bg-card">
          <button
            type="button"
            onClick={() => setMobileTab("overview")}
            className={`inline-flex items-center justify-center gap-1.5 h-9 rounded-full text-xs font-semibold transition-colors ${
              mobileTab === "overview"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
            aria-pressed={mobileTab === "overview"}
          >
            <LayoutDashboard className="h-3.5 w-3.5" /> Overview
          </button>
          <button
            type="button"
            onClick={() => {
              if (!user) { setWatchlistPromptOpen(true); return; }
              setMobileTab("watchlist");
            }}
            className={`inline-flex items-center justify-center gap-1.5 h-9 rounded-full text-xs font-semibold transition-colors ${
              mobileTab === "watchlist"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
            aria-pressed={mobileTab === "watchlist"}
          >
            <Star className={`h-3.5 w-3.5 ${mobileTab === "watchlist" ? "fill-current" : ""}`} /> Watchlist
            {user && watchlist.length > 0 && (
              <span className={`tabular-nums text-[10px] rounded-full px-1.5 ${
                mobileTab === "watchlist" ? "bg-primary-foreground/20" : "bg-muted text-foreground"
              }`}>
                {watchlist.length}
              </span>
            )}
          </button>
        </div>
        <div className="hidden md:flex flex-row items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">{user ? `${greeting}, ${displayName}` : "Market Overview"}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {user ? "Your personalized market overview" : "Best performers across Kenyan markets"}
            </p>
            {/* Desktop tabs: under greeting + subtitle */}
            <div className="mt-3 inline-grid grid-cols-2 gap-1 p-1 rounded-full border border-border bg-card">
              <button
                type="button"
                onClick={() => setMobileTab("overview")}
                className={`inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-full text-xs font-semibold transition-colors ${
                  mobileTab === "overview"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={mobileTab === "overview"}
              >
                <LayoutDashboard className="h-3.5 w-3.5" /> Overview
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!user) { setWatchlistPromptOpen(true); return; }
                  setMobileTab("watchlist");
                }}
                className={`inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-full text-xs font-semibold transition-colors ${
                  mobileTab === "watchlist"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={mobileTab === "watchlist"}
              >
                <Star className={`h-3.5 w-3.5 ${mobileTab === "watchlist" ? "fill-current" : ""}`} /> Watchlist
                {user && watchlist.length > 0 && (
                  <span className={`tabular-nums text-[10px] rounded-full px-1.5 ${
                    mobileTab === "watchlist" ? "bg-primary-foreground/20" : "bg-muted text-foreground"
                  }`}>
                    {watchlist.length}
                  </span>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {user && (
              <>
                <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5" onClick={() => setCustomizeOpen(true)}>
                  <Settings2 className="h-3.5 w-3.5" /> Customize
                </Button>
                <Button asChild variant="outline" size="sm" className="text-xs h-8 gap-1.5">
                  <Link to="/alerts"><Bell className="h-3.5 w-3.5" />{alerts.length}</Link>
                </Button>
              </>
            )}
            {!user && (
              <Button size="sm" className="text-xs h-8 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate("/auth")}>
                <Settings2 className="h-3.5 w-3.5" /> Sign in to customize
              </Button>
            )}
            <SectionLiveStatus section="overview" />
          </div>
        </div>
      </div>

      {/* ─── Watched Individual Assets ───
          Shown only when the "Watchlist" tab is active (mobile + desktop). */}
      {user && hasWatchlist && mobileTab === "watchlist" && (
        <div className="block">
          <WatchlistGroupedSection
            watchedFunds={watchedFunds}
            watchedStocks={watchedStocks}
            watchedRates={watchedRates}
            watchedCommoditiesList={watchedCommoditiesList}
            getFundHistory={getFundHistory}
            getStockHistory={getStockHistory}
            getStockSparkData={getStockSparkData}
            getHistory={getHistory}
            openAlert={openAlert}
            toggleAsset={toggleAsset}
          />
        </div>
      )}

      {/* Empty state on Watchlist tab when nothing tracked (mobile + desktop) */}
      {user && !hasWatchlist && mobileTab === "watchlist" && (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 md:p-12 text-center">
          <Star className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-1">Your watchlist is empty</h3>
          <p className="text-xs md:text-sm text-muted-foreground mb-4">
            Use Customize to start tracking stocks, funds, currencies, and commodities.
          </p>
          <Button size="sm" className="rounded-full gap-1.5" onClick={() => setCustomizeOpen(true)}>
            <Settings2 className="h-3.5 w-3.5" /> Customize Watchlist
          </Button>
        </div>
      )}

      {/* ─── Overview content (Highlights, news, disclaimer) ───
          Hidden when "Watchlist" tab is active (mobile + desktop). */}
      <div className={user && mobileTab === "watchlist" ? "hidden" : "contents"}>

      {/* ─── Market Highlights (always shown) ─── */}
      <div className="md:pt-3">


        {/* Desktop: horizontally scrollable row of fixed-width columns */}
        <div className="hidden md:block -mx-4 md:-mx-6">
          <div className="overflow-x-auto overscroll-x-contain px-4 md:px-6 pb-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="flex gap-4 min-w-max">
              {/* Top Gainers */}
              <div className="w-[300px] shrink-0">
                <HighlightColumn icon={TrendingUp} label="Stocks · Top Gainers" link="/stocks">
                  {topGainers.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">No data available</p>
                  )}
                  {topGainers.map((s) => (
                    <HighlightListCard
                      key={`hl-gainer-${s.id}`}
                      title={s.symbol}
                      sub={s.name}
                      value={`KES ${s.price.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      changePct={s.day_change_percent}
                      sparkData={getStockSparkData(s.id)}
                      trend={trendOf(s.price, s.previous_price)}
                      linkTo={`/stocks/${s.symbol}`}
                    />
                  ))}
                </HighlightColumn>
              </div>

              {/* Top Losers */}
              <div className="w-[300px] shrink-0">
                <HighlightColumn icon={TrendingDown} label="Stocks · Top Losers" link="/stocks">
                  {topLosers.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">No data available</p>
                  )}
                  {topLosers.map((s) => (
                    <HighlightListCard
                      key={`hl-loser-${s.id}`}
                      title={s.symbol}
                      sub={s.name}
                      value={`KES ${s.price.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      changePct={s.day_change_percent}
                      sparkData={getStockSparkData(s.id)}
                      trend={trendOf(s.price, s.previous_price)}
                      linkTo={`/stocks/${s.symbol}`}
                    />
                  ))}
                </HighlightColumn>
              </div>

              {/* Money Markets */}
              <div className="w-[320px] shrink-0">
                <HighlightColumn icon={BarChart3} label="Money Markets" link="/funds">
                  {moneyMarketFunds.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">No data available</p>
                  )}
                  {moneyMarketFunds.map((f) => {
                    const snaps = fundSnapshots.filter((s) => s.fund_id === f.id);
                    const sparkData = snaps.slice(-30).map((s) => s.annual_yield);
                    const prev = snaps.length > 0 ? snaps[snaps.length - 1].annual_yield : null;
                    const diff = prev != null ? f.annual_yield - prev : null;
                    const trend: "up" | "down" | "flat" | undefined =
                      diff == null ? undefined : diff > 0 ? "up" : diff < 0 ? "down" : "flat";
                    return (
                      <HighlightListCard
                        key={`hl-mm-${f.id}`}
                        title={f.name}
                        sub={f.manager}
                        value={`${f.annual_yield.toFixed(2)}%`}
                        changePct={diff}
                        sparkData={sparkData}
                        trend={trend}
                        linkTo={`/compare/${f.slug}`}
                      />
                    );
                  })}
                </HighlightColumn>
              </div>

              {/* FX Rates */}
              <div className="w-[300px] shrink-0">
                <HighlightColumn icon={DollarSign} label="FX Rates" link="/rates">
                  {topFXRates.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">No data available</p>
                  )}
                  {topFXRates.map((r) => {
                    const sparkSeries = getHistory(r.currency_code).map((h) => h.rate);
                    const prev = r.previous_rate != null ? Number(r.previous_rate) : null;
                    const diff = prev != null && prev !== 0 ? ((Number(r.rate) - prev) / prev) * 100 : null;
                    return (
                      <HighlightListCard
                        key={`hl-fx-${r.id}`}
                        title={`${r.currency_code}/KES`}
                        sub={r.currency_name}
                        value={`KES ${Number(r.rate).toFixed(2)}`}
                        changePct={diff}
                        sparkData={sparkSeries}
                        trend={trendOf(Number(r.rate), prev)}
                        linkTo="/rates"
                      />
                    );
                  })}
                </HighlightColumn>
              </div>

              {/* Commodities */}
              <div className="w-[300px] shrink-0">
                <HighlightColumn icon={Gem} label="Commodities" link="/commodities">
                  {topCommodities.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">No data available</p>
                  )}
                  {topCommodities.map((c) => {
                    const prev = c.previous_price != null ? Number(c.previous_price) : null;
                    const diff = prev != null && prev !== 0 ? ((Number(c.price) - prev) / prev) * 100 : null;
                    return (
                      <HighlightListCard
                        key={`hl-cmd-${c.id}`}
                        title={c.name}
                        sub={`${c.symbol} · ${c.unit}`}
                        value={`${Number(c.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        changePct={diff}
                        trend={trendOf(Number(c.price), prev)}
                        linkTo="/commodities"
                      />
                    );
                  })}
                </HighlightColumn>
              </div>
            </div>
          </div>
        </div>



        {/* Mobile: grouped single-column cards by category */}
        <div className="flex flex-col gap-2 md:hidden">
          {topGainers.length > 0 && (
            <>
              <MobileGroupHeading icon={TrendingUp} label="Top Gainers" tone="success" />
              {topGainers.map(s => (
                <MobileStockHighlightCard
                  key={`g-${s.id}`}
                  symbol={s.symbol}
                  name={s.name}
                  price={s.price}
                  dayChange={s.day_change}
                  dayChangePct={s.day_change_percent}
                  sparkData={getStockSparkData(s.id)}
                  linkTo={`/stocks/${s.symbol}`}
                />
              ))}
            </>
          )}
          {topLosers.length > 0 && (
            <>
              <MobileGroupHeading icon={TrendingDown} label="Top Losers" tone="destructive" />
              {topLosers.map(s => (
                <MobileStockHighlightCard
                  key={`l-${s.id}`}
                  symbol={s.symbol}
                  name={s.name}
                  price={s.price}
                  dayChange={s.day_change}
                  dayChangePct={s.day_change_percent}
                  sparkData={getStockSparkData(s.id)}
                  linkTo={`/stocks/${s.symbol}`}
                />
              ))}
            </>
          )}
          {moneyMarketFunds.length > 0 && (
            <>
              <MobileGroupHeading icon={BarChart3} label="Money Market" tone="primary" />
              {moneyMarketFunds.map(f => {
                const snaps = fundSnapshots.filter(s => s.fund_id === f.id);
                const prev = snaps.length > 0 ? snaps[snaps.length - 1].annual_yield : undefined;
                return (
                  <MobileFundHighlightCard
                    key={`mm-${f.id}`}
                    name={f.name}
                    annualYield={f.annual_yield}
                    dailyYield={f.daily_yield}
                    prevAnnualYield={prev}
                    linkTo={`/compare/${f.slug}`}
                  />
                );
              })}
            </>
          )}
          {bestFI && (() => {
            const snaps = fundSnapshots.filter(s => s.fund_id === bestFI.id);
            const prev = snaps.length > 0 ? snaps[snaps.length - 1].annual_yield : undefined;
            return (
              <>
                <MobileGroupHeading icon={Landmark} label="Fixed Income" tone="muted" />
                <MobileFundHighlightCard
                  name={bestFI.name}
                  annualYield={bestFI.annual_yield}
                  dailyYield={bestFI.daily_yield}
                  prevAnnualYield={prev}
                  linkTo={`/compare/${bestFI.slug}`}
                />
              </>
            );
          })()}
          {bestFXRate && (
            <>
              <MobileGroupHeading icon={DollarSign} label="FX Rate" tone="accent" />
              <HighlightCard icon={DollarSign} name={`${bestFXRate.currency_code}/KES`} value={`KES ${Number(bestFXRate.rate).toFixed(2)}`} change={<Change current={Number(bestFXRate.rate)} previous={bestFXRate.previous_rate != null ? Number(bestFXRate.previous_rate) : null} />} linkTo="/rates" color="bg-accent/10" />
            </>
          )}
          {(goldCommodity || silverCommodity) && (
            <>
              <MobileGroupHeading icon={Gem} label="Commodities" tone="muted" />
              {goldCommodity && (
                <HighlightCard icon={Gem} name={goldCommodity.name} value={`${Number(goldCommodity.price).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${goldCommodity.unit}`} change={<Change current={Number(goldCommodity.price)} previous={goldCommodity.previous_price != null ? Number(goldCommodity.previous_price) : null} />} linkTo="/commodities" color="bg-[hsl(45,80%,50%)]/10" />
              )}
              {silverCommodity && (
                <HighlightCard icon={Gem} name={silverCommodity.name} value={`${Number(silverCommodity.price).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${silverCommodity.unit}`} change={<Change current={Number(silverCommodity.price)} previous={silverCommodity.previous_price != null ? Number(silverCommodity.previous_price) : null} />} linkTo="/commodities" color="bg-muted" />
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Watched Individual Assets (for non-signed-in, keep original position) ─── */}
      {!user && hasWatchlist && (
        <WatchlistGroupedSection
          watchedFunds={watchedFunds}
          watchedStocks={watchedStocks}
          watchedRates={watchedRates}
          watchedCommoditiesList={watchedCommoditiesList}
          getFundHistory={getFundHistory}
          getStockHistory={getStockHistory}
          getStockSparkData={getStockSparkData}
          getHistory={getHistory}
          openAlert={openAlert}
          toggleAsset={toggleAsset}
        />
      )}

      {/* ─── Latest News ─── */}
      {news.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-accent/10">
                <Newspaper className="h-3.5 w-3.5 text-accent" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Latest News</h2>
            </div>
            <Link to="/news" className="text-[10px] text-accent hover:underline inline-flex items-center gap-1">All news <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {/* Mobile: edge-to-edge stacked rows matching /news page UI */}
          <div className="sm:hidden -mx-4 border-y border-border">
            {news.map((article, idx) => (
              <Link
                key={article.id}
                to={`/news/${article.id}`}
                className="group block px-4 py-3.5 active:bg-muted/30 transition-colors"
              >
                {idx > 0 && (
                  <div className="h-px bg-foreground/30 -mx-4 mb-3.5" role="separator" />
                )}
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-accent truncate">
                        {article.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5 shrink-0">
                        <Clock className="h-2.5 w-2.5" />
                        {article.read_time}
                      </span>
                    </div>
                    <h3 className="font-heading font-bold text-[17px] leading-snug line-clamp-3 group-hover:text-accent transition-colors mb-2">
                      {decodeHtmlEntities(article.title)}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full border border-border bg-muted/50 grid place-items-center text-[9px] font-bold text-muted-foreground uppercase shrink-0">
                        {(article.source || "N").slice(0, 2)}
                      </div>
                      <span className="text-[11px] font-medium text-foreground truncate">
                        {article.source || "News"}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        · {new Date(article.date_published).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <div className="h-[100px] w-[100px] rounded-lg overflow-hidden bg-muted shrink-0">
                    <img
                      src={getNewsImage(article.image_url, article.category, article.id)}
                      alt={article.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => handleNewsImageError(e, article.category, article.id)}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop / tablet: existing card grid */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {news.map((article) => (
              <Link key={article.id} to={`/news/${article.id}`} className="block group">
                <article className="rounded-xl border border-border bg-card hover:border-accent/20 hover:shadow-sm transition-all h-full flex flex-col overflow-hidden">
                  <div className="w-full h-28 overflow-hidden bg-muted shrink-0">
                    <img
                      src={getNewsImage(article.image_url, article.category, article.id)}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => handleNewsImageError(e, article.category, article.id)}
                    />
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">{article.category}</span>
                      <span className="text-[11px] text-muted-foreground ml-auto flex items-center gap-0.5 shrink-0">
                        <Clock className="h-2.5 w-2.5" />
                        {article.read_time}
                      </span>
                    </div>
                    <h3 className="font-semibold leading-snug line-clamp-2 mb-1 group-hover:text-accent transition-colors text-base">{decodeHtmlEntities(article.title)}</h3>
                    <p className="text-muted-foreground line-clamp-2 leading-relaxed flex-1 text-sm">{decodeHtmlEntities(article.summary)}</p>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/30">
                      <p className="text-[11px] text-muted-foreground truncate">
                        {article.source && `${article.source} · `}
                        {new Date(article.date_published).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                      </p>
                      <span className="text-[11px] text-accent font-medium group-hover:underline shrink-0">Read →</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-lg bg-muted/40 border border-border/50 p-3">
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Market data is indicative and may be delayed. {user ? "Click the bell icon to set price alerts on any asset." : "Sign in to set price alerts and customize your dashboard."}
        </p>
      </div>

      </div>{/* end of mobile-tab "overview" content wrapper */}

      {/* Dialogs */}
      <QuickAlertDialog open={alertDialog.open} onClose={() => setAlertDialog(prev => ({ ...prev, open: false }))} assetType={alertDialog.assetType} assetId={alertDialog.assetId} assetName={alertDialog.assetName} currentPrice={alertDialog.currentPrice} unit={alertDialog.unit} />
      <CustomizeDialog open={customizeOpen} onClose={() => setCustomizeOpen(false)} watchlist={watchlist} allStocks={stocks} allRates={rates} allCommodities={commodities} allFunds={funds} onToggleAsset={toggleAsset} />

      {/* Watchlist benefits prompt for unauthenticated users */}
      <Dialog open={watchlistPromptOpen} onOpenChange={setWatchlistPromptOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/60">
          {/* Hero band */}
          <div className="relative bg-gradient-to-br from-accent/15 via-accent/5 to-transparent px-6 pt-7 pb-5 text-center">
            <div className="absolute inset-x-0 -top-16 h-32 bg-accent/20 blur-3xl opacity-60 pointer-events-none" />
            <div className="relative mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-lg shadow-accent/30 ring-4 ring-accent/10">
              <Star className="h-7 w-7 fill-current" />
            </div>
            <DialogHeader className="space-y-1.5">
              <DialogTitle className="text-center text-xl font-bold tracking-tight">
                Build your personal watchlist
              </DialogTitle>
              <p className="text-center text-sm text-muted-foreground">
                Free forever. Takes 30 seconds to set up.
              </p>
            </DialogHeader>
          </div>

          {/* Benefits */}
          <div className="px-6 pb-5 space-y-3">
            {[
              { icon: Star, title: "Track favorites", desc: "Stocks, FX, commodities & unit trusts in one view." },
              { icon: Bell, title: "Price alerts", desc: "Get notified the moment assets hit your targets." },
              { icon: LayoutDashboard, title: "Personalized overview", desc: "Your picks, front and center on every visit." },
              { icon: Check, title: "Sync across devices", desc: "Access your watchlist anywhere, anytime." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/40 px-3 py-2.5 transition-colors hover:bg-card hover:border-border">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="px-6 pb-6 pt-1 space-y-2">
            <Button
              className="w-full h-11 bg-accent text-accent-foreground hover:bg-accent/90 rounded-full font-semibold shadow-md shadow-accent/20"
              onClick={() => { setWatchlistPromptOpen(false); navigate("/auth"); }}
            >
              <span className="inline-flex items-center justify-center"><TrendingUp className="mr-2 h-4 w-4" /> Sign Up Free</span>
            </Button>
            <button
              type="button"
              onClick={() => setWatchlistPromptOpen(false)}
              className="w-full text-xs text-muted-foreground hover:text-foreground py-1.5 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </div>
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
