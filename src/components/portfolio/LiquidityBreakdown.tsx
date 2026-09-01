import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentValue, type PortfolioItem } from "@/hooks/usePortfolio";
import { normalizeName } from "@/lib/assetMatch";

interface Props {
  items: PortfolioItem[];
  variant?: "default" | "dashboard";
}

const bucketFor = (days: number | null | undefined): string => {
  if (days == null) return "Not available";
  if (days <= 0) return "Same day / T+0";
  if (days <= 3) return "1–3 days";
  return "4+ days";
};

const ORDER = ["Same day / T+0", "1–3 days", "4+ days", "Not available"];

const LiquidityBreakdown = ({ items, variant = "default" }: Props) => {
  const [byNormName, setByNormName] = useState<Map<string, number | null>>(new Map());
  const [byId, setById] = useState<Map<string, number | null>>(new Map());
  const fundItems = items.filter((i) => i.asset_type === "mmf");

  useEffect(() => {
    if (!fundItems.length) return;
    supabase
      .from("funds_public")
      .select("id, name, withdrawal_days")
      .eq("is_published", true)
      .then(({ data }) => {
        const m = new Map<string, number | null>();
        const idMap = new Map<string, number | null>();
        (data || []).forEach((r) => {
          const key = normalizeName(r.name);
          if (key) m.set(key, r.withdrawal_days ?? null);
          if (r.id) idMap.set(r.id, r.withdrawal_days ?? null);
        });
        setByNormName(m);
        setById(idMap);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fundItems.map((f) => f.asset_id ?? f.asset_name).join("|")]);

  if (!fundItems.length) return null;

  const buckets = new Map<string, number>();
  ORDER.forEach((k) => buckets.set(k, 0));
  fundItems.forEach((i) => {
    const days =
      (i.asset_id ? byId.get(i.asset_id) : undefined) ??
      byNormName.get(normalizeName(i.asset_name));
    const key = bucketFor(days);
    buckets.set(key, (buckets.get(key) || 0) + getCurrentValue(i));
  });

  const total = Array.from(buckets.values()).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <Card className={variant === "dashboard" ? "rounded-[22px] border-border/80 bg-card shadow-sm" : "border-border bg-card"}>
      <CardHeader className={variant === "dashboard" ? "px-5 pb-1 pt-5" : "pb-2"}>
        <CardTitle className={variant === "dashboard" ? "flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground" : "flex items-center gap-2 text-sm font-semibold text-primary"}>
          <Droplets className="h-4 w-4" /> Liquidity breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className={variant === "dashboard" ? "space-y-3 px-5 pb-5 pt-3" : "space-y-2.5"}>
        {ORDER.map((label) => {
          const v = buckets.get(label) || 0;
          const pct = total > 0 ? (v / total) * 100 : 0;
          return (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{label}</span>
                <span className="tabular-nums font-medium">{pct.toFixed(1)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        <p className="pt-1 text-[11px] leading-5 text-muted-foreground">
          Based on fund-reported withdrawal period. Subject to fund terms.
        </p>
      </CardContent>
    </Card>
  );
};

export default LiquidityBreakdown;
