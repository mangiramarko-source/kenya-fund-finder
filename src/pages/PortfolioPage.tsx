import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePortfolio, type PortfolioItem, type AssetType } from "@/hooks/usePortfolio";
import { usePortfolioChanges } from "@/hooks/usePortfolioChanges";
import { usePortfolioMetrics } from "@/hooks/usePortfolioMetrics";
import { usePortfolioEvents } from "@/hooks/usePortfolioEvents";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Briefcase, RefreshCw, ShieldCheck, LineChart, Wallet, Wand2, Plus, ArrowRight, LayoutGrid, Table as TableIcon } from "lucide-react";
import PortfolioCharts from "@/components/portfolio/PortfolioCharts";
import PortfolioTable from "@/components/portfolio/PortfolioTable";
import AddInvestmentModal from "@/components/portfolio/AddInvestmentModal";
import EditHoldingModal from "@/components/portfolio/EditHoldingModal";
import PortfolioActivity from "@/components/portfolio/PortfolioActivity";
import SaveDemoBanner from "@/components/portfolio/SaveDemoBanner";
import WeightedYieldCard from "@/components/portfolio/WeightedYieldCard";
import MonthlyIncomeCard from "@/components/portfolio/MonthlyIncomeCard";
import LiquidityBreakdown from "@/components/portfolio/LiquidityBreakdown";
import PortfolioWeeklyChanges from "@/components/portfolio/PortfolioWeeklyChanges";
import CreateAlertDialog from "@/components/alerts/CreateAlertDialog";
import PortfolioSummaryModal from "@/components/portfolio/PortfolioSummaryModal";
import PortfolioHoldingCard from "@/components/portfolio/PortfolioHoldingCard";
import DesktopPortfolioHero from "@/components/portfolio/DesktopPortfolioHero";
import MobilePortfolioView from "@/components/portfolio/MobilePortfolioView";
import { supabase } from "@/integrations/supabase/client";
import { normalizeName } from "@/lib/assetMatch";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const CATEGORY_CHIPS: Array<{ key: "all" | AssetType; label: string }> = [
  { key: "all", label: "All" },
  { key: "mmf", label: "MMF" },
  { key: "stock", label: "Stocks" },
  { key: "fixed_income", label: "T-Bills" },
  { key: "fx", label: "FX" },
  { key: "commodity", label: "Commodities" },
];

const PortfolioPage = () => {
  useDocumentTitle(
    "Mock Portfolio – Track Investments in Kenya | Kenya Fund Finder",
    "Simulate and track a Kenyan investment portfolio across unit trusts, stocks, and FX. Compound returns, P&L, and asset allocation.",
    {
      title: "Mock Portfolio – Track Investments in Kenya",
      description: "Simulate and track a Kenyan investment portfolio across unit trusts, stocks, and FX with compounding returns.",
    }
  );
  const [currency, setCurrency] = useState<"KES" | "USD">("KES");
  const [activeCategory, setActiveCategory] = useState<"all" | AssetType>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const {
    items,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    totalValue,
    totalPnL,
    totalPnLPercent,
    allocation,
    isDemo,
  } = usePortfolio();

  const { user } = useAuth();
  const { changes, loading: changesLoading } = usePortfolioChanges(items);
  const metrics = usePortfolioMetrics(items);
  const { alerts } = usePriceAlerts();
  const { events: activityEvents, isLoading: activityLoading } = usePortfolioEvents(50);
  const [editItem, setEditItem] = useState<PortfolioItem | null>(null);
  const [backfillBusy, setBackfillBusy] = useState(false);

  const hasUnlinkedHoldings = useMemo(
    () => !!user && items.some((i) => !i.asset_id && (i.asset_type === "mmf" || i.asset_type === "stock")),
    [items, user],
  );

  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return items;
    return items.filter((i) => i.asset_type === activeCategory);
  }, [items, activeCategory]);

  const runBackfill = async () => {
    if (!user) return;
    setBackfillBusy(true);
    try {
      const { data, error } = await supabase.rpc("backfill_my_portfolio_asset_ids" as never);
      if (error) throw error;
      const d = (data as { scanned: number; updated: number; skipped: number } | null) ?? null;
      if (d) {
        toast.success(`Asset link refresh: ${d.updated} updated, ${d.skipped} skipped of ${d.scanned}.`);
      } else {
        toast.success("Asset link refresh complete.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not refresh asset links");
    } finally {
      setBackfillBusy(false);
    }
  };

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
    if (!item.asset_id) return;
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
    <>
      {/* Mobile View Only */}
      <div className="block md:hidden">
        <MobilePortfolioView currency={currency} setCurrency={setCurrency} />
      </div>

      {/* Desktop View Only */}
      <div className="hidden md:block px-4 md:px-6 py-6 space-y-6 max-w-7xl mx-auto">
        {/* Sync Indicator Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[#00A651]" /> Portfolio Tracker
            </h1>
            {lastSynced && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Synced {formatDistanceToNow(lastSynced, { addSuffix: true })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasUnlinkedHoldings && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
                onClick={runBackfill}
                disabled={backfillBusy}
                title="Try to link older holdings to canonical fund/stock data"
              >
                <Wand2 className="h-3.5 w-3.5" />
                {backfillBusy ? "Refreshing…" : "Refresh asset links"}
              </Button>
            )}
            {isDemo && (
              <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                <Link to="/auth">Save to account</Link>
              </Button>
            )}
          </div>
        </div>

        {isDemo && items.length > 0 && <SaveDemoBanner itemCount={items.length} />}

        {/* ─── 1. Desktop Total Value Hero Card ─── */}
        <DesktopPortfolioHero
          totalValue={totalValue}
          totalPnL={totalPnL}
          totalPnLPercent={totalPnLPercent}
          recentChangePct={recentChangePct}
          currency={currency}
          setCurrency={setCurrency}
          allocation={allocation}
          onOpenAddModal={() => setShowAddModal(true)}
          onOpenReportModal={() => setShowSummaryModal(true)}
        />

        {/* Empty State vs Full Portfolio */}
        {isEmpty ? (
          <Card className="border-border bg-gradient-to-br from-card to-muted/30 p-8">
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-primary leading-tight">
                  Build your investment portfolio in 30 seconds.
                </h2>
                <p className="text-sm text-muted-foreground">
                  Pick a starter pack or add Kenyan unit trusts, NSE stocks, T-Bills, FX and
                  commodities. We track live prices for you — no sign-up needed to try.
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2">
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-accent" /> 100% mock — no real money</span>
                  <span className="flex items-center gap-1.5"><LineChart className="h-3.5 w-3.5 text-accent" /> Live Kenyan market data</span>
                  <span className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5 text-accent" /> 5 asset classes</span>
                </div>
              </div>
              <div className="flex justify-center md:justify-end">
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="bg-[#00A651] hover:bg-[#008f45] text-white font-semibold rounded-full px-6 py-3 text-sm gap-2"
                >
                  <Plus className="h-4 w-4 stroke-[3]" /> Add Investment
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* ─── 2. Holdings Section Header & Filter Chips ─── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">
                    Holdings <span className="text-muted-foreground font-semibold text-sm">({filteredItems.length})</span>
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  {/* Category Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {CATEGORY_CHIPS.map((chip) => {
                      const isActive = activeCategory === chip.key;
                      return (
                        <button
                          key={chip.key}
                          onClick={() => setActiveCategory(chip.key)}
                          className={`whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#00A651] text-white shadow-xs"
                              : "bg-card border border-border/80 text-muted-foreground hover:text-foreground dark:bg-neutral-900 dark:border-white/10"
                          }`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* View Mode Toggle: Cards Grid vs Table */}
                  <div className="flex rounded-full border border-border overflow-hidden text-xs bg-muted/50 p-0.5">
                    <button
                      onClick={() => setViewMode("cards")}
                      className={`px-3 py-1 rounded-full font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                        viewMode === "cards" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Cards View"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" /> Cards
                    </button>
                    <button
                      onClick={() => setViewMode("table")}
                      className={`px-3 py-1 rounded-full font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                        viewMode === "table" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Table View"
                    >
                      <TableIcon className="h-3.5 w-3.5" /> Table
                    </button>
                  </div>
                </div>
              </div>

              {/* Holdings Grid or Table */}
              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map((item) => {
                    const itemChange = changes.find((c) => c.itemId === item.id);
                    return (
                      <PortfolioHoldingCard
                        key={item.id}
                        item={item}
                        currency={currency}
                        totalValue={totalValue}
                        change={itemChange}
                        onClick={(item) => setEditItem(item)}
                      />
                    );
                  })}

                  {/* Add Investment Dashed Card */}
                  <div
                    onClick={() => setShowAddModal(true)}
                    className="flex flex-col items-center justify-center gap-2 w-full min-h-[160px] bg-[#131316]/60 border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 hover:bg-[#131316] rounded-2xl p-4 text-center transition-all cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                      <Plus className="h-5 w-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                        Add Investment
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Track MMF, Stocks, T-Bills, FX
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <PortfolioTable
                      items={filteredItems}
                      currency={currency}
                      onDelete={(id) => deleteItem.mutate(id)}
                      onEdit={(item) => setEditItem(item)}
                      changes={changes}
                      alerts={alerts}
                      liquidityByName={liquidityByName}
                      liquidityById={liquidityById}
                      onOpenAlert={openAlertForHolding}
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ─── 3. Yield Metrics Row ─── */}
            {metrics.hasFunds && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
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

            {/* ─── 4. Allocation Charts & Analytics ─── */}
            <PortfolioCharts allocation={allocation} totalValue={totalValue} currency={currency} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LiquidityBreakdown items={items} />
              <PortfolioWeeklyChanges changes={changes} loading={changesLoading} />
            </div>

            {/* ─── 5. Activity Log ─── */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-sm font-semibold text-primary">Portfolio activity</CardTitle>
                <span className="text-xs text-muted-foreground">{activityEvents.length} events logged</span>
              </CardHeader>
              <CardContent>
                <PortfolioActivity
                  events={activityEvents}
                  isLoading={activityLoading}
                  currency={currency}
                />
              </CardContent>
            </Card>

            <p className="text-[11px] text-muted-foreground">
              This portfolio summary is based on user-entered holdings and available market/fund data. It is general information only and is not personal financial advice. Estimates assume 15% withholding tax on yield-bearing fund holdings; actual returns may differ.
            </p>
          </>
        )}

        {/* Controlled Modals */}
        <AddInvestmentModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          onAdd={(item) => {
            addItem.mutate(item);
            setShowAddModal(false);
          }}
          isPending={addItem.isPending}
        />

        <EditHoldingModal
          item={editItem}
          open={!!editItem}
          onOpenChange={(o) => { if (!o) setEditItem(null); }}
          onSave={(id, payload) => {
            updateItem.mutate(
              { id, patch: payload, note: payload.notes },
              { onSuccess: () => setEditItem(null) },
            );
          }}
          onDelete={(id) => {
            deleteItem.mutate(id, { onSuccess: () => setEditItem(null) });
          }}
          isPending={updateItem.isPending || deleteItem.isPending}
        />

        <PortfolioSummaryModal
          open={showSummaryModal}
          onOpenChange={setShowSummaryModal}
          currency={currency}
        />

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
    </>
  );
};

export default PortfolioPage;
