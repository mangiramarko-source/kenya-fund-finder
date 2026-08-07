import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ChevronDown, ChevronUp, Check } from "lucide-react";
import { AssetType, ASSET_TYPE_LABELS, NewPortfolioItem, LiveAsset, useLiveAssets } from "@/hooks/usePortfolio";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-1.5 h-9 px-3 text-xs sm:gap-2 sm:h-10 sm:px-4 sm:text-sm">
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Add Investment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-primary">Add Mock Investment</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Pick an asset, then enter how much money you're putting in. That's it.
          </p>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4 overflow-y-auto flex-1 min-h-0">
          {/* Step 1: Asset Class */}
          <div>
            <Label className="text-xs flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">1</span>
              Asset class
            </Label>
            <Select value={assetType} onValueChange={(v) => { setAssetType(v as AssetType); resetForm(); }}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(ASSET_TYPE_LABELS) as [AssetType, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {assetType === "mmf" && availableFundTypes.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Fund category (optional)</Label>
              <Select value={fundTypeFilter} onValueChange={setFundTypeFilter}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fund Types</SelectItem>
                  {availableFundTypes.map((ft) => (
                    <SelectItem key={ft} value={ft}>
                      {FUND_TYPE_LABELS[ft] || ft.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 2: Pick asset */}
          {!selectedAsset ? (
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">2</span>
                Pick from the list
              </Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${ASSET_TYPE_LABELS[assetType]}…`}
                  className="pl-8"
                />
              </div>
              <ScrollArea className="mt-2 h-[200px] rounded-lg border border-border">
                {filteredAssets.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">No assets found.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredAssets.map((asset, i) => (
                      <button
                        key={`${asset.name}-${i}`}
                        onClick={() => handleSelectAsset(asset)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-accent/5 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{asset.name}</div>
                          {asset.ticker && (
                            <div className="text-[11px] text-muted-foreground truncate">{asset.ticker}</div>
                          )}
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap ml-2">
                          {isYieldType
                            ? `${asset.yld?.toFixed(2) ?? "—"}% p.a.`
                            : fmtKES(asset.price || 0)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            <div className="rounded-lg border border-accent/40 bg-accent/5 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent shrink-0">
                    <Check className="h-3 w-3" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{selectedAsset.name}</div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      {isYieldType
                        ? `${selectedAsset.yld?.toFixed(2) ?? "—"}% per year`
                        : `${fmtKES(selectedAsset.price || 0)} per unit`}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs h-7 shrink-0" onClick={() => setSelectedAsset(null)}>
                  Change
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Amount only */}
          {selectedAsset && (
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">3</span>
                {amountLabel}
              </Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  KES
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 10,000"
                  min="0"
                  className="pl-12 text-base font-semibold tabular-nums"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">{amountHelp}</p>
              {previewUnits != null && (
                <p className="text-[11px] text-accent mt-1 tabular-nums">
                  ≈ {previewUnits.toLocaleString("en-KE", { maximumFractionDigits: 4 })} units
                </p>
              )}
            </div>
          )}

          {/* Advanced: yield override (MMF/FI only) */}
          {selectedAsset && isYieldType && (
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced((s) => !s)}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Advanced
              </button>
              {showAdvanced && (
                <div className="mt-2">
                  <Label className="text-xs">Annual yield (%)</Label>
                  <Input
                    type="number"
                    value={customYield}
                    onChange={(e) => setCustomYield(e.target.value)}
                    min="0"
                    step="0.1"
                    className="mt-1.5"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Defaults to the fund's published yield. Override only if you have a different figure.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-border bg-background shrink-0 space-y-1">
          <Button
            onClick={handleSubmit}
            disabled={isPending || !selectedAsset || !validAmount}
            className="w-full"
          >
            {isPending
              ? "Adding…"
              : !selectedAsset
                ? "Pick an asset first"
                : !validAmount
                  ? "Enter an amount"
                  : `Add ${fmtKES(amountNum)} to Portfolio`}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Mock portfolio — no real money is invested.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddInvestmentModal;
