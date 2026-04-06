import { useState, useMemo } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import PortfolioKPICards from "@/components/portfolio/PortfolioKPICards";
import PortfolioCharts from "@/components/portfolio/PortfolioCharts";
import PortfolioTable from "@/components/portfolio/PortfolioTable";
import AddInvestmentModal from "@/components/portfolio/AddInvestmentModal";
import { formatDistanceToNow } from "date-fns";

const PortfolioPage = () => {
  useDocumentTitle("Mock Portfolio | KenyaFundFinder");
  const { user } = useAuth();
  const [currency, setCurrency] = useState<"KES" | "USD">("KES");
  const { items, isLoading, addItem, deleteItem, totalValue, totalPnL, totalPnLPercent, allocation } = usePortfolio();

  const lastSynced = useMemo(() => {
    if (!items.length) return null;
    const dates = items.map((i) => new Date(i.updated_at).getTime());
    return new Date(Math.max(...dates));
  }, [items]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <Briefcase className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold text-primary">Sign in to use the Mock Portfolio</h1>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Track mock investments across unit trusts, stocks, FX, bonds, and commodities — all in one dashboard.
        </p>
        <Button asChild>
          <Link to="/auth">Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Briefcase className="h-6 w-6" /> Mock Portfolio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Simulate investments across 5 asset classes with real Kenyan market data.
          </p>
          {lastSynced && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <RefreshCw className="h-3 w-3" />
              Prices synced {formatDistanceToNow(lastSynced, { addSuffix: true })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            <button
              onClick={() => setCurrency("KES")}
              className={`px-3 py-1.5 font-medium transition-colors ${currency === "KES" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              KES
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`px-3 py-1.5 font-medium transition-colors ${currency === "USD" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              USD
            </button>
          </div>
          <AddInvestmentModal onAdd={(item) => addItem.mutate(item)} isPending={addItem.isPending} />
        </div>
      </div>

      {/* KPI Cards */}
      <PortfolioKPICards
        totalValue={totalValue}
        totalPnL={totalPnL}
        totalPnLPercent={totalPnLPercent}
        currency={currency}
        fxRate={130}
      />

      {/* Charts */}
      <PortfolioCharts allocation={allocation} totalValue={totalValue} currency={currency} />

      {/* Asset Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-primary">Your Investments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <PortfolioTable items={items} currency={currency} onDelete={(id) => deleteItem.mutate(id)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioPage;
