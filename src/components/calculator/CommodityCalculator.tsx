import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Gem,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  DollarSign,
  ChevronDown,
  Coins,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface CommodityItem {
  id: string;
  name: string;
  symbol: string;
  price: number;
  previous_price: number | null;
  unit: string;
}

const FALLBACK_COMMODITIES: CommodityItem[] = [
  { id: "gold", symbol: "Gold", name: "Gold (XAU)", price: 2750.0, previous_price: 2740.0, unit: "USD / troy oz" },
  { id: "brent", symbol: "Brent", name: "Crude Oil (Brent)", price: 82.5, previous_price: 81.9, unit: "USD / barrel" },
  { id: "silver", symbol: "Silver", name: "Silver (XAG)", price: 32.2, previous_price: 31.8, unit: "USD / troy oz" },
  { id: "tea", symbol: "Tea", name: "Kenyan Tea (Mombasa Auction)", price: 2.85, previous_price: 2.8, unit: "USD / kg" },
  { id: "coffee", symbol: "Coffee", name: "Kenyan Arabica Coffee (NCE)", price: 4.5, previous_price: 4.4, unit: "USD / kg" },
  { id: "copper", symbol: "Copper", name: "Copper (High Grade)", price: 4.45, previous_price: 4.4, unit: "USD / lb" },
];

const QUANTITY_PRESETS = [1, 5, 10, 50, 100, 500];
const TARGET_CHANGE_PRESETS = [
  { label: "+5%", pct: 5 },
  { label: "+10%", pct: 10 },
  { label: "+25%", pct: 25 },
  { label: "+50%", pct: 50 },
  { label: "-10%", pct: -10 },
];

const fmt = (n: number, maxDecimals = 2) =>
  n.toLocaleString("en-KE", { maximumFractionDigits: maxDecimals, minimumFractionDigits: maxDecimals > 0 ? 2 : 0 });

export const CommodityCalculator = () => {
  const [commodities, setCommodities] = useState<CommodityItem[]>(FALLBACK_COMMODITIES);
  const [selectedId, setSelectedId] = useState<string>("gold");
  const [usdRate, setUsdRate] = useState<number>(129.5); // Fallback USD/KES rate
  const [calcMode, setCalcMode] = useState<"converter" | "pnl">("converter");

  // Valuation inputs
  const [quantity, setQuantity] = useState<number>(10);

  // PnL inputs
  const [entryPrice, setEntryPrice] = useState<number>(2650);
  const [targetPrice, setTargetPrice] = useState<number>(2850);

  // Load live commodities and USDKES rate
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [commRes, rateRes] = await Promise.all([
          supabase
            .from("commodities_public" as any)
            .select("id, name, symbol, price, previous_price, unit, updated_at")
            .order("sort_order"),
          supabase
            .from("exchange_rates_public" as any)
            .select("rate")
            .eq("currency_code", "USD")
            .maybeSingle(),
        ]);

        if (!mounted) return;

        if (commRes.data && (commRes.data as any[]).length > 0) {
          const mapped: CommodityItem[] = (commRes.data as any[]).map((c) => ({
            id: c.id || c.symbol,
            name: c.name,
            symbol: c.symbol,
            price: Number(c.price) || 0,
            previous_price: c.previous_price != null ? Number(c.previous_price) : null,
            unit: c.unit || "USD",
          }));
          setCommodities(mapped);
        }

        if (rateRes.data && Number((rateRes.data as any).rate) > 0) {
          setUsdRate(Number((rateRes.data as any).rate));
        }
      } catch (err) {
        console.warn("Failed to load live commodity calculator data, using fallbacks:", err);
      }
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedCommodity = useMemo(() => {
    return commodities.find((c) => c.id === selectedId) || commodities[0] || FALLBACK_COMMODITIES[0];
  }, [commodities, selectedId]);

  // Sync entry and target prices when commodity changes
  useEffect(() => {
    if (selectedCommodity) {
      setEntryPrice(Number(selectedCommodity.price.toFixed(2)));
      setTargetPrice(Number((selectedCommodity.price * 1.1).toFixed(2)));
    }
  }, [selectedCommodity.id]);

  // Mode 1: Valuation Calculations
  const currentTotalUsd = useMemo(() => {
    return (quantity || 0) * (selectedCommodity?.price || 0);
  }, [quantity, selectedCommodity]);

  const currentTotalKes = useMemo(() => {
    return currentTotalUsd * usdRate;
  }, [currentTotalUsd, usdRate]);

  // Mode 2: P&L Calculations
  const pnlResults = useMemo(() => {
    const qty = quantity || 0;
    const costUsd = qty * (entryPrice || 0);
    const exitUsd = qty * (targetPrice || 0);
    const profitUsd = exitUsd - costUsd;
    const profitKes = profitUsd * usdRate;
    const roiPct = costUsd > 0 ? (profitUsd / costUsd) * 100 : 0;

    return {
      costUsd,
      costKes: costUsd * usdRate,
      exitUsd,
      exitKes: exitUsd * usdRate,
      profitUsd,
      profitKes,
      roiPct,
    };
  }, [quantity, entryPrice, targetPrice, usdRate]);

  return (
    <div className="space-y-5">
      {/* ─── 1. COMMODITY SELECTOR ─── */}
      <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-xs">
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
          Select Commodity
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {commodities.map((c) => {
            const isSelected = c.id === selectedCommodity.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-emerald-600 dark:border-emerald-500 bg-emerald-500/10 shadow-xs"
                    : "border-border/70 bg-card hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-foreground truncate">{c.symbol}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                </div>
                <span className="text-[11px] text-muted-foreground truncate w-full mt-0.5">{c.name}</span>
                <span className="text-xs font-bold tabular-nums text-foreground mt-1">
                  ${fmt(c.price)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 2. CALCULATOR MODE SWITCHER ─── */}
      <div className="flex rounded-xl bg-muted p-1 gap-1">
        <button
          type="button"
          onClick={() => setCalcMode("converter")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            calcMode === "converter"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          <span>Valuation & KES Converter</span>
        </button>
        <button
          type="button"
          onClick={() => setCalcMode("pnl")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            calcMode === "pnl"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>P&L & Return Simulator</span>
        </button>
      </div>

      {/* ─── 3. QUANTITY INPUT & PRESETS ─── */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="comm-qty" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Quantity / Units ({selectedCommodity.unit})
          </Label>
          <span className="text-[11px] text-muted-foreground">
            Market Price: <strong className="text-foreground">${fmt(selectedCommodity.price)}</strong>
          </span>
        </div>
        <div className="relative">
          <Input
            id="comm-qty"
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
            className="text-base font-bold bg-background border-border pl-3"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUANTITY_PRESETS.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setQuantity(val)}
              className={`px-2.5 py-1 text-xs rounded-lg border font-semibold transition-colors cursor-pointer ${
                quantity === val
                  ? "bg-foreground text-background border-foreground"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {val} {val === 1 ? "unit" : "units"}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 4A. MODE: VALUATION & CONVERTER RESULTS ─── */}
      {calcMode === "converter" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Total Value in KES
              </p>
              <p className="text-2xl font-black text-foreground tabular-nums">
                KSh {fmt(currentTotalKes, 0)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Converted @ 1 USD = KSh {fmt(usdRate, 2)}
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Value in USD
              </p>
              <p className="text-2xl font-black text-foreground tabular-nums">
                ${fmt(currentTotalUsd, 2)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {quantity} × ${fmt(selectedCommodity.price)} {selectedCommodity.unit}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              CBK USD/KES benchmark applied
            </span>
            <span className="font-bold text-foreground tabular-nums">
              KES {fmt(usdRate, 2)}
            </span>
          </div>
        </div>
      )}

      {/* ─── 4B. MODE: P&L RETURN SIMULATOR ─── */}
      {calcMode === "pnl" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
              <Label htmlFor="entry-price" className="text-xs font-bold text-muted-foreground">
                Buy / Entry Price (USD)
              </Label>
              <Input
                id="entry-price"
                type="number"
                step="0.01"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Math.max(0, Number(e.target.value)))}
                className="font-bold"
              />
            </div>
            <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
              <Label htmlFor="target-price" className="text-xs font-bold text-muted-foreground">
                Target / Exit Price (USD)
              </Label>
              <Input
                id="target-price"
                type="number"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(Math.max(0, Number(e.target.value)))}
                className="font-bold"
              />
            </div>
          </div>

          {/* Quick Target adjust buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[11px] font-bold text-muted-foreground shrink-0 mr-1">
              Target Presets:
            </span>
            {TARGET_CHANGE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  const newTarget = entryPrice * (1 + preset.pct / 100);
                  setTargetPrice(Number(newTarget.toFixed(2)));
                }}
                className="px-2 py-0.5 text-xs rounded-md border border-border/80 bg-card hover:bg-muted font-medium text-foreground transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* PnL Result Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`rounded-2xl border p-4 space-y-1 ${
              pnlResults.profitUsd >= 0
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-destructive/30 bg-destructive/5"
            }`}>
              <p className={`text-[11px] font-bold uppercase tracking-wider ${
                pnlResults.profitUsd >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
              }`}>
                Net Return / P&L
              </p>
              <p className={`text-xl font-black tabular-nums ${
                pnlResults.profitUsd >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
              }`}>
                {pnlResults.profitUsd >= 0 ? "+" : ""}${fmt(pnlResults.profitUsd, 2)}
              </p>
              <p className="text-[11px] font-bold text-foreground tabular-nums">
                {pnlResults.profitKes >= 0 ? "+" : ""}KSh {fmt(pnlResults.profitKes, 0)}
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Return on Investment
              </p>
              <p className={`text-xl font-black tabular-nums flex items-center gap-1 ${
                pnlResults.roiPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
              }`}>
                {pnlResults.roiPct >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {pnlResults.roiPct >= 0 ? "+" : ""}{fmt(pnlResults.roiPct, 2)}%
              </p>
              <p className="text-[11px] text-muted-foreground">
                Exit vs Entry
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Exit Capital (KES)
              </p>
              <p className="text-xl font-black text-foreground tabular-nums">
                KSh {fmt(pnlResults.exitKes, 0)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Cost: KSh {fmt(pnlResults.costKes, 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommodityCalculator;
