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
  <Card className="border-border bg-card">
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Estimated monthly income
        </span>
        <Coins className="h-4 w-4 text-primary" />
      </div>
      {hasFunds ? (
        <>
          <p className="text-2xl font-bold tabular-nums text-primary">
            {fmt(monthlyIncome, currency)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Estimate only. Assumes 15% withholding tax. Actual returns may differ.
          </p>
        </>
      ) : (
        <>
          <p className="text-2xl font-bold tabular-nums text-muted-foreground">—</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Add yield-bearing fund holdings to see this.
          </p>
        </>
      )}
    </CardContent>
  </Card>
);

export default MonthlyIncomeCard;
