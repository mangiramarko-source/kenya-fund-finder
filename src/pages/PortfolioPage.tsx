import { useState, useMemo } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, RefreshCw, ShieldCheck, LineChart, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import PortfolioKPICards from "@/components/portfolio/PortfolioKPICards";
import PortfolioCharts from "@/components/portfolio/PortfolioCharts";
import PortfolioTable from "@/components/portfolio/PortfolioTable";
import AddInvestmentModal from "@/components/portfolio/AddInvestmentModal";
import StarterPortfolios from "@/components/portfolio/StarterPortfolios";
import SaveDemoBanner from "@/components/portfolio/SaveDemoBanner";
import { formatDistanceToNow } from "date-fns";

const PortfolioPage = () => {
  useDocumentTitle("Mock Portfolio – Track Investments in Kenya | KenyaFundFinder");
  const [currency, setCurrency] = useState<"KES" | "USD">("KES");
  const {
    items,
    isLoading,
    addItem,
    deleteItem,
    totalValue,
    totalPnL,
    totalPnLPercent,
    allocation,
    isDemo,
  } = usePortfolio();

  const lastSynced = useMemo(() => {
    if (!items.length) return null;
    const dates = items.map((i) => new Date(i.updated_at).getTime());
    return new Date(Math.max(...dates));
  }, [items]);

  const isEmpty = !isLoading && items.length === 0;

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

      {isDemo && items.length > 0 && <SaveDemoBanner itemCount={items.length} />}

      {isEmpty ? (
        <>
          {/* Empty-state hero */}
          <Card className="border-border bg-gradient-to-br from-card to-muted/30 p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold text-primary leading-tight">
                  Build your investment portfolio in 30 seconds.
                </h2>
                <p className="text-sm text-muted-foreground">
                  Pick a starter pack below or add real Kenyan unit trusts, NSE stocks, T-Bills, FX and
                  commodities. We track live prices for you — no sign-up needed to try.
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2">
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-accent" /> 100% mock — no real money</span>
                  <span className="flex items-center gap-1.5"><LineChart className="h-3.5 w-3.5 text-accent" /> Live Kenyan market data</span>
                  <span className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5 text-accent" /> 5 asset classes</span>
                </div>
                {isDemo && (
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Playing in demo mode — your portfolio is saved on this device.{" "}
                    <Link to="/auth" className="underline">Sign up</Link> to sync across devices.
                  </p>
                )}
              </div>
              <div className="flex justify-center md:justify-end">
                <AddInvestmentModal onAdd={(item) => addItem.mutate(item)} isPending={addItem.isPending} />
              </div>
            </div>
          </Card>

          <StarterPortfolios />
        </>
      ) : (
        <>
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
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-primary">Your Investments</CardTitle>
              {isDemo && (
                <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                  <Link to="/auth">Save to account</Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
              ) : (
                <PortfolioTable items={items} currency={currency} onDelete={(id) => deleteItem.mutate(id)} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default PortfolioPage;
