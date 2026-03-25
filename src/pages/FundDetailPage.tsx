import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, ExternalLink, Calculator, BarChart3, Plus, Check, Shield, Clock, Wallet, TrendingUp, Info, ChevronRight, PiggyBank, CalendarDays, GitCompareArrows, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchFundBySlug, fetchFunds, fetchHistoricalYields, fetchFundSnapshots, type FundFromDB, type HistoricalYield, type YieldSnapshot } from "@/lib/api";
import { getDisclaimer } from "@/lib/disclaimers";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import AuthGate from "@/components/AuthGate";
import YieldChange, { formatYield } from "@/components/YieldChange";


const FUND_TYPE_LABELS: Record<string, string> = {
  money_market: "Money Market",
  fixed_income: "Fixed Income",
  balanced: "Balanced",
  equity: "Equity",
  bond: "Bond",
};

const WITHHOLDING_TAX_RATE = 0.15;

function calculateReturns(amount: number, yield_: number, months: number, monthly: number, compound: boolean, fee: number) {
  const rate = yield_ / 100;
  const monthlyRate = rate / 12;
  let totalGross = amount;
  let totalNet = amount;

  for (let m = 1; m <= months; m++) {
    const grossInterest = compound ? totalGross * monthlyRate : amount * monthlyRate;
    totalGross += grossInterest + monthly;
    const tax = grossInterest * WITHHOLDING_TAX_RATE;
    totalNet += (grossInterest - tax) + monthly;
  }

  const totalContributions = amount + monthly * months;
  const grossEarnings = Math.round(totalGross - totalContributions);
  const netEarnings = Math.round(totalNet - totalContributions);
  const managementFeeCost = Math.round(((totalGross + amount) / 2) * (fee / 100) * (months / 12));
  const finalValue = Math.round(totalNet - managementFeeCost);

  return {
    totalContributions,
    grossEarnings,
    totalTax: grossEarnings - netEarnings,
    managementFeeCost,
    netEarnings: netEarnings - managementFeeCost,
    finalValue,
  };
}

const formatKES = (n: number) => `KES ${n.toLocaleString()}`;

const FundDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [fund, setFund] = useState<FundFromDB | null>(null);
  const [peers, setPeers] = useState<FundFromDB[]>([]);
  const [comparePeerId, setComparePeerId] = useState<string>("");
  const [yields, setYields] = useState<HistoricalYield[]>([]);
  const [snapshots, setSnapshots] = useState<YieldSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculator state
  const [calcAmount, setCalcAmount] = useState(100000);
  const [calcMonths, setCalcMonths] = useState(12);
  const [calcMonthly, setCalcMonthly] = useState(0);
  const [calcCompound, setCalcCompound] = useState(true);

  useDocumentTitle(
    fund ? `${fund.name} – Money Market Fund Details` : "Fund Details",
    fund ? `${fund.name} by ${fund.manager}. Annual rate: ${fund.annual_yield}%. Compare MMFs in Kenya.` : undefined,
    fund ? {
      title: `${fund.name} – ${fund.annual_yield}% Annual Rate`,
      description: `${fund.name} by ${fund.manager}. Annual rate: ${fund.annual_yield}%. Min investment: KES ${fund.minimum_investment.toLocaleString()}.`,
      type: "article",
    } : undefined
  );

  useJsonLd(fund ? {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: fund.name,
    description: fund.description,
    provider: { "@type": "Organization", name: fund.manager },
    url: `https://kenyafundfinder.com/compare/${fund.slug}`,
    interestRate: { "@type": "QuantitativeValue", value: fund.annual_yield, unitText: "percent per annum" },
    feesAndCommissionsSpecification: `Management fee: ${fund.management_fee}%`,
  } : null);

  useJsonLd(fund ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://kenyafundfinder.com/" },
      { "@type": "ListItem", position: 2, name: "Unit Trusts", item: "https://kenyafundfinder.com/funds" },
      { "@type": "ListItem", position: 3, name: fund.name, item: `https://kenyafundfinder.com/compare/${fund.slug}` },
    ],
  } : null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchFundBySlug(id),
      fetchFunds(),
    ]).then(async ([f, allFunds]) => {
      setFund(f);
      if (f) {
        setPeers(allFunds.filter((p) => p.fund_type === f.fund_type && p.id !== f.id));
        const [y, s] = await Promise.all([
          fetchHistoricalYields(f.id),
          fetchFundSnapshots(f.id),
        ]);
        setYields(y);
        setSnapshots(s);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const peerStats = useMemo(() => {
    if (!fund || peers.length === 0) return null;
    const allInCategory = [fund, ...peers];
    const yields = allInCategory.map((f) => f.annual_yield);
    const fees = allInCategory.map((f) => f.management_fee);
    const rank = yields.filter((y) => y > fund.annual_yield).length + 1;
    return {
      rank,
      total: allInCategory.length,
      avgYield: yields.reduce((a, b) => a + b, 0) / yields.length,
      maxYield: Math.max(...yields),
      minYield: Math.min(...yields),
      avgFee: fees.reduce((a, b) => a + b, 0) / fees.length,
      percentile: Math.round(((allInCategory.length - rank) / (allInCategory.length - 1)) * 100),
    };
  }, [fund, peers]);

  const calcResults = useMemo(() => {
    if (!fund) return null;
    return calculateReturns(calcAmount, fund.annual_yield, calcMonths, calcMonthly, calcCompound, fund.management_fee);
  }, [fund, calcAmount, calcMonths, calcMonthly, calcCompound]);

  if (loading || authLoading) {
    return (
      <div className="container py-20 text-center text-muted-foreground">
        <div className="animate-pulse space-y-4 max-w-3xl mx-auto">
          <div className="h-6 bg-muted rounded w-48" />
          <div className="h-10 bg-muted rounded w-80" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Fund Not Found</h1>
        <Button asChild variant="outline"><Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Funds</Link></Button>
      </div>
    );
  }

  const isAuthenticated = !!user;
  const prevSnapshot = snapshots.length > 0 ? snapshots[0] : undefined;
  const comparePeer = peers.find((p) => p.id === comparePeerId) || null;

  const chartData = snapshots.length >= 1
    ? (() => {
        const data = [...snapshots].reverse().map((s) => ({
          date: new Date(s.snapshot_date).toLocaleDateString("en-KE", { day: "numeric", month: "short" }),
          rate: Number(s.annual_yield),
        }));
        const lastSnap = snapshots[0];
        if (lastSnap && Number(lastSnap.annual_yield) !== fund.annual_yield) {
          data.push({ date: "Today", rate: fund.annual_yield });
        }
        return data.length > 1 ? data : null;
      })()
    : null;

  return (
    <div className="container py-4 sm:py-8 max-w-5xl">
      {/* Breadcrumb navigation */}
      <nav className="flex items-center gap-3 mb-4 py-2">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
        <Link to="/funds" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Unit Trusts</Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
        <span className="text-sm text-foreground font-semibold truncate max-w-[200px]">{fund.name}</span>
      </nav>


      {/* Fund header */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider rounded-lg">
                {FUND_TYPE_LABELS[fund.fund_type] || fund.fund_type}
              </Badge>
              {fund.cma_licensed && (
                <Badge variant="outline" className="text-[10px] gap-1 rounded-lg border-accent/30 text-accent">
                  <Shield className="h-3 w-3" /> CMA Regulated
                </Badge>
              )}
            </div>
            <h2 className="text-lg md:text-xl font-bold leading-tight">{fund.name}</h2>
            <p className="text-muted-foreground text-sm">{fund.manager}</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1 tabular-nums">
              Updated {new Date(fund.updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          {/* No header compare button - compare is now inline below */}
        </div>
      </div>

      {/* Key metrics - always visible */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <MetricCard
          label="Annual Rate"
          value={formatYield(fund.annual_yield, fund.yield_unit)}
          change={prevSnapshot ? <YieldChange current={fund.annual_yield} previous={prevSnapshot.annual_yield} unit={fund.yield_unit} className="text-xs" /> : undefined}
          accent
          rank={peerStats ? `#${peerStats.rank} of ${peerStats.total}` : undefined}
        />
        <MetricCard
          label="Daily Yield"
          value={formatYield(fund.daily_yield, fund.yield_unit)}
          change={prevSnapshot ? <YieldChange current={fund.daily_yield} previous={prevSnapshot.daily_yield} unit={fund.yield_unit} className="text-xs" /> : undefined}
          accent
        />
        <MetricCard
          label="Min. Investment"
          value={`KES ${fund.minimum_investment.toLocaleString()}`}
          icon={<Wallet className="h-4 w-4" />}
        />
        <MetricCard
          label="Management Fee"
          value={`${fund.management_fee}%`}
          subtext={peerStats ? `Avg: ${peerStats.avgFee.toFixed(2)}%` : undefined}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {isAuthenticated ? (
        <Tabs defaultValue="chart" className="space-y-4">
          <TabsList className="h-9">
            <TabsTrigger value="chart" className="text-xs gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Rate History
            </TabsTrigger>
            <TabsTrigger value="calculator" className="text-xs gap-1.5">
              <Calculator className="h-3.5 w-3.5" /> Calculator
            </TabsTrigger>
            <TabsTrigger value="details" className="text-xs gap-1.5">
              <Info className="h-3.5 w-3.5" /> Details
            </TabsTrigger>
          </TabsList>

          {/* Rate History Tab */}
          <TabsContent value="chart" className="space-y-4">
            {chartData ? (
              <div className="rounded-xl border border-border bg-card p-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={["dataMin - 0.2", "dataMax + 0.2"]} />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        fontSize: "11px",
                        background: "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Area type="monotone" dataKey="rate" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#rateGrad)" dot={{ fill: "hsl(var(--accent))", r: 2.5 }} name="Annual Rate" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No rate history available yet for this fund.</p>
              </div>
            )}

            {/* Historical Performance */}
            {yields.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Historical Performance</h3>
                <div className="rounded-xl border border-border bg-card p-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={yields}>
                      <defs>
                        <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                      <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
                      <Area type="monotone" dataKey="yield" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#yieldGrad)" dot={{ fill: "hsl(var(--accent))", r: 2.5 }} name="Yield (%)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Compare with a peer */}
            {peers.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Compare Side-by-Side</h3>
                <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <GitCompareArrows className="h-4 w-4 text-accent shrink-0" />
                    <p className="text-sm text-muted-foreground">Choose a fund to compare against <span className="font-medium text-foreground">{fund.name}</span></p>
                  </div>
                  <Select value={comparePeerId} onValueChange={setComparePeerId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select a fund to compare..." />
                    </SelectTrigger>
                    <SelectContent>
                      {peers.map((peer) => (
                        <SelectItem key={peer.id} value={peer.id}>
                          {peer.name} — {formatYield(peer.annual_yield, peer.yield_unit)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {comparePeer && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comparison</p>
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setComparePeerId("")}>
                          <X className="h-3 w-3 mr-1" /> Clear
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="font-medium text-foreground truncate">{fund.name}</div>
                        <div className="text-muted-foreground">vs</div>
                        <div className="font-medium text-foreground truncate">{comparePeer.name}</div>
                      </div>
                      <CompareRow label="Annual Rate" a={formatYield(fund.annual_yield, fund.yield_unit)} b={formatYield(comparePeer.annual_yield, comparePeer.yield_unit)} aWins={fund.annual_yield >= comparePeer.annual_yield} />
                      <CompareRow label="Daily Yield" a={formatYield(fund.daily_yield, fund.yield_unit)} b={formatYield(comparePeer.daily_yield, comparePeer.yield_unit)} aWins={fund.daily_yield >= comparePeer.daily_yield} />
                      <CompareRow label="Mgmt Fee" a={`${fund.management_fee}%`} b={`${comparePeer.management_fee}%`} aWins={fund.management_fee <= comparePeer.management_fee} />
                      <CompareRow label="Min. Investment" a={`KES ${fund.minimum_investment.toLocaleString()}`} b={`KES ${comparePeer.minimum_investment.toLocaleString()}`} aWins={fund.minimum_investment <= comparePeer.minimum_investment} />
                      <CompareRow label="Withdrawal" a={fund.withdrawal_time} b={comparePeer.withdrawal_time} />
                      
                      <div className="pt-2">
                        <Button asChild variant="outline" size="sm" className="w-full text-xs h-8 rounded-lg">
                          <Link to={`/compare/${comparePeer.slug}`}>
                            View {comparePeer.name} Details <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Inputs */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                <h3 className="text-sm font-semibold">Calculate Returns for {fund.name}</h3>
                <p className="text-[11px] text-muted-foreground">Using current annual rate of {fund.annual_yield}% and management fee of {fund.management_fee}%.</p>

                <CalcInput label="Initial Investment" value={calcAmount} onChange={setCalcAmount} min={1000} max={10000000} step={1000} prefix="KES " />
                <CalcInput label="Period" value={calcMonths} onChange={setCalcMonths} min={1} max={120} step={1} suffix=" months" />
                <CalcInput label="Monthly Top-up" value={calcMonthly} onChange={setCalcMonthly} min={0} max={1000000} step={500} prefix="KES " />

                <div className="flex items-center justify-between pt-1">
                  <Label className="text-xs font-medium">Interest Mode</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{calcCompound ? "Compound" : "Simple"}</span>
                    <Switch checked={calcCompound} onCheckedChange={setCalcCompound} />
                  </div>
                </div>
              </div>

              {/* Results */}
              {calcResults && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <h3 className="text-sm font-semibold">Projected Returns</h3>

                  <div className="grid grid-cols-2 gap-2">
                    <CalcStat label="Total Contributions" value={formatKES(calcResults.totalContributions)} icon={<Wallet className="h-3.5 w-3.5" />} />
                    <CalcStat label="Net Earnings" value={formatKES(calcResults.netEarnings)} icon={<TrendingUp className="h-3.5 w-3.5" />} accent />
                    <CalcStat label="Final Value" value={formatKES(calcResults.finalValue)} icon={<PiggyBank className="h-3.5 w-3.5" />} accent />
                    <CalcStat label="Tax (15%)" value={`- ${formatKES(calcResults.totalTax)}`} icon={<CalendarDays className="h-3.5 w-3.5" />} />
                  </div>

                  {calcResults.managementFeeCost > 0 && (
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                      <span className="text-muted-foreground">Mgmt Fee ({fund.management_fee}% p.a.)</span>
                      <span className="font-medium text-destructive">- {formatKES(calcResults.managementFeeCost)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm font-semibold text-accent">Final Value</span>
                    <span className="text-lg font-bold text-accent">{formatKES(calcResults.finalValue)}</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            {/* Fund info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <DetailCard icon={<Clock className="h-4 w-4 text-muted-foreground" />} label="Withdrawal" value={fund.withdrawal_time} />
              <DetailCard icon={<Shield className="h-4 w-4 text-muted-foreground" />} label="Regulation" value={fund.cma_licensed ? "CMA Licensed" : "Not Licensed"} />
              <DetailCard icon={<Wallet className="h-4 w-4 text-muted-foreground" />} label="Yield Unit" value={fund.yield_unit === "%" ? "Percentage" : fund.yield_unit} />
            </div>

            {/* Performance context */}
            {peerStats && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-accent" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider">Performance Context</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <ContextStat label="Category Rank" value={`#${peerStats.rank}`} sub={`of ${peerStats.total} funds`} />
                  <ContextStat label="Percentile" value={`${peerStats.percentile}th`} sub="among peers" />
                  <ContextStat label="Category Avg" value={`${peerStats.avgYield.toFixed(2)}%`} sub={fund.annual_yield > peerStats.avgYield ? "Above average" : "Below average"} highlight={fund.annual_yield > peerStats.avgYield} />
                  <ContextStat label="Category Best" value={`${peerStats.maxYield}%`} sub={fund.annual_yield === peerStats.maxYield ? "Top fund!" : `Gap: ${(peerStats.maxYield - fund.annual_yield).toFixed(2)}%`} highlight={fund.annual_yield === peerStats.maxYield} />
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1 tabular-nums">
                    <span>{peerStats.minYield}%</span>
                    <span>{peerStats.maxYield}%</span>
                  </div>
                  <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-accent/15 rounded-full" style={{ width: "100%" }} />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-accent border-2 border-card shadow-sm"
                      style={{
                        left: `${peerStats.maxYield === peerStats.minYield ? 50 : ((fund.annual_yield - peerStats.minYield) / (peerStats.maxYield - peerStats.minYield)) * 100}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground/70 mt-1">
                    Position among {FUND_TYPE_LABELS[fund.fund_type]} funds
                  </p>
                </div>
              </div>
            )}

            {/* About */}
            {fund.description && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">About This Fund</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{fund.description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {fund.website && /^https?:\/\//i.test(fund.website) && (
                <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg h-8 text-xs">
                  <a href={fund.website} target="_blank" rel="noopener noreferrer">
                    Visit Official Website <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <>
          {/* Blurred chart teaser */}
          <div className="relative rounded-xl border border-border bg-card p-4 mb-4 overflow-hidden">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Rate History</h2>
            <div className="h-48 blur-md pointer-events-none select-none opacity-60" aria-hidden="true">
              <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="blurGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,120 Q50,100 100,90 T200,70 T300,50 T400,60" fill="none" stroke="hsl(var(--accent))" strokeWidth="2" />
                <path d="M0,120 Q50,100 100,90 T200,70 T300,50 T400,60 L400,150 L0,150 Z" fill="url(#blurGrad)" />
              </svg>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
              <div className="text-center">
                <BarChart3 className="h-7 w-7 text-accent mx-auto mb-2" />
                <p className="text-sm font-semibold mb-0.5">Unlock Charts & Calculator</p>
                <p className="text-[11px] text-muted-foreground">Sign up to view rate history, compare funds, and calculate returns</p>
              </div>
            </div>
          </div>

          <AuthGate
            source="fund_detail"
            title="Sign up to see full fund details"
            description="Get access to rate history charts, an investment calculator, fund comparison, and more — completely free."
          />
        </>
      )}

      <div className="mt-6 p-3 rounded-xl bg-muted/30 border border-border/60">
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          <strong className="text-muted-foreground">Disclaimer:</strong> {getDisclaimer(fund?.fund_type)}
        </p>
      </div>
    </div>
  );
};

/* ── Sub-components ── */

const MetricCard = ({ label, value, change, accent, rank, subtext, icon }: {
  label: string; value: string; change?: React.ReactNode; accent?: boolean; rank?: string; subtext?: string; icon?: React.ReactNode;
}) => (
  <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
    <div className="flex items-center justify-between mb-1">
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      {icon && <span className="text-muted-foreground">{icon}</span>}
    </div>
    <p className={`font-bold text-lg sm:text-xl tabular-nums ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
    <div className="flex items-center gap-2 mt-0.5">
      {change}
      {rank && <span className="text-[10px] text-muted-foreground">{rank}</span>}
      {subtext && <span className="text-[10px] text-muted-foreground">{subtext}</span>}
    </div>
  </div>
);

const ContextStat = ({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) => (
  <div>
    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">{label}</p>
    <p className={`text-lg font-bold tabular-nums ${highlight ? "text-accent" : "text-foreground"}`}>{value}</p>
    <p className={`text-[10px] ${highlight ? "text-accent" : "text-muted-foreground"}`}>{sub}</p>
  </div>
);

const DetailCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-border bg-card p-3 sm:p-4 flex items-center gap-3">
    <div className="rounded-lg bg-muted p-2 shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      <p className="font-semibold text-sm mt-0.5 truncate">{value}</p>
    </div>
  </div>
);

const CalcInput = ({ label, value, onChange, min, max, step, prefix, suffix }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; prefix?: string; suffix?: string;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <Label className="text-xs font-medium">{label}</Label>
      <span className="text-xs text-muted-foreground tabular-nums">{prefix}{value.toLocaleString()}{suffix}</span>
    </div>
    <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step || 1} />
    <Input
      type="number" value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min} max={max} step={step}
      className="h-8 text-xs"
    />
  </div>
);

const CalcStat = ({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) => (
  <div className={`rounded-lg border p-3 ${accent ? "border-accent/30 bg-accent/5" : "border-border"}`}>
    <div className="flex items-center gap-1.5 mb-1">
      <span className={accent ? "text-accent" : "text-muted-foreground"}>{icon}</span>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
    <p className={`font-bold text-sm tabular-nums ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
  </div>
);

const CompareRow = ({ label, a, b, aWins }: { label: string; a: string; b: string; aWins?: boolean }) => (
  <div className="grid grid-cols-3 gap-2 items-center py-1.5 border-t border-border/40">
    <p className={`text-sm font-semibold tabular-nums text-right ${aWins === true ? "text-accent" : "text-foreground"}`}>{a}</p>
    <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider">{label}</p>
    <p className={`text-sm font-semibold tabular-nums ${aWins === false ? "text-accent" : "text-foreground"}`}>{b}</p>
  </div>
);

export default FundDetailPage;
