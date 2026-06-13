import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { usePortfolio, type PortfolioItem } from "@/hooks/usePortfolio";
import { usePortfolioChanges } from "@/hooks/usePortfolioChanges";
import { usePortfolioMetrics } from "@/hooks/usePortfolioMetrics";
import { usePortfolioEvents } from "@/hooks/usePortfolioEvents";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Briefcase, RefreshCw, ShieldCheck, LineChart, Wallet, FileText, Wand2 } from "lucide-react";
import PortfolioKPICards from "@/components/portfolio/PortfolioKPICards";
import PortfolioCharts from "@/components/portfolio/PortfolioCharts";
import PortfolioTable from "@/components/portfolio/PortfolioTable";
import AddInvestmentModal from "@/components/portfolio/AddInvestmentModal";
import EditHoldingModal from "@/components/portfolio/EditHoldingModal";
import PortfolioActivity from "@/components/portfolio/PortfolioActivity";
import StarterPortfolios from "@/components/portfolio/StarterPortfolios";
import SaveDemoBanner from "@/components/portfolio/SaveDemoBanner";
import WeightedYieldCard from "@/components/portfolio/WeightedYieldCard";
import MonthlyIncomeCard from "@/components/portfolio/MonthlyIncomeCard";
import LiquidityBreakdown from "@/components/portfolio/LiquidityBreakdown";
import PortfolioWeeklyChanges from "@/components/portfolio/PortfolioWeeklyChanges";
import CreateAlertDialog from "@/components/alerts/CreateAlertDialog";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { normalizeName } from "@/lib/assetMatch";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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

  const { changes, loading: changesLoading } = usePortfolioChanges(items);
  const metrics = usePortfolioMetrics(items);
  const { alerts } = usePriceAlerts();

  // Fetch withdrawal_days once for all funds — used by the holdings table for liquidity bucket display.
  const [liquidityByName, setLiquidityByName] = useState<Map<string, number | null>>(new Map());
  const [liquidityById, setLiquidityById] = useState<Map<string, number | null>>(new Map());
  useEffect(() => {
    if (!items.some((i) => i.asset_type === "mmf")) return;
    supabase
      .from("funds_public")
      .select("id, name, withdrawal_days")
      .eq("is_published", true)
      .then(({ data }) => {
        const m = new Map<string, number | null>();
        const idMap = new Map<string, number | null>();
        (data || []).forEach((r: any) => {
          const key = normalizeName(r.name);
          if (key) m.set(key, r.withdrawal_days ?? null);
          if (r.id) idMap.set(r.id, r.withdrawal_days ?? null);
        });
        setLiquidityByName(m);
        setLiquidityById(idMap);
      });
  }, [items.map((i) => i.id).join("|")]);

  const [alertDialog, setAlertDialog] = useState<{
    assetType: "fund" | "stock";
    assetId: string;
    assetName: string;
    currentPrice: number;
    unit: string;
  } | null>(null);

  const openAlertForHolding = (item: PortfolioItem) => {
    if (!item.asset_id) return; // need a canonical id to create an alert
    if (item.asset_type === "mmf") {
      setAlertDialog({
        assetType: "fund",
        assetId: item.asset_id,
        assetName: item.asset_name,
        currentPrice: item.current_yield || 0,
        unit: "%",
      });
    } else if (item.asset_type === "stock") {
      setAlertDialog({
        assetType: "stock",
        assetId: item.asset_id,
        assetName: item.asset_name,
        currentPrice: item.current_price,
        unit: "KES",
      });
    }
  };

  const recentChangePct = useMemo(() => {
    const valid = changes.filter((c) => c.deltaPct != null);
    if (!valid.length) return null;
    return valid.reduce((s, c) => s + (c.deltaPct || 0), 0) / valid.length;
  }, [changes]);

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
            Track your holdings across 5 asset classes with neutral Kenyan market data.
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
          {!isEmpty && (
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs h-9">
              <Link to="/portfolio/summary">
                <FileText className="h-3.5 w-3.5" /> Summary
              </Link>
            </Button>
          )}
          <AddInvestmentModal onAdd={(item) => addItem.mutate(item)} isPending={addItem.isPending} />
        </div>
      </div>

      {isDemo && items.length > 0 && <SaveDemoBanner itemCount={items.length} />}

      {isEmpty ? (
        <>
          <Card className="border-border bg-gradient-to-br from-card to-muted/30 p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold text-primary leading-tight">
                  Build your investment portfolio in 30 seconds.
                </h2>
                <p className="text-sm text-muted-foreground">
                  Pick a starter pack below or add Kenyan unit trusts, NSE stocks, T-Bills, FX and
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
          <PortfolioKPICards
            totalValue={totalValue}
            totalPnL={totalPnL}
            totalPnLPercent={totalPnLPercent}
            currency={currency}
            recentChangePct={recentChangePct}
          />

          {/* Yield metrics row */}
          {metrics.hasFunds && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <WeightedYieldCard
                weightedAvgYield={metrics.weightedAvgYield}
                hasFunds={metrics.hasFunds}
              />
              <MonthlyIncomeCard
                monthlyIncome={metrics.monthlyIncome}
                currency={currency}
                hasFunds={metrics.hasFunds}
              />
            </div>
          )}

          <PortfolioCharts allocation={allocation} totalValue={totalValue} currency={currency} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LiquidityBreakdown items={items} />
            <PortfolioWeeklyChanges changes={changes} loading={changesLoading} />
          </div>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-primary">Your investments</CardTitle>
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
                <PortfolioTable
                  items={items}
                  currency={currency}
                  onDelete={(id) => deleteItem.mutate(id)}
                  changes={changes}
                  alerts={alerts}
                  liquidityByName={liquidityByName}
                  liquidityById={liquidityById}
                  onOpenAlert={openAlertForHolding}
                />
              )}
            </CardContent>
          </Card>

          <p className="text-[11px] text-muted-foreground">
            This portfolio summary is based on user-entered holdings and available market/fund data. It is general information only and is not personal financial advice. Estimates assume 15% withholding tax on yield-bearing fund holdings; actual returns may differ.
          </p>
        </>
      )}

      {alertDialog && (
        <CreateAlertDialog
          open
          onOpenChange={(o) => { if (!o) setAlertDialog(null); }}
          assetType={alertDialog.assetType}
          assetId={alertDialog.assetId}
          assetName={alertDialog.assetName}
          currentPrice={alertDialog.currentPrice}
          unit={alertDialog.unit}
        />
      )}
    </div>
  );
};

export default PortfolioPage;
