import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import type { PortfolioItem } from "@/hooks/usePortfolio";

export interface EditHoldingPayload {
  units: number;
  buy_price: number;
  current_yield?: number;
  notes: string;
  buy_date: string;
  asset_name: string;
}

interface Props {
  item: PortfolioItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, payload: EditHoldingPayload) => void;
  onDelete?: (id: string) => void;
  isPending?: boolean;
}

const toDateInput = (iso: string) => {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const EditHoldingModal = ({ item, open, onOpenChange, onSave, onDelete, isPending }: Props) => {
  const [units, setUnits] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [yld, setYld] = useState("");
  const [notes, setNotes] = useState("");
  const [buyDate, setBuyDate] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (!item) return;
    setUnits(String(item.units));
    setBuyPrice(String(item.buy_price));
    setYld(String(item.current_yield ?? 0));
    setNotes(item.notes ?? "");
    setBuyDate(toDateInput(item.buy_date));
    setName(item.asset_name);
  }, [item]);

  if (!item) return null;
  const isYieldType = item.asset_type === "mmf" || item.asset_type === "fixed_income";
  const isCustom = !item.asset_id; // only allow renaming when no canonical link

  const handleSave = () => {
    const u = parseFloat(units);
    const bp = parseFloat(buyPrice);
    if (isNaN(u) || isNaN(bp) || u <= 0 || bp <= 0) return;
    onSave(item.id, {
      units: u,
      buy_price: bp,
      current_yield: isYieldType ? parseFloat(yld) || 0 : item.current_yield,
      notes,
      buy_date: new Date(buyDate).toISOString(),
      asset_name: isCustom && name.trim() ? name.trim() : item.asset_name,
    });
  };

  const handleDelete = () => {
    if (!item || !onDelete) return;
    onDelete(item.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary">Edit holding</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
            <div className="font-medium text-sm text-foreground">{item.asset_name}</div>
            {item.ticker && <div className="text-muted-foreground">{item.ticker}</div>}
          </div>

          {isCustom && (
            <div>
              <Label className="text-xs">Asset name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
              <p className="text-[10px] text-muted-foreground mt-1">
                Editable for custom holdings without a linked fund/stock.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">
                {item.asset_type === "mmf" ? "Amount invested (KES)" : "Units / Quantity"}
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                min="0"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {item.asset_type === "mmf"
                  ? "Total money you deposited into this fund."
                  : "Number of shares or units you hold."}
              </p>
            </div>
            <div>
              <Label className="text-xs">
                {item.asset_type === "mmf" ? "Reference price (per unit)" : "Buy price per unit (KES)"}
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                min="0"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {item.asset_type === "mmf"
                  ? "Usually 1.00 for unit trusts — leave as is if unsure."
                  : "Price you paid per share/unit on the buy date."}
              </p>
            </div>
          </div>

          {isYieldType && (
            <div>
              <Label className="text-xs">Annual yield (%)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={yld}
                onChange={(e) => setYld(e.target.value)}
                min="0"
                step="0.1"
              />
            </div>
          )}

          <div>
            <Label className="text-xs">Event date</Label>
            <Input
              type="date"
              value={buyDate}
              onChange={(e) => setBuyDate(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs">Note (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Topped up, adjusted units"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            {onDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="bg-rose-600/90 hover:bg-rose-700 text-white gap-1.5 text-xs font-semibold px-3"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete holding
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isPending}
                className="bg-[#00A651] hover:bg-[#008f45] text-white font-semibold"
              >
                {isPending ? "Saving…" : "Update holding"}
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Edits are recorded in your portfolio activity. This is general information only and is not personal financial advice.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditHoldingModal;
