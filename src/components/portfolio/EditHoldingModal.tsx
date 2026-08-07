import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Briefcase, Calendar, X } from "lucide-react";
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

  const initials = item.asset_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || item.asset_name.slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto bg-card text-card-foreground border-border rounded-3xl p-5 sm:p-6 shadow-2xl [&>button]:hidden">
        {/* Top Handle Pill */}
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto -mt-1 mb-3" />

        {/* Dialog Header with Briefcase Icon and Custom Close X */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Edit Holding</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 pt-1">
          {/* Asset Info Banner */}
          <div className="rounded-2xl border border-border/80 bg-muted/40 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-foreground truncate">{item.asset_name}</div>
                <div className="text-[11px] text-muted-foreground font-mono truncate">
                  {item.ticker || item.asset_name.toLowerCase().replace(/\s+/g, "-")}
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-500 shrink-0">
              {item.asset_type === "fixed_income" ? "T-BILLS" : item.asset_type.toUpperCase()}
            </span>
          </div>

          {isCustom && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Asset name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 bg-background border-border text-foreground font-medium rounded-2xl px-4 focus:border-emerald-500 focus:ring-emerald-500"
              />
              <p className="text-xs text-muted-foreground/80 font-normal">
                Editable for custom holdings without a linked fund/stock.
              </p>
            </div>
          )}

          {/* Amount invested / Units */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              {item.asset_type === "mmf" ? "Amount invested" : "Units / Quantity"}
            </Label>
            <div className="relative flex items-center">
              {item.asset_type === "mmf" && (
                <span className="absolute left-4 text-xs font-bold text-muted-foreground pointer-events-none">
                  KES
                </span>
              )}
              <Input
                type="number"
                inputMode="decimal"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                min="0"
                step="any"
                className={`h-12 bg-background border-border text-foreground font-bold text-base rounded-2xl ${
                  item.asset_type === "mmf" ? "pl-14" : "px-4"
                } focus:border-emerald-500 focus:ring-emerald-500`}
              />
            </div>
            <p className="text-xs text-muted-foreground/80 font-normal">
              {item.asset_type === "mmf" ? "Total money deposited." : "Number of shares or units you hold."}
            </p>
          </div>

          {/* Reference price + Annual yield */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {item.asset_type === "mmf" ? "Reference price" : "Buy price per unit"}
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                min="0"
                step="any"
                className="h-12 bg-background border-border text-foreground font-bold text-sm rounded-2xl px-4 focus:border-emerald-500 focus:ring-emerald-500"
              />
              <p className="text-xs text-muted-foreground/80 font-normal">
                {item.asset_type === "mmf" ? "Per unit, usually 1.00." : "Price paid per share/unit."}
              </p>
            </div>

            {isYieldType && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Annual yield</Label>
                <div className="relative flex items-center">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={yld}
                    onChange={(e) => setYld(e.target.value)}
                    min="0"
                    step="0.1"
                    className="h-12 bg-background border-border text-foreground font-bold text-sm rounded-2xl pl-4 pr-10 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="absolute right-4 text-xs font-bold text-emerald-500 pointer-events-none">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/80 font-normal">Quoted by the fund.</p>
              </div>
            )}
          </div>

          {/* Event date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Event date</Label>
            <div className="relative flex items-center">
              <Calendar className="absolute left-4 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                className="h-12 bg-background border-border text-foreground font-semibold text-sm rounded-2xl pl-11 pr-4 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Note (optional) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Note (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2.5}
              placeholder="e.g. Topped up, adjusted units"
              className="bg-background border-border text-foreground text-sm rounded-2xl p-3.5 focus:border-emerald-500 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-2 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-12 rounded-full border-border bg-muted/60 hover:bg-muted text-foreground font-semibold text-sm transition-all"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="h-12 rounded-full bg-[#10B981] hover:bg-emerald-500 text-black font-extrabold text-sm shadow-md shadow-emerald-500/20 transition-all"
              >
                {isPending ? "Saving…" : "Update holding"}
              </Button>
            </div>

            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-rose-500 hover:text-rose-400 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                Delete holding
              </button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed px-2">
            Edits are recorded in your portfolio activity. General information only.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditHoldingModal;
