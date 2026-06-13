import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Briefcase, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePortfolio, type AssetType, type NewPortfolioItem } from "@/hooks/usePortfolio";
import { Link } from "react-router-dom";

type Variant = "default" | "outline" | "secondary" | "ghost";

interface Props {
  asset: NewPortfolioItem;
  /** UI variant for the trigger button */
  variant?: Variant;
  /** Override the principal/units label (e.g. "Principal (KES)" for MMFs) */
  amountLabel?: string;
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
  /** Show as compact icon-only on tight surfaces */
  compact?: boolean;
}

const isYieldAsset = (t: AssetType) => t === "mmf" || t === "fixed_income";

const AddToPortfolioButton = ({
  asset,
  variant = "outline",
  amountLabel,
  size = "sm",
  className,
  compact = false,
}: Props) => {
  const { addItem, isDemo } = usePortfolio();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>(String(asset.units || (isYieldAsset(asset.asset_type) ? 10_000 : 100)));
  const [justAdded, setJustAdded] = useState(false);

  const submit = () => {
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const isYield = isYieldAsset(asset.asset_type);
    addItem.mutate(
      {
        ...asset,
        // For MMFs the amount IS the principal; price stays as the principal.
        units: isYield ? 1 : n,
        buy_price: isYield ? n : asset.buy_price,
        current_price: isYield ? n : asset.current_price,
      },
      {
        onSuccess: () => {
          setJustAdded(true);
          setOpen(false);
          setTimeout(() => setJustAdded(false), 4000);
        },
      },
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`gap-1.5 ${className ?? ""}`}
          aria-label="Add to mock portfolio"
        >
          <Briefcase className="h-3.5 w-3.5" />
          {!compact && <span>Add to portfolio</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-primary">{asset.asset_name}</div>
            {asset.ticker && (
              <div className="text-[11px] text-muted-foreground">{asset.ticker}</div>
            )}
          </div>
          <div>
            <Label className="text-xs">
              {amountLabel ?? (isYieldAsset(asset.asset_type) ? "Principal (KES)" : "Units")}
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              min="0"
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>
          <Button onClick={submit} disabled={addItem.isPending} className="w-full" size="sm">
            {addItem.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Adding…
              </>
            ) : (
              "Add to mock portfolio"
            )}
          </Button>
          {justAdded && (
            <div className="text-[11px] text-accent flex items-center justify-between">
              <span>Added.</span>
              <Link to="/portfolio" className="underline">View portfolio →</Link>
            </div>
          )}
          {isDemo && (
            <p className="text-[10px] text-muted-foreground leading-snug">
              Saved on this device. Sign up to sync across devices.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AddToPortfolioButton;
