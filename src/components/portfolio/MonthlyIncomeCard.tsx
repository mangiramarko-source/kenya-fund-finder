import { Card, CardContent } from "@/components/ui/card";
import { Coins } from "lucide-react";

interface Props {
  monthlyIncome: number;
  currency: "KES" | "USD";
  hasFunds: boolean;
}

const fmt = (val: number, currency: "KES" | "USD") => {
  const v = currency === "USD" ? val / 130 : val;
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
};

const MonthlyIncomeCard = ({ monthlyIncome, currency, hasFunds }: Props) => (
  <Card className="rounded-[22px] border-border/80 bg-card shadow-sm">
    <CardContent className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Estimated monthly income
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Coins className="h-4 w-4" />
        </span>
      </div>
      {hasFunds ? (
        <>
          <p className="text-3xl font-bold tracking-tight tabular-nums text-primary">
            {fmt(monthlyIncome, currency)}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Estimate only. Assumes 15% withholding tax. Actual returns may differ.
          </p>
        </>
      ) : (
        <>
          <p className="text-3xl font-bold tracking-tight tabular-nums text-muted-foreground">—</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Add yield-bearing fund holdings to see this.
          </p>
        </>
      )}
    </CardContent>
  </Card>
);

export default MonthlyIncomeCard;
