import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentValue, type PortfolioItem } from "@/hooks/usePortfolio";

interface Props {
  items: PortfolioItem[];
}

interface Bucket {
  label: string;
  value: number;
}

const bucketFor = (days: number | null | undefined): string => {
  if (days == null) return "Not available";
  if (days <= 0) return "Same day / T+0";
  if (days <= 3) return "1–3 days";
  return "4+ days";
};

const ORDER = ["Same day / T+0", "1–3 days", "4+ days", "Not available"];

const LiquidityBreakdown = ({ items }: Props) => {
  const [withdrawalDays, setWithdrawalDays] = useState<Map<string, number | null>>(new Map());
  const fundItems = items.filter((i) => i.asset_type === "mmf");

  useEffect(() => {
    if (!fundItems.length) return;
    supabase
      .from("funds_public")
      .select("name, withdrawal_days")
      .in("name", fundItems.map((f) => f.asset_name))
      .then(({ data }) => {
        const m = new Map<string, number | null>();
        (data || []).forEach((r: any) => m.set(r.name, r.withdrawal_days ?? null));
        setWithdrawalDays(m);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fundItems.map((f) => f.asset_name).join("|")]);

  if (!fundItems.length) return null;

  const buckets = new Map<string, number>();
  ORDER.forEach((k) => buckets.set(k, 0));
  fundItems.forEach((i) => {
    const days = withdrawalDays.get(i.asset_name);
    const key = bucketFor(days);
    buckets.set(key, (buckets.get(key) || 0) + getCurrentValue(i));
  });

  const total = Array.from(buckets.values()).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
          <Droplets className="h-4 w-4" /> Liquidity breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {ORDER.map((label) => {
          const v = buckets.get(label) || 0;
          const pct = total > 0 ? (v / total) * 100 : 0;
          return (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{label}</span>
                <span className="tabular-nums font-medium">{pct.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        <p className="text-[11px] text-muted-foreground pt-1">
          Based on fund-reported withdrawal period. Subject to fund terms.
        </p>
      </CardContent>
    </Card>
  );
};

export default LiquidityBreakdown;
