import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { AssetType, ASSET_TYPE_LABELS, NewPortfolioItem } from "@/hooks/usePortfolio";

const PRESETS: Record<AssetType, { name: string; ticker?: string; price: number; yld?: number }[]> = {
  mmf: [
    { name: "Cytonn Money Market Fund", price: 1, yld: 17.6 },
    { name: "Etica Money Market Fund", price: 1, yld: 15.8 },
    { name: "GenCap Hela Imara", price: 1, yld: 15 },
  ],
  stock: [
    { name: "Safaricom PLC", ticker: "SCOM", price: 27.6 },
    { name: "Equity Group", ticker: "EQTY", price: 69 },
    { name: "KCB Group", ticker: "KCB", price: 44.5 },
  ],
  fx: [
    { name: "KES / USD", ticker: "KES/USD", price: 130 },
    { name: "KES / GBP", ticker: "KES/GBP", price: 165 },
    { name: "KES / EUR", ticker: "KES/EUR", price: 142 },
  ],
  fixed_income: [
    { name: "91-Day T-Bill", price: 100, yld: 15.8 },
    { name: "182-Day T-Bill", price: 100, yld: 16.2 },
    { name: "364-Day T-Bill", price: 100, yld: 16.5 },
  ],
  commodity: [
    { name: "Gold (per gram)", ticker: "XAU", price: 19500 },
    { name: "Silver (per gram)", ticker: "XAG", price: 250 },
  ],
};

interface Props {
  onAdd: (item: NewPortfolioItem) => void;
  isPending: boolean;
}

const AddInvestmentModal = ({ onAdd, isPending }: Props) => {
  const [open, setOpen] = useState(false);
  const [assetType, setAssetType] = useState<AssetType>("mmf");
  const [preset, setPreset] = useState("");
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [units, setUnits] = useState("1");
  const [buyPrice, setBuyPrice] = useState("");
  const [yld, setYld] = useState("15");

  const resetForm = () => {
    setPreset(""); setName(""); setTicker(""); setUnits("1"); setBuyPrice(""); setYld("15");
  };

  const handlePresetChange = (val: string) => {
    setPreset(val);
    const found = PRESETS[assetType]?.find((p) => p.name === val);
    if (found) {
      setName(found.name);
      setTicker(found.ticker || "");
      setBuyPrice(String(found.price));
      if (found.yld) setYld(String(found.yld));
    }
  };

  const handleSubmit = () => {
    const u = parseFloat(units);
    const bp = parseFloat(buyPrice);
    if (!name || isNaN(u) || isNaN(bp) || u <= 0 || bp <= 0) return;
    onAdd({
      asset_type: assetType,
      asset_name: name,
      ticker: ticker || undefined,
      units: u,
      buy_price: bp,
      current_price: bp,
      current_yield: parseFloat(yld) || 0,
    });
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add Investment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary">Add Mock Investment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
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
          <div>
            <Label className="text-xs">Quick Pick</Label>
            <Select value={preset} onValueChange={handlePresetChange}>
              <SelectTrigger><SelectValue placeholder="Select a preset…" /></SelectTrigger>
              <SelectContent>
                {PRESETS[assetType].map((p) => (
                  <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Asset name" />
            </div>
            <div>
              <Label className="text-xs">Ticker</Label>
              <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="e.g. SCOM" />
            </div>
          </div>
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
          {(assetType === "mmf" || assetType === "fixed_income") && (
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
