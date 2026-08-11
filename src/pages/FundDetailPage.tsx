import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, ExternalLink, BarChart3, Shield, Clock, Wallet, TrendingUp, ChevronRight, PiggyBank, GitCompareArrows, Bell, MoreHorizontal, Link2, Twitter, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { fetchFundBySlug, fetchFunds, fetchHistoricalYields, fetchFundSnapshots, type FundFromDB, type HistoricalYield, type YieldSnapshot } from "@/lib/api";
import { getDisclaimer } from "@/lib/disclaimers";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import YieldChange, { formatYield } from "@/components/YieldChange";
import { CreateAlertDialog } from "@/components/alerts/PriceAlertComponents";
import SaveToWatchlistButton from "@/components/watchlist/SaveToWatchlistButton";
import AddToPortfolioButton from "@/components/portfolio/AddToPortfolioButton";
import DisclaimerBlock from "@/components/DisclaimerBlock";
import ReportIssueDialog from "@/components/funds/ReportIssueDialog";
import { getFundExplainer } from "@/lib/fundExplainers";
import { BookOpen, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    totalNet += (grossInterest - grossInterest * WITHHOLDING_TAX_RATE) + monthly;
  }
  const totalContributions = amount + monthly * months;
  const grossEarnings = Math.round(totalGross - totalContributions);
  const netEarnings = Math.round(totalNet - totalContributions);
  const managementFeeCost = Math.round(((totalGross + amount) / 2) * (fee / 100) * (months / 12));
  return {
    totalContributions,
    grossEarnings,
    totalTax: grossEarnings - netEarnings,
    managementFeeCost,
    netEarnings: netEarnings - managementFeeCost,
    finalValue: Math.round(totalNet - managementFeeCost),
  };
}

const formatKES = (n: number) => `KES ${n.toLocaleString()}`;

const FundDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [fund, setFund] = useState<FundFromDB | null>(null);
  const [peers, setPeers] = useState<FundFromDB[]>([]);
  const [comparePeerId, setComparePeerId] = useState<string>("");
  const [yields, setYields] = useState<HistoricalYield[]>([]);
  const [snapshots, setSnapshots] = useState<YieldSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  

  const [calcAmount, setCalcAmount] = useState(100000);
  const [calcMonths, setCalcMonths] = useState(12);
  const [calcMonthly, setCalcMonthly] = useState(0);
  const [calcCompound, setCalcCompound] = useState(true);

  const shareUrl = `https://kenyafundfinder.com/compare/${encodeURIComponent(id || "")}`;
  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link copied to clipboard" });
  };

  useDocumentTitle(
    fund ? `${fund.name} – Fund Details` : "Fund Details",
    fund ? `${fund.name} by ${fund.manager}. Annual rate: ${fund.annual_yield}%. Compare unit trusts in Kenya.` : undefined,
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
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    Promise.allSettled([fetchFundBySlug(id), fetchFunds()])
      .then(async ([fundResult, fundsResult]) => {
        if (cancelled) return;
        const allFunds = fundsResult.status === "fulfilled" ? fundsResult.value : [];
        const normalizedSlug = decodeURIComponent(id).toLowerCase();
        const directFund = fundResult.status === "fulfilled" ? fundResult.value : null;
        const f = directFund ?? allFunds.find((candidate) => candidate.slug.toLowerCase() === normalizedSlug) ?? null;

        if (fundResult.status === "rejected" && fundsResult.status === "rejected") {
          throw new Error("Fund data is temporarily unavailable");
        }

        setFund(f);
        if (f) {
          setPeers(allFunds.filter((p) => p.fund_type === f.fund_type && p.id !== f.id));
          const historyResults = await Promise.allSettled([fetchHistoricalYields(f.id), fetchFundSnapshots(f.id)]);
          if (cancelled) return;
          setYields(historyResults[0].status === "fulfilled" ? historyResults[0].value : []);
          setSnapshots(historyResults[1].status === "fulfilled" ? historyResults[1].value : []);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id, loadAttempt]);

  const peerStats = useMemo(() => {
    if (!fund || peers.length === 0) return null;
    const all = [fund, ...peers];
    const ylds = all.map((f) => f.annual_yield);
    const rank = ylds.filter((y) => y > fund.annual_yield).length + 1;
    return {
      rank,
      total: all.length,
      avgYield: ylds.reduce((a, b) => a + b, 0) / ylds.length,
      maxYield: Math.max(...ylds),
      minYield: Math.min(...ylds),
      avgFee: all.map((f) => f.management_fee).reduce((a, b) => a + b, 0) / all.length,
    };
  }, [fund, peers]);

  const comparePeer = peers.find((p) => p.id === comparePeerId) || null;

  const calcResults = useMemo(() => {
    if (!fund) return null;
    return calculateReturns(calcAmount, fund.annual_yield, calcMonths, calcMonthly, calcCompound, fund.management_fee);
  }, [fund, calcAmount, calcMonths, calcMonthly, calcCompound]);

  if (loading) {
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

  if (loadError) {
    return (
      <div className="container py-20 text-center">
        <h1 className="mb-2 text-xl font-bold">Unable to load this fund</h1>
        <p className="mb-4 text-sm text-muted-foreground">The fund service is temporarily unavailable.</p>
        <Button variant="outline" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Try again</Button>
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

  const prevSnap = snapshots.length > 0 ? snapshots[0] : undefined;

  const chartData = snapshots.length >= 1
    ? (() => {
        const data = [...snapshots].reverse().map((s) => ({
          date: new Date(s.snapshot_date).toLocaleDateString("en-KE", { day: "numeric", month: "short" }),
          rate: Number(s.annual_yield),
        }));
        const last = snapshots[0];
        if (last && Number(last.annual_yield) !== fund.annual_yield) {
          data.push({ date: "Today", rate: fund.annual_yield });
        }
        return data.length > 1 ? data : null;
      })()
    : null;

  return (
    <>
    <div className="min-h-screen px-3 pb-6 pt-3 md:hidden">
      <div className="sticky top-0 z-40 -mx-3 -mt-3 mb-4 flex h-[58px] items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur-md">
        <button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-muted/50">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="More options" className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-muted/50">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer gap-2 text-sm"><Link2 className="h-4 w-4" /> Copy Link</DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${fund.name} by ${fund.manager}`)}&url=${encodeURIComponent(shareUrl)}`, "_blank", "noopener")} className="cursor-pointer gap-2 text-sm"><Twitter className="h-4 w-4" /> Share on X</DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank", "noopener")} className="cursor-pointer gap-2 text-sm"><Facebook className="h-4 w-4" /> Share on Facebook</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mb-1">
        <div className="flex items-center gap-3">
          <FundMobileLogo name={fund.name} logoUrl={fund.logo_url} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-black tracking-tight text-foreground">{fund.name}</h1>
              {fund.cma_licensed && <Shield className="h-4 w-4 shrink-0 text-primary" />}
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{fund.manager}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{FUND_TYPE_LABELS[fund.fund_type] || fund.fund_type} · {fund.cma_licensed ? "CMA regulated" : "Fund report"}</p>
          </div>
        </div>

        <div className="my-4 grid grid-cols-2 gap-2">
          <div className="[&_button]:h-10 [&_button]:w-full [&_button]:rounded-full [&_button]:border-foreground [&_button]:bg-foreground [&_button]:px-3 [&_button]:text-xs [&_button]:font-semibold [&_button]:text-background [&_svg]:h-4 [&_svg]:w-4">
            <CreateAlertDialog assetType="fund" assetId={fund.id} assetName={fund.name} currentPrice={fund.annual_yield} unit="%" />
          </div>
          <SaveToWatchlistButton itemType="fund" itemId={fund.id} itemName={fund.name} variant="button" buttonLabel="Watch" savedButtonLabel="Watching" className="h-10 w-full rounded-full px-3 text-xs font-semibold" />
        </div>

        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Annual yield · Updated {new Date(fund.updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })} · Updated monthly</p>
          <p className="mt-1 text-[38px] font-black leading-none tabular-nums text-foreground">{formatYield(fund.annual_yield, fund.yield_unit)}</p>
          <div className="mt-1.5 flex items-center gap-3">
            {prevSnap && <YieldChange current={fund.annual_yield} previous={prevSnap.annual_yield} unit={fund.yield_unit} className="text-xs font-bold" />}
            {peerStats && <p className="text-[10px] text-muted-foreground">#{peerStats.rank} of {peerStats.total} similar funds</p>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="-mx-3 mb-3 flex h-auto w-[calc(100%+1.5rem)] justify-start overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
          {[["overview", "Overview"], ["compare", "Compare"], ["calculator", "Calculator"], ["about", "About"]].map(([value, label]) => (
            <TabsTrigger key={value} value={value} className="shrink-0 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <MobileRateChart title="Rate History" data={chartData} dataKey="rate" xKey="date" emptyText="No rate history available yet." />
          {yields.length > 0 && <MobileRateChart title="Monthly Performance" data={yields} dataKey="yield" xKey="month" emptyText="No monthly performance available yet." />}
          <div className="grid grid-cols-2 gap-2">
            <FundMetric label="Daily Yield" value={formatYield(fund.daily_yield, fund.yield_unit)} icon={<TrendingUp className="h-4 w-4" />} />
            <FundMetric label="Min. Investment" value={`KES ${fund.minimum_investment.toLocaleString()}`} icon={<Wallet className="h-4 w-4" />} />
            <FundMetric label="Management Fee" value={`${fund.management_fee}%`} sub={peerStats ? `Category avg ${peerStats.avgFee.toFixed(2)}%` : undefined} icon={<BarChart3 className="h-4 w-4" />} />
            <FundMetric label="Withdrawal" value={fund.withdrawal_time || "—"} icon={<Clock className="h-4 w-4" />} />
          </div>
          <div className="rounded-[16px] border border-border bg-card p-3">
            <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">CMA status</span><span className="text-xs font-bold text-foreground">{fund.cma_licensed ? "Regulated" : "Not confirmed"}</span></div>
            <div className="my-2 h-px bg-border/60" />
            <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Yield unit</span><span className="text-xs font-bold text-foreground">{fund.yield_unit || "%"}</span></div>
          </div>
        </TabsContent>

        <TabsContent value="compare">
          {peers.length > 0 ? (
            <div className="overflow-hidden rounded-[18px] border border-border bg-card">
              <div className="border-b border-border/60 p-3">
                <Label className="mb-1.5 block text-xs text-muted-foreground">Compare {fund.name} with</Label>
                <Select value={comparePeerId} onValueChange={setComparePeerId}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Choose a similar fund…" /></SelectTrigger>
                  <SelectContent>{peers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {formatYield(p.annual_yield, p.yield_unit)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {comparePeer ? <div className="divide-y divide-border/40">
                <div className="grid grid-cols-3 bg-muted/30 px-3 py-2.5 text-[11px] font-semibold"><span className="truncate">{fund.name}</span><span className="text-center text-muted-foreground">Metric</span><span className="truncate text-right">{comparePeer.name}</span></div>
                <CmpRow label="Annual Rate" a={formatYield(fund.annual_yield, fund.yield_unit)} b={formatYield(comparePeer.annual_yield, comparePeer.yield_unit)} aWins={fund.annual_yield >= comparePeer.annual_yield} />
                <CmpRow label="Daily Yield" a={formatYield(fund.daily_yield, fund.yield_unit)} b={formatYield(comparePeer.daily_yield, comparePeer.yield_unit)} aWins={fund.daily_yield >= comparePeer.daily_yield} />
                <CmpRow label="Mgmt Fee" a={`${fund.management_fee}%`} b={`${comparePeer.management_fee}%`} aWins={fund.management_fee <= comparePeer.management_fee} />
                <CmpRow label="Min. Invest" a={`KES ${fund.minimum_investment.toLocaleString()}`} b={`KES ${comparePeer.minimum_investment.toLocaleString()}`} aWins={fund.minimum_investment <= comparePeer.minimum_investment} />
                <CmpRow label="Withdrawal" a={fund.withdrawal_time} b={comparePeer.withdrawal_time} />
              </div> : <div className="p-8 text-center text-sm text-muted-foreground">Select a similar fund to compare.</div>}
            </div>
          ) : <div className="py-10 text-center text-sm text-muted-foreground">No similar funds available.</div>}
        </TabsContent>

        <TabsContent value="calculator">
          <div className="space-y-4 rounded-[18px] border border-border bg-card p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">Estimate returns using {fund.name}'s current rate of {fund.annual_yield}% p.a.</p>
            <CalcInput label="Initial Investment" value={calcAmount} onChange={setCalcAmount} min={1000} max={10000000} step={1000} prefix="KES " />
            <CalcInput label="Period" value={calcMonths} onChange={setCalcMonths} min={1} max={120} step={1} suffix=" months" />
            <CalcInput label="Monthly Top-up" value={calcMonthly} onChange={setCalcMonthly} min={0} max={1000000} step={500} prefix="KES " />
            <div className="flex items-center justify-between"><Label className="text-xs font-medium">Compound Interest</Label><Switch checked={calcCompound} onCheckedChange={setCalcCompound} /></div>
            {calcResults && <div className="space-y-2 border-t border-border/60 pt-3 text-sm">
              <div className="rounded-[14px] bg-primary/10 p-3 text-center"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Estimated Final Value</p><p className="mt-1 text-xl font-black tabular-nums text-primary">{formatKES(calcResults.finalValue)}</p></div>
              <CalcLine label="Total Contributions" value={formatKES(calcResults.totalContributions)} />
              <CalcLine label="Gross Interest" value={formatKES(calcResults.grossEarnings)} />
              <CalcLine label="Withholding Tax (15%)" value={`- ${formatKES(calcResults.totalTax)}`} destructive />
              {calcResults.managementFeeCost > 0 && <CalcLine label={`Mgmt Fee (${fund.management_fee}%)`} value={`- ${formatKES(calcResults.managementFeeCost)}`} destructive />}
              <div className="flex justify-between border-t border-border pt-2 text-xs font-bold text-primary"><span>Net Earnings</span><span>{formatKES(calcResults.netEarnings)}</span></div>
            </div>}
          </div>
        </TabsContent>

        <TabsContent value="about" className="space-y-3">
          <div className="rounded-[18px] border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
            <p>{getFundExplainer(fund.fund_type)}</p>
            {fund.description && <><div className="my-3 h-px bg-border/60" /><p>{fund.description}</p></>}
          </div>
          {peers.length > 0 && <div className="overflow-hidden rounded-[18px] border border-border bg-card divide-y divide-border/40">
            {[...peers].sort((a, b) => Math.abs(a.annual_yield - fund.annual_yield) - Math.abs(b.annual_yield - fund.annual_yield)).slice(0, 4).map((p) => <Link key={p.id} to={`/compare/${p.slug}`} className="flex items-center justify-between gap-3 px-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{p.name}</p><p className="truncate text-[11px] text-muted-foreground">{p.manager}</p></div><p className="shrink-0 text-sm font-bold text-primary">{formatYield(p.annual_yield, p.yield_unit)}</p></Link>)}
          </div>}
          <div className="flex items-center justify-between rounded-[14px] border border-border/60 bg-muted/20 px-3 py-2.5"><p className="pr-3 text-[11px] text-muted-foreground">Spotted incorrect information?</p><ReportIssueDialog fundId={fund.id} fundName={fund.name} /></div>
          <DisclaimerBlock extra={getDisclaimer(fund.fund_type)} />
        </TabsContent>
      </Tabs>
    </div>

    <div className="container hidden max-w-5xl space-y-5 py-8 md:block">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-3 py-1">
        <Link to="/" className="hidden md:inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </nav>

      {/* ━━━ SECTION 1: Fund Identity ━━━ */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
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
            <div className="flex items-start gap-2">
              <h2 className="text-lg md:text-xl font-bold leading-tight flex-1">{fund.name}</h2>
              <SaveToWatchlistButton itemType="fund" itemId={fund.id} itemName={fund.name} />
            </div>
            <p className="text-muted-foreground text-sm">{fund.manager}</p>
          </div>
          <div className="flex items-center gap-2 sm:hidden mt-2">
            <CreateAlertDialog
              assetType="fund"
              assetId={fund.id}
              assetName={fund.name}
              currentPrice={fund.annual_yield}
              unit="%"
            />
          </div>
          <div className="flex items-center gap-3 text-right shrink-0">
            <div>
              <p className="text-2xl md:text-3xl font-bold text-accent tabular-nums">{formatYield(fund.annual_yield, fund.yield_unit)}</p>
            <div className="flex items-center justify-end gap-1.5">
                {prevSnap && <YieldChange current={fund.annual_yield} previous={prevSnap.annual_yield} unit={fund.yield_unit} className="text-xs" />}
                {peerStats && <span className="text-[10px] text-muted-foreground">#{peerStats.rank} of {peerStats.total}</span>}
              </div>
              <div className="hidden sm:block mt-2">
                <CreateAlertDialog
                  assetType="fund"
                  assetId={fund.id}
                  assetName={fund.name}
                  currentPrice={fund.annual_yield}
                  unit="%"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick info row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/50">
          <QuickStat label="Daily Yield" value={formatYield(fund.daily_yield, fund.yield_unit)} />
          <QuickStat label="Min. Investment" value={`KES ${fund.minimum_investment.toLocaleString()}`} />
          <QuickStat label="Management Fee" value={`${fund.management_fee}%`} sub={peerStats ? `avg ${peerStats.avgFee.toFixed(2)}%` : undefined} />
          <QuickStat label="Withdrawal" value={fund.withdrawal_time} />
        </div>

        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <p className="text-[11px] text-muted-foreground/60 tabular-nums">
            Updated {new Date(fund.updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })} · Updated monthly
          </p>
          <div className="flex items-center gap-2">
            <AddToPortfolioButton
              asset={{
                asset_type: "mmf",
                asset_name: fund.name,
                ticker: fund.slug,
                units: 1,
                buy_price: 10_000,
                current_price: 10_000,
                current_yield: Number(fund.annual_yield) || 15,
              }}
              variant="outline"
              size="sm"
              className="rounded-full text-xs h-8"
            />
            {fund.website && /^https?:\/\//i.test(fund.website) && (
              <a href={fund.website} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5 text-xs rounded-full px-4">
                  <ExternalLink className="h-3.5 w-3.5" /> Visit Official Site
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ━━━ SECTION 2: Rate History Chart ━━━ */}
          <section>
            <SectionHeader icon={<BarChart3 className="h-4 w-4" />} title="Rate History" />
            {chartData ? (
              <div className="rounded-xl border border-border bg-card p-4 h-64 sm:h-72">
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
                    <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "11px", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
                    <Area type="monotone" dataKey="rate" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#rateGrad)" dot={{ fill: "hsl(var(--accent))", r: 2.5 }} name="Annual Rate" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No rate history available yet.</p>
              </div>
            )}

            {yields.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 h-52 mt-3">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">Monthly Performance</p>
                <ResponsiveContainer width="100%" height="85%">
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
            )}
          </section>

          {/* ━━━ SECTION 3 & 4: Compare + Calculator side by side ━━━ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* Compare */}
            {peers.length > 0 && (
              <section className="min-w-0">
                <SectionHeader icon={<GitCompareArrows className="h-4 w-4" />} title="Compare" />
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="p-4 border-b border-border/50">
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Compare {fund.name} with:
                    </Label>
                    <Select value={comparePeerId} onValueChange={setComparePeerId}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Choose a similar fund…" />
                      </SelectTrigger>
                      <SelectContent>
                        {peers.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — {formatYield(p.annual_yield, p.yield_unit)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {comparePeer ? (
                    <div className="divide-y divide-border/40">
                      <div className="grid grid-cols-3 px-4 py-3 bg-muted/30 text-xs font-semibold">
                        <span className="text-foreground truncate">{fund.name}</span>
                        <span className="text-center text-muted-foreground">Metric</span>
                        <span className="text-right text-foreground truncate">{comparePeer.name}</span>
                      </div>
                      <CmpRow label="Annual Rate" a={formatYield(fund.annual_yield, fund.yield_unit)} b={formatYield(comparePeer.annual_yield, comparePeer.yield_unit)} aWins={fund.annual_yield >= comparePeer.annual_yield} />
                      <CmpRow label="Daily Yield" a={formatYield(fund.daily_yield, fund.yield_unit)} b={formatYield(comparePeer.daily_yield, comparePeer.yield_unit)} aWins={fund.daily_yield >= comparePeer.daily_yield} />
                      <CmpRow label="Mgmt Fee" a={`${fund.management_fee}%`} b={`${comparePeer.management_fee}%`} aWins={fund.management_fee <= comparePeer.management_fee} />
                      <CmpRow label="Min. Invest" a={`KES ${fund.minimum_investment.toLocaleString()}`} b={`KES ${comparePeer.minimum_investment.toLocaleString()}`} aWins={fund.minimum_investment <= comparePeer.minimum_investment} />
                      <CmpRow label="Withdrawal" a={fund.withdrawal_time} b={comparePeer.withdrawal_time} />
                      <CmpRow label="CMA Licensed" a={fund.cma_licensed ? "Yes" : "No"} b={comparePeer.cma_licensed ? "Yes" : "No"} />
                      <div className="p-3">
                        <Button asChild variant="outline" size="sm" className="w-full text-xs h-8 rounded-lg">
                          <Link to={`/compare/${comparePeer.slug}`}>
                            View {comparePeer.name} <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center flex flex-col items-center justify-center min-h-[200px]">
                      <GitCompareArrows className="h-6 w-6 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">Select a fund above to see a side-by-side comparison</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Calculator */}
            <section className="min-w-0">
              <SectionHeader icon={<PiggyBank className="h-4 w-4" />} title="Investment Calculator" />
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] text-muted-foreground mb-4">
                  Estimate returns using <span className="font-medium text-foreground">{fund.name}</span>'s current rate of {fund.annual_yield}% p.a.
                </p>
                <div className="space-y-4">
                  <CalcInput label="Initial Investment" value={calcAmount} onChange={setCalcAmount} min={1000} max={10000000} step={1000} prefix="KES " />
                  <CalcInput label="Period" value={calcMonths} onChange={setCalcMonths} min={1} max={120} step={1} suffix=" months" />
                  <CalcInput label="Monthly Top-up" value={calcMonthly} onChange={setCalcMonthly} min={0} max={1000000} step={500} prefix="KES " />
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Compound Interest</Label>
                    <Switch checked={calcCompound} onCheckedChange={setCalcCompound} />
                  </div>

                  {calcResults && (
                    <div className="space-y-3 pt-3 border-t border-border/50">
                      <div className="rounded-lg bg-accent/5 border border-accent/20 p-4 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Estimated Final Value</p>
                        <p className="text-2xl font-bold text-accent tabular-nums">{formatKES(calcResults.finalValue)}</p>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <CalcLine label="Total Contributions" value={formatKES(calcResults.totalContributions)} />
                        <CalcLine label="Gross Interest" value={formatKES(calcResults.grossEarnings)} />
                        <CalcLine label="Withholding Tax (15%)" value={`- ${formatKES(calcResults.totalTax)}`} destructive />
                        {calcResults.managementFeeCost > 0 && (
                          <CalcLine label={`Mgmt Fee (${fund.management_fee}%)`} value={`- ${formatKES(calcResults.managementFeeCost)}`} destructive />
                        )}
                        <div className="flex justify-between pt-2 border-t border-border font-semibold text-accent">
                          <span>Net Earnings</span>
                          <span>{formatKES(calcResults.netEarnings)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* ━━━ SECTION 5: About / How this fund works ━━━ */}
          <section>
            <SectionHeader icon={<BookOpen className="h-4 w-4" />} title="How this fund works" />
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground">{getFundExplainer(fund.fund_type)}</p>
              {fund.description && (
                <>
                  <div className="border-t border-border/40" />
                  <p className="text-sm leading-relaxed text-muted-foreground">{fund.description}</p>
                </>
              )}
            </div>
          </section>

          {/* ━━━ SECTION 6: Similar / other funds in this category ━━━ */}
          {peers.length > 0 && (
            <section>
              <SectionHeader icon={<Layers className="h-4 w-4" />} title="Other funds in this category" />
              <div className="rounded-xl border border-border bg-card divide-y divide-border/40">
                {[...peers]
                  .sort((a, b) => Math.abs(a.annual_yield - fund.annual_yield) - Math.abs(b.annual_yield - fund.annual_yield))
                  .slice(0, 4)
                  .map((p) => (
                    <Link
                      key={p.id}
                      to={`/compare/${p.slug}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{p.manager}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold tabular-nums text-accent">{formatYield(p.annual_yield, p.yield_unit)}</p>
                        <p className="text-[10px] text-muted-foreground">Annual rate</p>
                      </div>
                    </Link>
                  ))}
                <Link
                  to="/funds"
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs text-accent hover:bg-muted/30 transition-colors"
                >
                  See all unit trusts <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>
          )}

          {/* ━━━ Report incorrect data ━━━ */}
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              Spotted out-of-date or incorrect information on this page?
            </p>
            <ReportIssueDialog fundId={fund.id} fundName={fund.name} />
          </div>

          {/* ━━━ Disclaimers ━━━ */}
          <DisclaimerBlock extra={getDisclaimer(fund?.fund_type)} />
    </div>
    </>
  );
};

/* ── Sub-components ── */

const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2 mb-2">
    <span className="text-accent">{icon}</span>
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
  </div>
);

const QuickStat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div>
    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
    <p className="text-sm font-semibold tabular-nums mt-0.5">{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground/60">{sub}</p>}
  </div>
);

const CmpRow = ({ label, a, b, aWins }: { label: string; a: string; b: string; aWins?: boolean }) => (
  <div className="grid grid-cols-3 px-4 py-2.5 text-sm items-center">
    <span className={`font-semibold tabular-nums ${aWins === true ? "text-primary" : "text-foreground"}`}>{a}</span>
    <span className="text-center text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    <span className={`text-right font-semibold tabular-nums ${aWins === false ? "text-primary" : "text-foreground"}`}>{b}</span>
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
    <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} min={min} max={max} step={step} className="h-8 text-xs" />
  </div>
);

const CalcLine = ({ label, value, destructive }: { label: string; value: string; destructive?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-medium ${destructive ? "text-destructive" : "text-foreground"}`}>{value}</span>
  </div>
);

const FundMobileLogo = ({ name, logoUrl }: { name: string; logoUrl: string | null }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/40">
      {logoUrl && !failed ? (
        <img src={logoUrl} alt={`${name} logo`} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span className="text-sm font-black text-primary">{name.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
};

const FundMetric = ({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) => (
  <div className="flex min-h-[72px] items-center gap-2.5 rounded-[16px] border border-border bg-card p-3 shadow-[0_5px_16px_hsl(var(--foreground)/0.05)]">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</div>
    <div className="min-w-0">
      <p className="truncate text-[10px] font-semibold uppercase leading-none tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-bold leading-tight tabular-nums text-foreground">{value || "—"}</p>
      {sub && <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{sub}</p>}
    </div>
  </div>
);

const MobileRateChart = ({ title, data, dataKey, xKey, emptyText }: { title: string; data: any[] | null; dataKey: string; xKey: string; emptyText: string }) => (
  <section>
    <div className="mb-3 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><h2 className="text-base font-bold text-foreground">{title}</h2></div>
    {data && data.length > 1 ? (
      <div className="-mx-3 h-[230px] w-[calc(100%+1.5rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -8 }}>
            <defs><linearGradient id={`mobile-${dataKey}-gradient`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.24} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={xKey} tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} minTickGap={18} tickMargin={6} />
            <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={42} domain={["dataMin - 0.5", "dataMax + 0.5"]} />
            <RechartsTooltip contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))", fontSize: "11px", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
            <Area type="monotone" dataKey={dataKey} stroke="hsl(var(--primary))" strokeWidth={2} fill={`url(#mobile-${dataKey}-gradient)`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    ) : <div className="py-12 text-center text-sm text-muted-foreground">{emptyText}</div>}
  </section>
);

export default FundDetailPage;
