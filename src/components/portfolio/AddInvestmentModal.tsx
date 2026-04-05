import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { AssetType, ASSET_TYPE_LABELS, NewPortfolioItem, LiveAsset, useLiveAssets } from "@/hooks/usePortfolio";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  onAdd: (item: NewPortfolioItem) => void;
  isPending: boolean;
}

const AddInvestmentModal = ({ onAdd, isPending }: Props) => {
  const [open, setOpen] = useState(false);
  const [assetType, setAssetType] = useState<AssetType>("mmf");
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<LiveAsset | null>(null);
  const [units, setUnits] = useState("1");
  const [buyPrice, setBuyPrice] = useState("");
  const [yld, setYld] = useState("15");
  const [customName, setCustomName] = useState("");
  const [customTicker, setCustomTicker] = useState("");

  const { data: liveAssets } = useLiveAssets();

  const filteredAssets = useMemo(() => {
    const list = liveAssets?.[assetType] || [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((a) => a.name.toLowerCase().includes(q) || a.ticker?.toLowerCase().includes(q));
  }, [liveAssets, assetType, search]);

  const resetForm = () => {
    setSearch(""); setSelectedAsset(null); setUnits("1"); setBuyPrice(""); setYld("15");
    setCustomName(""); setCustomTicker("");
  };

  const handleSelectAsset = (asset: LiveAsset) => {
    setSelectedAsset(asset);
    setBuyPrice(String(asset.price));
    if (asset.yld) setYld(String(asset.yld));
  };

  const handleSubmit = () => {
    const name = selectedAsset?.name || customName;
    const ticker = selectedAsset?.ticker || customTicker || undefined;
    const u = parseFloat(units);
    const bp = parseFloat(buyPrice);
    if (!name || isNaN(u) || isNaN(bp) || u <= 0 || bp <= 0) return;
    onAdd({
      asset_type: assetType,
      asset_name: name,
      ticker,
      units: u,
      buy_price: bp,
      current_price: bp,
      current_yield: parseFloat(yld) || 0,
    });
    resetForm();
    setOpen(false);
  };

  const isYieldType = assetType === "mmf" || assetType === "fixed_income";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add Investment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-primary">Add Mock Investment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Asset Class Selector */}
          <div>
            <Label className="text-xs">Asset Class</Label>
            <Select value={assetType} onValueChange={(v) => { setAssetType(v as AssetType); resetForm(); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(ASSET_TYPE_LABELS) as [AssetType, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Asset Picker with Search */}
          {!selectedAsset ? (
            <div>
              <Label className="text-xs">Select Asset (live data)</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${ASSET_TYPE_LABELS[assetType]}…`}
                  className="pl-8"
                />
              </div>
              <ScrollArea className="mt-2 h-[180px] rounded-lg border border-border">
                {filteredAssets.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">No assets found</div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredAssets.map((asset, i) => (
                      <button
                        key={`${asset.name}-${i}`}
                        onClick={() => handleSelectAsset(asset)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent/5 transition-colors"
                      >
                        <div>
                          <span className="font-medium">{asset.name}</span>
                          {asset.ticker && (
                            <span className="ml-2 text-[11px] text-muted-foreground">{asset.ticker}</span>
                          )}
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {isYieldType
                            ? `${asset.yld?.toFixed(1) ?? "—"}% p.a.`
                            : `KES ${asset.price.toLocaleString()}`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <p className="text-[10px] text-muted-foreground mt-1">
                Or enter custom details below
              </p>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <Label className="text-xs">Custom Name</Label>
                  <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Asset name" />
                </div>
                <div>
                  <Label className="text-xs">Ticker</Label>
                  <Input value={customTicker} onChange={(e) => setCustomTicker(e.target.value)} placeholder="e.g. SCOM" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
              <div>
                <span className="font-medium text-sm">{selectedAsset.name}</span>
                {selectedAsset.ticker && (
                  <span className="ml-2 text-[11px] text-muted-foreground">{selectedAsset.ticker}</span>
                )}
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedAsset(null)}>
                Change
              </Button>
            </div>
          )}

          {/* Units & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{assetType === "mmf" ? "Principal (KES)" : "Units / Quantity"}</Label>
              <Input type="number" value={units} onChange={(e) => setUnits(e.target.value)} min="0" />
            </div>
            <div>
              <Label className="text-xs">Buy Price (KES)</Label>
              <Input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} min="0" />
            </div>
          </div>

          {isYieldType && (
            <div>
              <Label className="text-xs">Annual Yield (%)</Label>
              <Input type="number" value={yld} onChange={(e) => setYld(e.target.value)} min="0" step="0.1" />
            </div>
          )}

          <Button onClick={handleSubmit} disabled={isPending} className="w-full">
            {isPending ? "Adding…" : "Add to Portfolio"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddInvestmentModal;
