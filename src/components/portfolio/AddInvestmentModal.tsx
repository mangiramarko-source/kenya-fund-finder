import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FundLogo from "@/components/home/FundLogo";
import { ArrowLeft, Plus, Search, ChevronDown, ChevronUp, CircleDollarSign, Minus, TrendingDown, TrendingUp } from "lucide-react";
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

const MOBILE_ASSET_OPTIONS: Array<{ value: Extract<AssetType, "stock" | "mmf" | "fx" | "commodity">; label: string }> = [
  { value: "stock", label: "Stocks" },
  { value: "mmf", label: "Funds" },
  { value: "fx", label: "FX Rates" },
  { value: "commodity", label: "Commodities" },
];

const FUND_TYPE_ORDER = ["money_market", "fixed_income", "bond", "balanced", "equity", "special"];

const initialAssetType = (): AssetType =>
  typeof window !== "undefined" && window.matchMedia?.("(max-width: 767px)").matches ? "stock" : "mmf";

const fmtKES = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

interface InvestmentOptionCardProps {
  asset: LiveAsset;
  detail: string;
  isYieldType: boolean;
  selected: boolean;
  onSelect: () => void;
  mobile?: boolean;
}

const InvestmentOptionCard = ({ asset, detail, isYieldType, selected, onSelect, mobile = false }: InvestmentOptionCardProps) => (
  <button
    type="button"
    onClick={onSelect}
    className={`flex w-full items-center gap-3 rounded-2xl border text-left transition-colors ${
      mobile ? "px-4 py-3" : "p-3 sm:p-3.5"
    } ${
      selected ? "border-primary bg-primary/5" : mobile ? "border-border bg-card hover:bg-muted/40" : "border-border/80 bg-background hover:border-muted-foreground/50"
    }`}
    aria-pressed={selected}
  >
    {mobile ? (
      <FundLogo name={asset.name} logoUrl={asset.logoUrl} size={40} fullBleed className={selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""} />
    ) : (
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
        <CircleDollarSign className="h-5 w-5" />
      </span>
    )}
    <span className="min-w-0 flex-1">
      <span className={`block truncate text-foreground ${mobile ? "text-sm font-bold" : "font-semibold"}`}>{asset.name}</span>
      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{detail}</span>
    </span>
    <span className="shrink-0 text-right text-sm tabular-nums">
      <span className="block font-semibold text-foreground">{isYieldType ? `${asset.yld?.toFixed(2) ?? "—"}%` : fmtKES(asset.price || 0)}</span>
      {mobile ? (
        asset.changePercent == null ? (
          <span className="block min-h-4 text-[11px] text-muted-foreground">{isYieldType ? "annual yield" : ""}</span>
        ) : (
          <span className={`mt-0.5 inline-flex items-center justify-end gap-1 text-[11px] font-semibold ${asset.changePercent > 0 ? "text-emerald-500" : asset.changePercent < 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {asset.changePercent > 0 ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : asset.changePercent < 0 ? <TrendingDown className="h-3 w-3" aria-hidden="true" /> : <Minus className="h-3 w-3" aria-hidden="true" />}
            {asset.changePercent > 0 ? "+" : ""}{asset.changePercent.toFixed(2)}%
          </span>
        )
      ) : <span className="block text-[11px] text-muted-foreground">{isYieldType ? "annual yield" : "current price"}</span>}
    </span>
    {!mobile && <span className={`h-5 w-5 shrink-0 rounded-full border-2 ${selected ? "border-primary bg-primary shadow-[inset_0_0_0_3px_hsl(var(--background))]" : "border-muted-foreground/50"}`} aria-hidden="true" />}
  </button>
);

const AddInvestmentModal = ({ onAdd, isPending, open: controlledOpen, onOpenChange: controlledOnOpenChange }: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (val: boolean) => {
    if (controlledOnOpenChange) controlledOnOpenChange(val);
    if (!isControlled) setInternalOpen(val);
  };
  const [assetType, setAssetType] = useState<AssetType>(initialAssetType);
  const [fundTypeFilter, setFundTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<LiveAsset | null>(null);
  const [mobileStep, setMobileStep] = useState<"pick" | "amount">("pick");
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

  const groupedFundAssets = useMemo(
    () => FUND_TYPE_ORDER
      .map((fundType) => ({
        fundType,
        label: FUND_TYPE_LABELS[fundType] || fundType.replace(/_/g, " "),
        items: filteredAssets.filter((asset) => asset.fundType === fundType),
      }))
      .filter((group) => group.items.length > 0),
    [filteredAssets],
  );

  const resetForm = () => {
    setSearch("");
    setSelectedAsset(null);
    setAmount("");
    setCustomYield("");
    setShowAdvanced(false);
    setFundTypeFilter("all");
    setMobileStep("pick");
  };

  const handleSelectAsset = (asset: LiveAsset) => {
    setSelectedAsset(asset);
    if (asset.yld) setCustomYield(String(asset.yld));
    setMobileStep("amount");
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
  const allResultsLabel = search.trim() ? "Matching investments" : `All ${assetType === "mmf" ? "funds" : "investments"}`;

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
      <DialogContent className="bottom-0 left-0 top-auto w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-t-2xl border-x-0 border-b-0 border-border/80 bg-background p-0 ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=closed]:![--tw-exit-translate-x:0] data-[state=closed]:![--tw-exit-translate-y:100%] data-[state=open]:![--tw-enter-translate-x:0] data-[state=open]:![--tw-enter-translate-y:100%] sm:rounded-t-2xl md:bottom-auto md:left-[50%] md:top-[50%] md:w-[calc(100%-1rem)] md:max-w-[980px] md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-[28px] md:bg-card md:data-[state=closed]:duration-200 md:data-[state=open]:duration-200 md:data-[state=closed]:![--tw-exit-translate-x:-50%] md:data-[state=closed]:![--tw-exit-translate-y:-48%] md:data-[state=open]:![--tw-enter-translate-x:-50%] md:data-[state=open]:![--tw-enter-translate-y:-48%]">
        <DialogHeader className="border-b border-border/50 px-5 pb-3 pt-5 pr-14 text-left md:px-7 md:pb-5 md:pt-7">
          <DialogTitle className="text-base font-bold tracking-normal text-foreground md:text-3xl md:tracking-tight">Add to mock portfolio</DialogTitle>
          <DialogDescription className="mt-1 hidden text-sm md:block md:text-base">Choose an investment, then set your amount.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(86vh-76px)] overflow-y-auto px-5 pb-5 pt-4 md:max-h-[calc(90vh-112px)] md:px-7 md:py-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)] lg:gap-8">
            <div className="min-w-0">
              <div className={`space-y-4 md:space-y-5 ${mobileStep === "amount" ? "hidden md:block" : "block"}`}>
              <div className="hidden gap-2 overflow-x-auto pb-1 no-scrollbar md:flex" aria-label="Asset type">
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
                <div className="hidden items-center gap-3 md:flex">
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

              <div className="relative hidden md:block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchLabel}
                  className="h-12 rounded-2xl border-border/80 bg-background pl-12 text-base shadow-none"
                />
              </div>

              <div className="space-y-4 md:hidden">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Mobile asset type">
                  {MOBILE_ASSET_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setAssetType(value); resetForm(); }}
                      className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${assetType === value ? "bg-emerald-600 text-white shadow-sm" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}
                      aria-pressed={assetType === value}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={searchLabel}
                    className="h-11 w-full rounded-full border-border/80 bg-card pl-10 text-[15px] shadow-sm placeholder:text-muted-foreground/60 focus-visible:ring-1"
                  />
                </div>
              </div>

              <section aria-label={resultLabel}>
                <div className="space-y-3 md:hidden" data-testid="mobile-investment-results">
                  {filteredAssets.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No investments found.</div>
                  ) : assetType === "mmf" ? (
                    groupedFundAssets.map((group) => (
                      <div key={group.fundType} className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{group.label}</p>
                          <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{group.items.length}</span>
                        </div>
                        {group.items.map((asset) => (
                          <InvestmentOptionCard
                            key={asset.id || asset.name}
                            asset={asset}
                            detail={assetDetail(asset)}
                            isYieldType={true}
                            selected={selectedAsset?.id ? selectedAsset.id === asset.id : selectedAsset?.name === asset.name}
                            onSelect={() => handleSelectAsset(asset)}
                            mobile
                          />
                        ))}
                      </div>
                    ))
                  ) : (
                    filteredAssets.map((asset) => (
                      <InvestmentOptionCard
                        key={asset.id || asset.name}
                        asset={asset}
                        detail={assetDetail(asset)}
                        isYieldType={isYieldType}
                        selected={selectedAsset?.id ? selectedAsset.id === asset.id : selectedAsset?.name === asset.name}
                        onSelect={() => handleSelectAsset(asset)}
                        mobile
                      />
                    ))
                  )}
                </div>

                <div className="hidden space-y-2.5 md:block">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-foreground">{resultLabel}</h3>
                    {filteredAssets.length > visibleAssets.length && !search.trim() && <span className="text-xs text-muted-foreground">Search to see more</span>}
                  </div>
                  {visibleAssets.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No investments found.</div>
                  ) : visibleAssets.map((asset) => (
                    <InvestmentOptionCard
                      key={asset.id || asset.name}
                      asset={asset}
                      detail={assetDetail(asset)}
                      isYieldType={isYieldType}
                      selected={selectedAsset?.id ? selectedAsset.id === asset.id : selectedAsset?.name === asset.name}
                      onSelect={() => handleSelectAsset(asset)}
                    />
                  ))}
                </div>
              </section>
              </div>

              {mobileStep === "amount" && selectedAsset && (
                <section className="space-y-5 md:hidden" aria-label="Investment amount">
                  <button
                    type="button"
                    onClick={() => setMobileStep("pick")}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors active:scale-95"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to investments
                  </button>

                  <div className="flex items-center gap-3 rounded-[22px] border border-border bg-card p-4">
                    <FundLogo name={selectedAsset.name} logoUrl={selectedAsset.logoUrl} size={52} fullBleed />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{selectedAsset.name}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{assetDetail(selectedAsset)}</p>
                    </div>
                    <div className="shrink-0 text-right text-sm tabular-nums">
                      <p className="font-semibold text-foreground">{isYieldType ? `${selectedAsset.yld?.toFixed(2) ?? "—"}%` : fmtKES(selectedAsset.price || 0)}</p>
                      <p className="text-[11px] text-muted-foreground">{isYieldType ? "annual yield" : "current price"}</p>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-border bg-card p-4">
                    <Label htmlFor="mobile-investment-amount" className="text-sm font-medium">{amountLabel}</Label>
                    <div className="relative mt-2">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">KES</span>
                      <Input
                        id="mobile-investment-amount"
                        type="number"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="50,000"
                        min="0"
                        className="h-14 rounded-2xl border-border/80 bg-card pl-16 text-xl font-semibold tabular-nums shadow-none"
                      />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{amountHelp}</p>
                    {previewUnits != null && <p className="mt-1 text-xs tabular-nums text-primary">≈ {previewUnits.toLocaleString("en-KE", { maximumFractionDigits: 4 })} units</p>}

                    {estimatedAnnualReturn != null && (
                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                        <span className="text-sm text-muted-foreground">Estimated annual return</span>
                        <span className="text-base font-semibold tabular-nums text-primary">{fmtKES(estimatedAnnualReturn)}</span>
                      </div>
                    )}

                    {isYieldType && (
                      <div className="mt-4">
                        <button type="button" onClick={() => setShowAdvanced((s) => !s)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />} Advanced yield
                        </button>
                        {showAdvanced && (
                          <div className="mt-2">
                            <Label htmlFor="mobile-annual-yield" className="text-xs">Annual yield (%)</Label>
                            <Input id="mobile-annual-yield" type="number" value={customYield} onChange={(e) => setCustomYield(e.target.value)} min="0" step="0.1" className="mt-1.5 rounded-xl" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="sticky bottom-0 -mx-5 border-t border-border/70 bg-background px-5 pb-1 pt-4">
                    <Button onClick={handleSubmit} disabled={isPending || !validAmount} className="h-12 w-full rounded-2xl text-base font-semibold">
                      {isPending ? "Adding…" : !validAmount ? "Enter an amount" : "Add investment"}
                    </Button>
                    <p className="mt-3 text-center text-[11px] text-muted-foreground">Mock portfolio — no real money is invested.</p>
                  </div>
                </section>
              )}
            </div>

            <aside className="hidden rounded-[22px] border border-border/80 bg-background p-4 sm:p-5 md:block lg:sticky lg:top-0 lg:self-start" aria-label="Your investment">
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
