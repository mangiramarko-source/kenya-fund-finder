import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, ExternalLink, BarChart3, Shield, Clock, Wallet, TrendingUp, ChevronRight, PiggyBank, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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
  const { user, loading: authLoading } = useAuth();
  const [fund, setFund] = useState<FundFromDB | null>(null);
  const [peers, setPeers] = useState<FundFromDB[]>([]);
  const [comparePeerId, setComparePeerId] = useState<string>("");
  const [yields, setYields] = useState<HistoricalYield[]>([]);
  const [snapshots, setSnapshots] = useState<YieldSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  

  const [calcAmount, setCalcAmount] = useState(100000);
  const [calcMonths, setCalcMonths] = useState(12);
  const [calcMonthly, setCalcMonthly] = useState(0);
  const [calcCompound, setCalcCompound] = useState(true);

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
    setLoading(true);
    Promise.all([fetchFundBySlug(id), fetchFunds()])
      .then(async ([f, allFunds]) => {
        setFund(f);
        if (f) {
          setPeers(allFunds.filter((p) => p.fund_type === f.fund_type && p.id !== f.id));
          const [y, s] = await Promise.all([fetchHistoricalYields(f.id), fetchFundSnapshots(f.id)]);
          setYields(y);
          setSnapshots(s);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

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

  const isAuth = !!user;
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
    <div className="container py-4 sm:py-8 max-w-5xl space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-3 py-1">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
        <Link to="/funds" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Unit Trusts</Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
        <span className="text-sm text-foreground font-semibold truncate max-w-[200px]">{fund.name}</span>
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
            <h1 className="text-lg md:text-xl font-bold leading-tight">{fund.name}</h1>
            <p className="text-muted-foreground text-sm">{fund.manager}</p>
          </div>
          <div className="flex items-center gap-3 text-right shrink-0">
            <div>
              <p className="text-2xl md:text-3xl font-bold text-accent tabular-nums">{formatYield(fund.annual_yield, fund.yield_unit)}</p>
              <div className="flex items-center justify-end gap-1.5">
                {prevSnap && <YieldChange current={fund.annual_yield} previous={prevSnap.annual_yield} unit={fund.yield_unit} className="text-xs" />}
                {peerStats && <span className="text-[10px] text-muted-foreground">#{peerStats.rank} of {peerStats.total}</span>}
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

        <p className="text-[11px] text-muted-foreground/60 mt-3 tabular-nums">
          Updated {new Date(fund.updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
          {fund.website && /^https?:\/\//i.test(fund.website) && (
            <>
              {" · "}
              <a href={fund.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-0.5">
                Official site <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </p>
      </div>

      {isAuth ? (
        <>
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

          {/* ━━━ SECTION 5: About ━━━ */}
          {fund.description && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">About This Fund</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{fund.description}</p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="relative rounded-xl border border-border bg-card p-4 overflow-hidden">
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
                <p className="text-sm font-semibold mb-0.5">Unlock Full Analysis</p>
                <p className="text-[11px] text-muted-foreground">Sign up to view charts, compare funds, and calculate returns</p>
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

      <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          <strong className="text-muted-foreground">Disclaimer:</strong> {getDisclaimer(fund?.fund_type)}
        </p>
      </div>
    </div>
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
    <span className={`font-semibold tabular-nums ${aWins === true ? "text-accent" : "text-foreground"}`}>{a}</span>
    <span className="text-center text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    <span className={`text-right font-semibold tabular-nums ${aWins === false ? "text-accent" : "text-foreground"}`}>{b}</span>
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

export default FundDetailPage;
