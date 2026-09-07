import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ChevronDown, ChevronUp, Check, CircleDollarSign } from "lucide-react";
import { AssetType, ASSET_TYPE_LABELS, NewPortfolioItem, LiveAsset, useLiveAssets } from "@/hooks/usePortfolio";

interface Props {
  onAdd: (item: NewPortfolioItem) => void;
  isPending: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const FUND_TYPE_LABELS: Record<string, string> = {
  all: "All Fund Types",
  money_market: "Money Market",
  fixed_income: "Fixed Income",
  equity: "Equity",
  balanced: "Balanced",
  bond: "Bond",
};

const ASSET_OPTIONS: Array<{ value: AssetType; label: string }> = [
  { value: "mmf", label: "Funds" },
  { value: "stock", label: "Stocks" },
  { value: "fx", label: "FX" },
  { value: "fixed_income", label: "Treasury" },
  { value: "commodity", label: "Commodities" },
];

const fmtKES = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const AddInvestmentModal = ({ onAdd, isPending, open: controlledOpen, onOpenChange: controlledOnOpenChange }: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (val: boolean) => {
    if (controlledOnOpenChange) controlledOnOpenChange(val);
    if (!isControlled) setInternalOpen(val);
  };
  const [assetType, setAssetType] = useState<AssetType>("mmf");
  const [fundTypeFilter, setFundTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<LiveAsset | null>(null);
  const [amount, setAmount] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customYield, setCustomYield] = useState("");

  const { data: liveAssets } = useLiveAssets();

  const availableFundTypes = useMemo(() => {
    if (assetType !== "mmf") return [];
    const list = liveAssets?.mmf || [];
    const types = new Set(list.map((a) => a.fundType).filter(Boolean));
    return Array.from(types) as string[];
  }, [liveAssets, assetType]);

  const filteredAssets = useMemo(() => {
    let list = liveAssets?.[assetType] || [];
    if (assetType === "mmf" && fundTypeFilter !== "all") {
      list = list.filter((a) => a.fundType === fundTypeFilter);
    }
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((a) => a.name.toLowerCase().includes(q) || a.ticker?.toLowerCase().includes(q));
  }, [liveAssets, assetType, search, fundTypeFilter]);

  const visibleAssets = useMemo(
    () => filteredAssets.slice(0, search.trim() ? 6 : 3),
    [filteredAssets, search],
  );

  const resetForm = () => {
    setSearch("");
    setSelectedAsset(null);
    setAmount("");
    setCustomYield("");
    setShowAdvanced(false);
    setFundTypeFilter("all");
  };

  const handleSelectAsset = (asset: LiveAsset) => {
    setSelectedAsset(asset);
    if (asset.yld) setCustomYield(String(asset.yld));
  };

  const isYieldType = assetType === "mmf" || assetType === "fixed_income";
  const amountNum = parseFloat(amount);
  const validAmount = !isNaN(amountNum) && amountNum > 0;

  // Live preview of how the amount maps to units
  const previewUnits = useMemo(() => {
    if (!selectedAsset || !validAmount) return null;
    if (isYieldType) return null; // principal-style, no unit breakdown needed
    const price = selectedAsset.price || 0;
    if (price <= 0) return null;
    return amountNum / price;
  }, [selectedAsset, validAmount, amountNum, isYieldType]);

  const handleSubmit = () => {
    if (!selectedAsset || !validAmount) return;

    const name = selectedAsset.name;
    const ticker = selectedAsset.ticker || undefined;
    const assetId = selectedAsset.id || undefined;
    const price = selectedAsset.price || 0;
    const yld = parseFloat(customYield) || selectedAsset.yld || 0;

    let units = 1;
    let buyPrice = amountNum;

    if (!isYieldType) {
      // Stock / FX / Commodity → derive units from amount and live price
      if (price <= 0) return;
      units = amountNum / price;
      buyPrice = price;
    }

    onAdd({
      asset_type: assetType,
      asset_name: name,
      ticker,
      asset_id: assetId,
      units,
      buy_price: buyPrice,
      current_price: buyPrice,
      current_yield: yld,
    });
    resetForm();
    setOpen(false);
  };

  const amountLabel = isYieldType ? "How much are you investing?" : "How much are you spending?";
  const amountHelp = isYieldType
    ? "Enter the money you want to put into this fund."
    : selectedAsset
      ? `At ${fmtKES(selectedAsset.price || 0)} per unit, we'll calculate how many units that buys.`
      : "Enter how much money you want to spend on this asset.";
  const estimatedAnnualReturn = selectedAsset && validAmount && isYieldType
    ? amountNum * (parseFloat(customYield) || selectedAsset.yld || 0) / 100
    : null;
  const searchLabel = assetType === "mmf" ? "Search funds" : `Search ${ASSET_TYPE_LABELS[assetType].replace(/\s*\(.+\)/, "").toLowerCase()}`;
  const resultLabel = search.trim() ? "Matching investments" : `Suggested ${assetType === "mmf" ? "funds" : "investments"}`;

  const assetDetail = (asset: LiveAsset) => {
    if (asset.fundType) return FUND_TYPE_LABELS[asset.fundType] || asset.fundType.replace(/_/g, " ");
    if (asset.ticker) return asset.ticker;
    return ASSET_TYPE_LABELS[assetType];
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="gap-1.5 h-9 px-4 text-xs sm:gap-2 sm:h-10 sm:px-5 sm:text-sm bg-[#00A651] hover:bg-[#008f45] text-white font-semibold rounded-full shadow-xs border-0 transition-all">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.5]" /> Add Investment
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="w-[calc(100%-1rem)] max-w-[980px] max-h-[90vh] overflow-hidden rounded-[24px] border-border/80 bg-card p-0 gap-0 sm:rounded-[28px]">
        <DialogHeader className="border-b border-border/70 px-5 pb-4 pt-6 pr-14 text-left sm:px-7 sm:pb-5 sm:pt-7">
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Add to mock portfolio</DialogTitle>
          <DialogDescription className="mt-1 text-sm sm:text-base">Choose an investment, then set your amount.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-112px)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)] lg:gap-8">
            <div className="min-w-0 space-y-5">
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="Asset type">
                {ASSET_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setAssetType(value); resetForm(); }}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      assetType === value
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                    }`}
                    aria-pressed={assetType === value}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {assetType === "mmf" && availableFundTypes.length > 0 && (
                <div className="flex items-center gap-3">
                  <Label htmlFor="fund-category" className="shrink-0 text-xs text-muted-foreground">Fund type</Label>
                  <Select value={fundTypeFilter} onValueChange={setFundTypeFilter}>
                    <SelectTrigger id="fund-category" className="h-9 rounded-full text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All fund types</SelectItem>
                      {availableFundTypes.map((ft) => (
                        <SelectItem key={ft} value={ft}>{FUND_TYPE_LABELS[ft] || ft.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchLabel}
                  className="h-12 rounded-2xl border-border/80 bg-background pl-12 text-base shadow-none"
                />
              </div>

              <section aria-label={resultLabel}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-foreground">{resultLabel}</h3>
                  {filteredAssets.length > visibleAssets.length && !search.trim() && (
                    <span className="text-xs text-muted-foreground">Search to see more</span>
                  )}
                </div>
                <div className="space-y-2.5">
                  {visibleAssets.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No investments found.</div>
                  ) : (
                    visibleAssets.map((asset, i) => {
                      const selected = selectedAsset?.id ? selectedAsset.id === asset.id : selectedAsset?.name === asset.name;
                      return (
                        <button
                          key={`${asset.id || asset.name}-${i}`}
                          type="button"
                          onClick={() => handleSelectAsset(asset)}
                          className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors sm:p-3.5 ${
                            selected
                              ? "border-primary bg-primary/5"
                              : "border-border/80 bg-background hover:border-muted-foreground/50"
                          }`}
                          aria-pressed={selected}
                        >
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {selected ? <Check className="h-5 w-5" /> : <CircleDollarSign className="h-5 w-5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-foreground">{asset.name}</span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{assetDetail(asset)}</span>
                          </span>
                          <span className="shrink-0 text-right text-sm tabular-nums">
                            <span className="block font-semibold text-foreground">{isYieldType ? `${asset.yld?.toFixed(2) ?? "—"}%` : fmtKES(asset.price || 0)}</span>
                            <span className="block text-[11px] text-muted-foreground">{isYieldType ? "annual yield" : "current price"}</span>
                          </span>
                          <span className={`h-5 w-5 shrink-0 rounded-full border-2 ${selected ? "border-primary bg-primary shadow-[inset_0_0_0_3px_hsl(var(--background))]" : "border-muted-foreground/50"}`} aria-hidden="true" />
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
            </div>

            <aside className="rounded-[22px] border border-border/80 bg-background p-4 sm:p-5 lg:sticky lg:top-0 lg:self-start" aria-label="Your investment">
              <h3 className="text-lg font-semibold text-foreground">Your investment</h3>
              {selectedAsset ? (
                <p className="mt-1 truncate text-sm text-muted-foreground">{selectedAsset.name}</p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Select an investment to continue.</p>
              )}

              <div className="mt-5">
                <Label htmlFor="investment-amount" className="text-sm font-medium">{amountLabel}</Label>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">KES</span>
                  <Input
                    id="investment-amount"
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="50,000"
                    min="0"
                    disabled={!selectedAsset}
                    className="h-16 rounded-2xl border-border/80 bg-card pl-16 text-2xl font-semibold tabular-nums shadow-none disabled:opacity-60"
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{selectedAsset ? amountHelp : "Choose an investment before entering an amount."}</p>
                {previewUnits != null && <p className="mt-1 text-xs tabular-nums text-primary">≈ {previewUnits.toLocaleString("en-KE", { maximumFractionDigits: 4 })} units</p>}
              </div>

              {estimatedAnnualReturn != null && (
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                  <span className="text-sm text-muted-foreground">Estimated annual return</span>
                  <span className="text-base font-semibold tabular-nums text-primary">{fmtKES(estimatedAnnualReturn)}</span>
                </div>
              )}

              {selectedAsset && isYieldType && (
                <div className="mt-4">
                  <button type="button" onClick={() => setShowAdvanced((s) => !s)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />} Advanced yield
                  </button>
                  {showAdvanced && (
                    <div className="mt-2">
                      <Label htmlFor="annual-yield" className="text-xs">Annual yield (%)</Label>
                      <Input id="annual-yield" type="number" value={customYield} onChange={(e) => setCustomYield(e.target.value)} min="0" step="0.1" className="mt-1.5 rounded-xl" />
                    </div>
                  )}
                </div>
              )}

              <Button onClick={handleSubmit} disabled={isPending || !selectedAsset || !validAmount} className="mt-6 h-12 w-full rounded-2xl text-base font-semibold">
                {isPending ? "Adding…" : !selectedAsset ? "Choose an investment" : !validAmount ? "Enter an amount" : "Add investment"}
              </Button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">Mock portfolio — no real money is invested.</p>
            </aside>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddInvestmentModal;
