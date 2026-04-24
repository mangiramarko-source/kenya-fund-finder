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
  TrendingUp, TrendingDown, Minus, Bell, BellPlus, Plus,
  Settings2, X, Star, Search, Eye, Check,
  BarChart3, DollarSign, Gem, LayoutDashboard, Crown,
  Landmark, ArrowRight, Newspaper, Clock,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { fetchFunds, fetchPublishedNews, type FundFromDB, type NewsFromDB } from "@/lib/api";
import CurrencyTicker from "@/components/CurrencyTicker";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import { getNewsImage, handleNewsImageError } from "@/lib/news-images";

/* ─── Types ─── */
interface WatchlistItem { id: string; user_id: string; item_type: string; item_id: string; item_name: string; sort_order: number; }
interface FundYieldSnapshot { snapshot_date: string; annual_yield: number; fund_id: string; }
interface RateHistory { snapshot_date: string; rate: number; currency_code: string; }
interface StockPriceHistory { snapshot_date: string; price: number; stock_id: string; }

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
const CustomizeDialog = ({
  open, onClose, watchlist, allStocks, allRates, allCommodities, allFunds, onToggleSection, onToggleAsset,
}: {
  open: boolean; onClose: () => void;
  watchlist: WatchlistItem[];
  allStocks: Stock[]; allRates: ExchangeRate[]; allCommodities: Commodity[]; allFunds: FundFromDB[];
  onToggleSection: (sectionId: string, label: string) => void;
  onToggleAsset: (type: string, id: string, name: string) => void;
}) => {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"sections" | "assets">("sections");

  const isWatched = (type: string, id: string) => watchlist.some(w => w.item_type === type && w.item_id === id);

  const filteredStocks = allStocks.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.symbol.toLowerCase().includes(search.toLowerCase()));
  const filteredRates = allRates.filter(r => !search || r.currency_code.toLowerCase().includes(search.toLowerCase()) || r.currency_name.toLowerCase().includes(search.toLowerCase()));
  const filteredCommodities = allCommodities.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.symbol.toLowerCase().includes(search.toLowerCase()));
  const filteredFunds = allFunds.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Customize Your Overview</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-3">
          <button onClick={() => setTab("sections")} className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${tab === "sections" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>Sections</button>
          <button onClick={() => setTab("assets")} className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${tab === "assets" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>Specific Assets</button>
        </div>

        {tab === "sections" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">Choose which market sections appear on your overview.</p>
            {SECTIONS.map(s => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground">{s.description}</p>
                  </div>
                </div>
                <Switch checked={isWatched("section", s.id)} onCheckedChange={() => onToggleSection(s.id, s.label)} />
              </div>
            ))}
          </div>
        )}

        {tab === "assets" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search stocks, currencies, commodities, funds…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-[16px] md:text-xs" />
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {filteredStocks.length > 0 && (
                <AssetGroup label="Stocks" items={filteredStocks.map(s => ({ id: s.id, name: s.name, sub: s.symbol, watched: isWatched("stock", s.id) }))} onToggle={(id, name) => onToggleAsset("stock", id, name)} />
              )}
              {filteredRates.length > 0 && (
                <AssetGroup label="FX Rates" items={filteredRates.map(r => ({ id: r.id, name: `${r.currency_code}/KES`, sub: r.currency_name, watched: isWatched("currency", r.id) }))} onToggle={(id, name) => onToggleAsset("currency", id, name)} />
              )}
              {filteredCommodities.length > 0 && (
                <AssetGroup label="Commodities" items={filteredCommodities.map(c => ({ id: c.id, name: c.name, sub: c.symbol, watched: isWatched("commodity", c.id) }))} onToggle={(id, name) => onToggleAsset("commodity", id, name)} />
              )}
              {filteredFunds.length > 0 && (
                <AssetGroup label="Funds" items={filteredFunds.map(f => ({ id: f.id, name: f.name, sub: `${f.manager} · ${f.fund_type.replace("_", " ")}`, watched: isWatched("fund", f.id) }))} onToggle={(id, name) => onToggleAsset("fund", id, name)} />
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const AssetGroup = ({ label, items, onToggle }: { label: string; items: { id: string; name: string; sub: string; watched: boolean }[]; onToggle: (id: string, name: string) => void }) => (
  <div>
    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
    <div className="space-y-1">
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
 */
const MiniChart = ({ data, color = "hsl(var(--accent))", trend }: { data: { snapshot_date: string; rate: number }[]; color?: string; trend?: "up" | "down" | "flat" }) => {
  if (data.length < 2) return null;
  const autoTrend: "up" | "down" | "flat" =
    trend ?? (data[data.length - 1].rate > data[0].rate ? "up" : data[data.length - 1].rate < data[0].rate ? "down" : "flat");
  const resolvedColor =
    color === "auto"
      ? autoTrend === "down"
        ? "hsl(var(--destructive))"
        : autoTrend === "flat"
          ? "hsl(var(--muted-foreground))"
          : "hsl(var(--accent))"
      : color;
  const gradId = `mc-${resolvedColor.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <ResponsiveContainer width="100%" height={60}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={resolvedColor} stopOpacity={0.25} />
            <stop offset="95%" stopColor={resolvedColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="snapshot_date" hide />
        <YAxis domain={["auto", "auto"]} hide />
        <Area type="monotone" dataKey="rate" stroke={resolvedColor} strokeWidth={1.5} fill={`url(#${gradId})`} />
      </AreaChart>
    </ResponsiveContainer>
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

  const [alertDialog, setAlertDialog] = useState<{
    open: boolean; assetType: "stock" | "currency" | "commodity";
    assetId: string; assetName: string; currentPrice: number; unit?: string;
  }>({ open: false, assetType: "stock", assetId: "", assetName: "", currentPrice: 0 });

  const fetchAllData = useCallback(() => {
    fetchFunds().then(setFunds).catch(() => {}).finally(() => setFundsLoading(false));
    fetchPublishedNews().then(n => setNews(n.slice(0, 4))).catch(() => {});
    supabase.from("exchange_rate_history_public" as any)
      .select("snapshot_date, rate, currency_code")
      .order("snapshot_date", { ascending: true }).limit(500)
      .then(({ data }) => setRateHistory(((data as any) || []).map((h: any) => ({ ...h, rate: Number(h.rate) }))));
    supabase.from("fund_yield_snapshots")
      .select("snapshot_date, annual_yield, fund_id")
      .order("snapshot_date", { ascending: true }).limit(500)
      .then(({ data }) => setFundSnapshots(((data as any) || []).map((s: any) => ({ ...s, annual_yield: Number(s.annual_yield) }))));
    supabase.from("stock_price_history" as any)
      .select("snapshot_date, price, stock_id")
      .order("snapshot_date", { ascending: true }).limit(1000)
      .then(({ data }) => setStockHistory(((data as any) || []).map((h: any) => ({ ...h, price: Number(h.price) }))));
  }, []);

  useEffect(() => {
    fetchAllData();
    const interval = window.setInterval(fetchAllData, 60_000);
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

  const toggleSection = async (sectionId: string, label: string) => {
    if (!user) { navigate("/auth"); return; }
    const existing = watchlist.find(w => w.item_type === "section" && w.item_id === sectionId);
    if (existing) {
      // Optimistic remove
      setWatchlist(prev => prev.filter(w => w.id !== existing.id));
      const { error } = await supabase.from("user_watchlist").delete().eq("id", existing.id);
      if (error) { toast.error("Failed to update"); fetchWatchlist(); return; }
      toast.success(`Removed ${label}`);
    } else {
      // Optimistic add
      const tempItem: WatchlistItem = { id: crypto.randomUUID(), user_id: user.id, item_type: "section", item_id: sectionId, item_name: label, sort_order: 0 };
      setWatchlist(prev => [...prev, tempItem]);
      const { error } = await supabase.from("user_watchlist").insert({ user_id: user.id, item_type: "section", item_id: sectionId, item_name: label });
      if (error) { toast.error("Failed to update"); fetchWatchlist(); return; }
      toast.success(`Added ${label}`);
      fetchWatchlist(); // sync real ID
    }
  };

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
  const enabledSections = useMemo(() => watchlist.filter(w => w.item_type === "section").map(w => w.item_id), [watchlist]);
  const watchedStockIds = useMemo(() => watchlist.filter(w => w.item_type === "stock").map(w => w.item_id), [watchlist]);
  const watchedCurrencyIds = useMemo(() => watchlist.filter(w => w.item_type === "currency").map(w => w.item_id), [watchlist]);
  const watchedCommodityIds = useMemo(() => watchlist.filter(w => w.item_type === "commodity").map(w => w.item_id), [watchlist]);
  const watchedFundIds = useMemo(() => watchlist.filter(w => w.item_type === "fund").map(w => w.item_id), [watchlist]);

  const watchedStocks = useMemo(() => stocks.filter(s => watchedStockIds.includes(s.id)), [stocks, watchedStockIds]);
  const watchedRates = useMemo(() => rates.filter(r => watchedCurrencyIds.includes(r.id)), [rates, watchedCurrencyIds]);
  const watchedCommoditiesList = useMemo(() => commodities.filter(c => watchedCommodityIds.includes(c.id)), [commodities, watchedCommodityIds]);
  const watchedFunds = useMemo(() => funds.filter(f => watchedFundIds.includes(f.id)), [funds, watchedFundIds]);

  const hasWatchlist = watchedStocks.length > 0 || watchedRates.length > 0 || watchedCommoditiesList.length > 0 || watchedFunds.length > 0;
  const hasSections = enabledSections.length > 0;

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

        {/* Desktop header */}
        <div className="hidden md:flex flex-row items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{user ? `${greeting}, ${displayName}` : "Market Overview"}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {user ? "Your personalized market overview" : "Best performers across Kenyan markets"}
            </p>
          </div>
          <div className="flex items-center gap-2">
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

      {/* ─── Watched Individual Assets (for signed-in users, shown first) ─── */}
      {user && hasWatchlist && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Star className="h-4 w-4 text-warning" /> Your Watchlist</h2>
            <span className="text-[10px] text-muted-foreground">{watchedStocks.length + watchedRates.length + watchedCommoditiesList.length + watchedFunds.length} items</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
            {watchedCommoditiesList.map(c => (
              <WatchCard key={c.id} title={c.name} sub={c.symbol} value={`${Number(c.price).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${c.unit}`}
                change={<Change current={Number(c.price)} previous={c.previous_price != null ? Number(c.previous_price) : null} />}
                trend={trendOf(Number(c.price), c.previous_price != null ? Number(c.previous_price) : null)}
                linkTo="/commodities"
                onAlert={() => openAlert("commodity", c.id, c.name, Number(c.price), c.unit)}
                onRemove={() => toggleAsset("commodity", c.id, c.name)} />
            ))}
            {watchedFunds.map(f => {
              const fHistory = getFundHistory(f.id);
              const fundTypeLabel = f.fund_type === "money_market" ? "Money Market" : f.fund_type === "fixed_income" ? "Fixed Income" : f.fund_type === "balanced" ? "Balanced" : f.fund_type === "equity" ? "Equity" : f.fund_type === "bond" ? "Bond" : f.fund_type;
              const fundTrend: "up" | "down" | "flat" | undefined = fHistory.length >= 2
                ? (fHistory[fHistory.length - 1].rate > fHistory[0].rate ? "up" : fHistory[fHistory.length - 1].rate < fHistory[0].rate ? "down" : "flat")
                : undefined;
              return (
                <WatchCard key={f.id} title={f.name} sub={fundTypeLabel} value={`${f.annual_yield.toFixed(2)}%`}
                  change={<span className="text-[11px] text-muted-foreground">Daily: {f.daily_yield.toFixed(4)}%</span>}
                  chart={fHistory.length > 2 ? <MiniChart data={fHistory} color="hsl(var(--primary))" /> : undefined}
                  sparkData={fHistory.length > 2 ? fHistory.map(h => h.rate) : undefined}
                  trend={fundTrend}
                   linkTo={`/compare/${f.slug}`}
                  onRemove={() => toggleAsset("fund", f.id, f.name)} />
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Market Highlights (always shown) ─── */}
      <div>

        {/* Desktop: horizontally scrollable row of fixed-width columns */}
        <div className="hidden md:block -mx-4 md:-mx-6">
          <div className="overflow-x-auto px-4 md:px-6 pb-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
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
                <HighlightColumn icon={TrendingDown} label="Top Losers" link="/stocks">
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
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Star className="h-4 w-4 text-warning" /> Your Watchlist</h2>
            <span className="text-[10px] text-muted-foreground">{watchedStocks.length + watchedRates.length + watchedCommoditiesList.length + watchedFunds.length} items</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
            {watchedCommoditiesList.map(c => (
              <WatchCard key={c.id} title={c.name} sub={c.symbol} value={`${Number(c.price).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${c.unit}`}
                change={<Change current={Number(c.price)} previous={c.previous_price != null ? Number(c.previous_price) : null} />}
                trend={trendOf(Number(c.price), c.previous_price != null ? Number(c.previous_price) : null)}
                linkTo="/commodities"
                onAlert={() => openAlert("commodity", c.id, c.name, Number(c.price), c.unit)}
                onRemove={() => toggleAsset("commodity", c.id, c.name)} />
            ))}
            {watchedFunds.map(f => {
              const fHistory = getFundHistory(f.id);
              const fundTypeLabel = f.fund_type === "money_market" ? "Money Market" : f.fund_type === "fixed_income" ? "Fixed Income" : f.fund_type === "balanced" ? "Balanced" : f.fund_type === "equity" ? "Equity" : f.fund_type === "bond" ? "Bond" : f.fund_type;
              const fundTrend: "up" | "down" | "flat" | undefined = fHistory.length >= 2
                ? (fHistory[fHistory.length - 1].rate > fHistory[0].rate ? "up" : fHistory[fHistory.length - 1].rate < fHistory[0].rate ? "down" : "flat")
                : undefined;
              return (
                <WatchCard key={f.id} title={f.name} sub={fundTypeLabel} value={`${f.annual_yield.toFixed(2)}%`}
                  change={<span className="text-[11px] text-muted-foreground">Daily: {f.daily_yield.toFixed(4)}%</span>}
                  chart={fHistory.length > 2 ? <MiniChart data={fHistory} color="hsl(var(--primary))" /> : undefined}
                  sparkData={fHistory.length > 2 ? fHistory.map(h => h.rate) : undefined}
                  trend={fundTrend}
                  linkTo={`/compare/${f.slug}`}
                  onRemove={() => toggleAsset("fund", f.id, f.name)} />
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Section: Stocks ─── */}
      {enabledSections.includes("stocks") && (
        <SectionPanel title="Kenyan Stocks" icon={TrendingUp} link="/stocks" linkLabel="All stocks" count={stocks.length} sub={`${stocks.filter(s => s.day_change > 0).length}↑ ${stocks.filter(s => s.day_change < 0).length}↓`}>
          {/* Desktop: table */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/70 text-xs">
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Stock</th>
                <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Price</th>
                <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Change</th>
                <th className="text-center px-4 py-2 font-semibold text-muted-foreground">Alert</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {stocks.slice(0, 10).map((s, i) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2"><span className="text-xs font-semibold text-foreground">{s.symbol}</span><span className="block text-[10px] text-muted-foreground">{s.name}</span></td>
                    <td className="px-4 py-2 text-right text-xs tabular-nums font-bold text-foreground">KES {s.price.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right"><Change current={s.price} previous={s.previous_price} /></td>
                    <td className="px-4 py-2 text-center"><button onClick={() => openAlert("stock", s.id, s.name, s.price, "KES")} className="text-muted-foreground hover:text-accent transition-colors"><BellPlus className="h-3.5 w-3.5 mx-auto" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile: cards matching /stocks page */}
          <div className="md:hidden space-y-2.5">
            {stocks.slice(0, 10).map((s) => {
              const sparkData = getStockSparkData(s.id);
              return (
                <Link key={s.id} to={`/stocks/${s.symbol}`} className="block rounded-xl border border-border bg-card hover:border-accent/30 transition-all active:scale-[0.99] overflow-hidden">
                  <div className="flex items-center gap-3 p-3.5">
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-foreground text-sm">{s.symbol}</span>
                      <p className="text-[11px] text-muted-foreground truncate">{s.name}</p>
                    </div>
                    {sparkData.length >= 3 && (
                      <Sparkline data={sparkData} width={60} height={24} color="auto" trend={trendOf(s.price, s.previous_price)} className="shrink-0" />
                    )}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-foreground text-sm tabular-nums">KES {s.price.toFixed(2)}</p>
                      <Change current={s.price} previous={s.previous_price} />
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAlert("stock", s.id, s.name, s.price, "KES"); }}
                      className="p-1 shrink-0 text-muted-foreground hover:text-accent transition-colors"
                      aria-label="Set price alert"
                    >
                      <BellPlus className="h-4 w-4" />
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionPanel>
      )}

      {/* ─── Section: FX ─── */}
      {enabledSections.includes("fx") && (
        <SectionPanel title="FX Rates" icon={DollarSign} link="/rates" linkLabel="All rates" count={rates.length}>
          {/* Desktop: table */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/70 text-xs">
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Currency</th>
                <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Rate (KES)</th>
                <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Change</th>
                <th className="text-center px-4 py-2 font-semibold text-muted-foreground">Alert</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {rates.map((r, i) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2"><span className="text-xs font-semibold text-foreground">{r.currency_code}</span><span className="block text-[10px] text-muted-foreground">{r.currency_name}</span></td>
                    <td className="px-4 py-2 text-right text-xs tabular-nums font-bold text-foreground">{Number(r.rate).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right"><Change current={Number(r.rate)} previous={r.previous_rate != null ? Number(r.previous_rate) : null} /></td>
                    <td className="px-4 py-2 text-center"><button onClick={() => openAlert("currency", r.id, `${r.currency_code}/KES`, Number(r.rate), "KES")} className="text-muted-foreground hover:text-accent transition-colors"><BellPlus className="h-3.5 w-3.5 mx-auto" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile: cards matching /rates page */}
          <div className="md:hidden space-y-2.5">
            {rates.map((r) => {
              const sparkData = getHistory(r.currency_code).map(h => h.rate);
              return (
                <Link key={r.id} to="/rates" className="block rounded-xl border border-border bg-card hover:border-accent/30 transition-all active:scale-[0.99] overflow-hidden">
                  <div className="flex items-center gap-3 p-3.5">
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-foreground text-sm">{r.currency_code}</span>
                      <p className="text-[11px] text-muted-foreground truncate">{r.currency_name}</p>
                    </div>
                    {sparkData.length >= 3 && (
                      <Sparkline data={sparkData} width={60} height={24} color="auto" trend={trendOf(Number(r.rate), r.previous_rate != null ? Number(r.previous_rate) : null)} className="shrink-0" />
                    )}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-foreground text-sm tabular-nums">KES {Number(r.rate).toFixed(2)}</p>
                      <Change current={Number(r.rate)} previous={r.previous_rate != null ? Number(r.previous_rate) : null} />
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAlert("currency", r.id, `${r.currency_code}/KES`, Number(r.rate), "KES"); }}
                      className="p-1 shrink-0 text-muted-foreground hover:text-accent transition-colors"
                      aria-label="Set price alert"
                    >
                      <BellPlus className="h-4 w-4" />
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionPanel>
      )}

      {/* ─── Section: Commodities ─── */}
      {enabledSections.includes("commodities") && (
        <SectionPanel title="Commodities" icon={Gem} link="/commodities" linkLabel="All commodities" count={commodities.length}>
          {/* Desktop: table */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/70 text-xs">
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Commodity</th>
                <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Price</th>
                <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Change</th>
                <th className="text-center px-4 py-2 font-semibold text-muted-foreground">Alert</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {commodities.map((c, i) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2"><span className="text-xs font-semibold text-foreground">{c.name}</span><span className="block text-[10px] text-muted-foreground">{c.symbol}</span></td>
                    <td className="px-4 py-2 text-right text-xs tabular-nums font-bold text-foreground">{Number(c.price).toLocaleString("en-US", { minimumFractionDigits: 2 })} <span className="text-[9px] text-muted-foreground">{c.unit}</span></td>
                    <td className="px-4 py-2 text-right"><Change current={Number(c.price)} previous={c.previous_price != null ? Number(c.previous_price) : null} /></td>
                    <td className="px-4 py-2 text-center"><button onClick={() => openAlert("commodity", c.id, c.name, Number(c.price), c.unit)} className="text-muted-foreground hover:text-accent transition-colors"><BellPlus className="h-3.5 w-3.5 mx-auto" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile: cards matching /commodities page */}
          <div className="md:hidden space-y-2.5">
            {commodities.map((c) => (
              <Link key={c.id} to="/commodities" className="block rounded-xl border border-border bg-card hover:border-accent/30 transition-all active:scale-[0.99] overflow-hidden">
                <div className="flex items-center gap-3 p-3.5">
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-foreground text-sm">{c.name}</span>
                    <p className="text-[11px] text-muted-foreground truncate">{c.symbol}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-foreground text-sm tabular-nums">
                      {Number(c.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-muted-foreground ml-1 text-[10px]">{c.unit}</span>
                    </p>
                    <Change current={Number(c.price)} previous={c.previous_price != null ? Number(c.previous_price) : null} />
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAlert("commodity", c.id, c.name, Number(c.price), c.unit); }}
                    className="p-1 shrink-0 text-muted-foreground hover:text-accent transition-colors"
                    aria-label="Set price alert"
                  >
                    <BellPlus className="h-4 w-4" />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </SectionPanel>
      )}

      {/* ─── Section: Money Market ─── */}
      {enabledSections.includes("money_market") && (
        <SectionPanel title="Money Market Funds" icon={BarChart3} link="/funds" linkLabel="All funds" count={mmFunds.length} sub={`Best: ${bestMMYield.toFixed(2)}%`}>
          {/* Desktop: table */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/70 text-xs">
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Fund</th>
                <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Daily</th>
                <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Annual</th>
                <th className="text-center px-4 py-2 font-semibold text-muted-foreground">Details</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {mmFunds.slice(0, 10).map((f, i) => (
                  <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2"><span className="text-xs font-semibold text-foreground">{f.name}</span><span className="block text-[10px] text-muted-foreground">{f.manager}</span></td>
                    <td className="px-4 py-2 text-right text-xs tabular-nums font-medium text-foreground">{f.daily_yield.toFixed(4)}%</td>
                    <td className="px-4 py-2 text-right"><span className={`text-xs tabular-nums font-bold ${f.annual_yield === bestMMYield ? "text-accent" : "text-foreground"}`}>{f.annual_yield.toFixed(2)}%</span></td>
                    <td className="px-4 py-2 text-center"><Link to={`/compare/${f.slug}`} className="text-[10px] text-accent hover:underline inline-flex items-center gap-0.5"><Eye className="h-3 w-3" /> View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile: cards matching /funds page */}
          <div className="md:hidden space-y-2.5">
            {mmFunds.slice(0, 10).map((f) => (
              <FundCardMobile key={f.id} fund={f} isBest={f.annual_yield === bestMMYield} />
            ))}
          </div>
        </SectionPanel>
      )}

      {/* ─── Section: Fixed Income ─── */}
      {enabledSections.includes("fixed_income") && (
        <SectionPanel title="Fixed Income Funds" icon={Landmark} link="/funds" linkLabel="All funds" count={fiFunds.length}>
          {/* Desktop: table */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/70 text-xs">
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Fund</th>
                <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Daily</th>
                <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Annual</th>
                <th className="text-center px-4 py-2 font-semibold text-muted-foreground">Details</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {fiFunds.slice(0, 10).map((f, i) => (
                  <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2"><span className="text-xs font-semibold text-foreground">{f.name}</span><span className="block text-[10px] text-muted-foreground">{f.manager}</span></td>
                    <td className="px-4 py-2 text-right text-xs tabular-nums font-medium text-foreground">{f.daily_yield.toFixed(4)}%</td>
                    <td className="px-4 py-2 text-right"><span className="text-xs tabular-nums font-bold text-foreground">{f.annual_yield.toFixed(2)}%</span></td>
                    <td className="px-4 py-2 text-center"><Link to={`/compare/${f.slug}`} className="text-[10px] text-accent hover:underline inline-flex items-center gap-0.5"><Eye className="h-3 w-3" /> View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile: cards matching /funds page */}
          <div className="md:hidden space-y-2.5">
            {fiFunds.slice(0, 10).map((f) => (
              <FundCardMobile key={f.id} fund={f} />
            ))}
          </div>
        </SectionPanel>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

      {/* Dialogs */}
      <QuickAlertDialog open={alertDialog.open} onClose={() => setAlertDialog(prev => ({ ...prev, open: false }))} assetType={alertDialog.assetType} assetId={alertDialog.assetId} assetName={alertDialog.assetName} currentPrice={alertDialog.currentPrice} unit={alertDialog.unit} />
      <CustomizeDialog open={customizeOpen} onClose={() => setCustomizeOpen(false)} watchlist={watchlist} allStocks={stocks} allRates={rates} allCommodities={commodities} allFunds={funds} onToggleSection={toggleSection} onToggleAsset={toggleAsset} />
    </div>
    </div>
    </>
  );
};

/* ─── Reusable Components ─── */
const WatchCard = ({ title, sub, value, change, chart, sparkData, trend, onAlert, onRemove, linkTo }: {
  title: string; sub: string; value: string; change: React.ReactNode;
  chart?: React.ReactNode; sparkData?: number[]; trend?: "up" | "down" | "flat";
  onAlert?: () => void; onRemove: () => void; linkTo?: string;
}) => {
  const mobileMain = (
    <>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-foreground">{title}</span>
        </div>
        <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
      </div>
      {sparkData && sparkData.length >= 3 && (
        <Sparkline data={sparkData} width={48} height={18} color="auto" trend={trend} className="shrink-0" />
      )}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold tabular-nums text-foreground">{value}</p>
        <div className="mt-0.5">{change}</div>
      </div>
    </>
  );

  const desktopMain = (
    <>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{title}</p>
          <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
        </div>
      </div>
      <div className="flex items-end justify-between gap-2 mt-1.5">
        <div>
          <p className="text-base font-bold text-foreground tabular-nums">{value}</p>
          <div className="mt-0.5">{change}</div>
        </div>
        {linkTo && <Eye className="h-3.5 w-3.5 text-accent" />}
      </div>
      {chart && <div className="mt-2">{chart}</div>}
    </>
  );

  return (
    <div className="rounded-lg border border-border bg-card hover:border-accent/30 transition-colors group relative">
      <div className="flex items-center gap-1 shrink-0 absolute top-2 right-2 z-10 md:hidden">
        {onAlert && <button type="button" onClick={onAlert} className="text-muted-foreground hover:text-accent transition-colors p-0.5"><BellPlus className="h-3 w-3" /></button>}
        <button type="button" onClick={onRemove} className="text-muted-foreground/40 hover:text-destructive transition-colors p-0.5" title="Remove">
          <X className="h-2.5 w-2.5" />
        </button>
      </div>

      {linkTo ? (
        <Link to={linkTo} className="flex items-center gap-3 px-3 py-2 md:hidden pr-14">
          {mobileMain}
        </Link>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2 md:hidden pr-14">
          {mobileMain}
        </div>
      )}

      <button type="button" onClick={onRemove} className="absolute top-2 right-2 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden md:block" title="Remove from watchlist">
        <X className="h-3 w-3" />
      </button>
      {onAlert && <button type="button" onClick={onAlert} className="absolute bottom-3 right-9 text-muted-foreground hover:text-accent transition-colors p-1 z-10 hidden md:block"><BellPlus className="h-3.5 w-3.5" /></button>}

      {linkTo ? (
        <Link to={linkTo} className="hidden md:block p-3 pr-16">
          {desktopMain}
        </Link>
      ) : (
        <div className="hidden md:block p-3 pr-16">
          {desktopMain}
        </div>
      )}
    </div>
  );
};

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
