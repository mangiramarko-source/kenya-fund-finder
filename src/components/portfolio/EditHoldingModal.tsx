import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Briefcase } from "lucide-react";
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

const cleanNum = (n: number | undefined | null) => {
  if (n == null || isNaN(n)) return "";
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 10000) / 10000);
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
    setUnits(cleanNum(item.units));
    setBuyPrice(cleanNum(item.buy_price));
    setYld(cleanNum(item.current_yield ?? 0));
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="pb-2 border-b border-border/50">
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[#00A651]" />
            Edit Holding
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-3">
          {/* Asset Info Banner */}
          <div className="rounded-2xl border border-border bg-muted/40 p-3.5 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-foreground">{item.asset_name}</div>
              {item.ticker && (
                <div className="text-xs text-muted-foreground font-mono mt-0.5">{item.ticker}</div>
              )}
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-500">
              {item.asset_type === "fixed_income" ? "T-BILLS" : item.asset_type.toUpperCase()}
            </span>
          </div>

          {isCustom && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Asset name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background border-border text-foreground rounded-xl focus:border-[#00A651] focus:ring-[#00A651]"
              />
              <p className="text-[10px] text-muted-foreground">
                Editable for custom holdings without a linked fund/stock.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {item.asset_type === "mmf" ? "Amount invested (KES)" : "Units / Quantity"}
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                min="0"
                step="any"
                className="bg-background border-border text-foreground rounded-xl font-medium focus:border-[#00A651] focus:ring-[#00A651]"
              />
              <p className="text-[10px] text-muted-foreground leading-tight">
                {item.asset_type === "mmf"
                  ? "Total money deposited."
                  : "Number of shares or units."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {item.asset_type === "mmf" ? "Reference price (per unit)" : "Buy price per unit (KES)"}
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                min="0"
                step="any"
                className="bg-background border-border text-foreground rounded-xl font-medium focus:border-[#00A651] focus:ring-[#00A651]"
              />
              <p className="text-[10px] text-muted-foreground leading-tight">
                {item.asset_type === "mmf"
                  ? "Usually 1.00 for unit trusts."
                  : "Price paid per share/unit."}
              </p>
            </div>
          </div>

          {isYieldType && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Annual yield (%)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={yld}
                onChange={(e) => setYld(e.target.value)}
                min="0"
                step="0.1"
                className="bg-background border-border text-foreground rounded-xl font-medium focus:border-[#00A651] focus:ring-[#00A651]"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Event date</Label>
            <Input
              type="date"
              value={buyDate}
              onChange={(e) => setBuyDate(e.target.value)}
              className="bg-background border-border text-foreground rounded-xl font-medium focus:border-[#00A651] focus:ring-[#00A651]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Note (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Topped up, adjusted units"
              className="bg-background border-border text-foreground rounded-xl focus:border-[#00A651] focus:ring-[#00A651]"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border/60">
            {onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
                Delete holding
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="rounded-xl border-border text-foreground hover:bg-muted font-medium"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isPending}
                className="bg-[#00A651] hover:bg-[#008f45] text-white font-bold rounded-xl shadow-sm px-4"
              >
                {isPending ? "Saving…" : "Update holding"}
              </Button>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Edits are recorded in your portfolio activity. General information only.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditHoldingModal;
