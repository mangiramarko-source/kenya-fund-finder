import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, ExternalLink, Calculator, BarChart3, Plus, Check, Shield, Clock, Wallet, TrendingUp, Info, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchFundBySlug, fetchFunds, fetchHistoricalYields, fetchFundSnapshots, type FundFromDB, type HistoricalYield, type YieldSnapshot } from "@/lib/api";
import { getDisclaimer } from "@/lib/disclaimers";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import AuthGate from "@/components/AuthGate";
import YieldChange, { formatYield } from "@/components/YieldChange";
import { useCompare } from "@/hooks/useCompare";

const FUND_TYPE_LABELS: Record<string, string> = {
  money_market: "Money Market",
  fixed_income: "Fixed Income",
  balanced: "Balanced",
  equity: "Equity",
  bond: "Bond",
};

const FundDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { add, remove, isSelected } = useCompare();
  const [fund, setFund] = useState<FundFromDB | null>(null);
  const [peers, setPeers] = useState<FundFromDB[]>([]);
  const [yields, setYields] = useState<HistoricalYield[]>([]);
  const [snapshots, setSnapshots] = useState<YieldSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

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
      { "@type": "ListItem", position: 2, name: "Compare Funds", item: "https://kenyafundfinder.com/compare" },
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
  const inCompare = isSelected(fund.id);

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
    <div className="container py-6 sm:py-10 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link to="/funds" className="hover:text-foreground transition-colors">{FUND_TYPE_LABELS[fund.fund_type] || fund.fund_type}</Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[200px]">{fund.name}</span>
        </nav>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
              {FUND_TYPE_LABELS[fund.fund_type] || fund.fund_type}
            </Badge>
            {fund.cma_licensed && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Shield className="h-3 w-3" /> CMA Regulated
              </Badge>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 leading-tight">{fund.name}</h1>
          <p className="text-muted-foreground text-sm">{fund.manager}</p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Updated {new Date(fund.updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
            {fund.fact_sheet_date && ` · Fact sheet: ${new Date(fund.fact_sheet_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={inCompare ? "default" : "outline"}
            size="sm"
            onClick={() => inCompare ? remove(fund.id) : add(fund)}
            className={`text-xs h-9 ${inCompare ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
          >
            {inCompare ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
            {inCompare ? "Added" : "Compare"}
          </Button>
          <Button asChild variant="outline" size="sm" className="text-xs h-9">
            <Link to={`/calculator?fund=${fund.slug}`}>
              <Calculator className="mr-1.5 h-3.5 w-3.5" /> Calculate
            </Link>
          </Button>
        </div>
      </div>

      {/* Hero metrics — yields always visible, fee & min gated */}
      <div className={`grid grid-cols-2 ${isAuthenticated ? "md:grid-cols-4" : ""} gap-3 mb-6`}>
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
        {isAuthenticated && (
          <>
            <MetricCard
              label="Management Fee"
              value={`${fund.management_fee}%`}
              subtext={peerStats ? `Avg: ${peerStats.avgFee.toFixed(2)}%` : undefined}
              icon={<Wallet className="h-4 w-4" />}
            />
            <MetricCard
              label="Min. Investment"
              value={`KES ${fund.minimum_investment.toLocaleString()}`}
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </>
        )}
      </div>

      {isAuthenticated ? (
        <>
          {/* Performance context bar */}
          {peerStats && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold">Performance Context</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">Compared against all {peerStats.total} {FUND_TYPE_LABELS[fund.fund_type]} funds</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <ContextStat label="Category Rank" value={`#${peerStats.rank}`} sub={`of ${peerStats.total} funds`} />
                <ContextStat label="Percentile" value={`${peerStats.percentile}th`} sub="among peers" />
                <ContextStat label="Category Avg" value={`${peerStats.avgYield.toFixed(2)}%`} sub={fund.annual_yield > peerStats.avgYield ? "You're above avg" : "Below average"} highlight={fund.annual_yield > peerStats.avgYield} />
                <ContextStat label="Category Best" value={`${peerStats.maxYield}%`} sub={fund.annual_yield === peerStats.maxYield ? "This is the top fund!" : `Gap: ${(peerStats.maxYield - fund.annual_yield).toFixed(2)}%`} highlight={fund.annual_yield === peerStats.maxYield} />
              </div>

              {/* Yield position bar */}
              <div className="mt-4">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{peerStats.minYield}%</span>
                  <span>{peerStats.maxYield}%</span>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-accent/20 rounded-full" style={{ width: "100%" }} />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-accent border-2 border-card shadow-md"
                    style={{
                      left: `${peerStats.maxYield === peerStats.minYield ? 50 : ((fund.annual_yield - peerStats.minYield) / (peerStats.maxYield - peerStats.minYield)) * 100}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                </div>
                <p className="text-[10px] text-center text-muted-foreground mt-1">
                  This fund's position among {FUND_TYPE_LABELS[fund.fund_type]} funds
                </p>
              </div>
            </div>
          )}

          {/* Additional metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
              <div className="rounded-lg bg-muted p-2"><Clock className="h-4 w-4 text-muted-foreground" /></div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Withdrawal</p>
                <p className="font-semibold text-sm mt-0.5">{fund.withdrawal_time}</p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
              <div className="rounded-lg bg-muted p-2"><Shield className="h-4 w-4 text-muted-foreground" /></div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Regulation</p>
                <p className="font-semibold text-sm mt-0.5">{fund.cma_licensed ? "CMA Licensed" : "Not CMA Licensed"}</p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
              <div className="rounded-lg bg-muted p-2"><Wallet className="h-4 w-4 text-muted-foreground" /></div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Yield Unit</p>
                <p className="font-semibold text-sm mt-0.5">{fund.yield_unit === "%" ? "Percentage" : fund.yield_unit}</p>
              </div>
            </div>
          </div>

          {/* Rate History Chart */}
          {chartData && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Rate History</h2>
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
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={["dataMin - 0.2", "dataMax + 0.2"]} />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: "10px",
                        border: "1px solid hsl(var(--border))",
                        fontSize: "12px",
                        background: "hsl(var(--card))",
                      }}
                    />
                    <Area type="monotone" dataKey="rate" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#rateGrad)" dot={{ fill: "hsl(var(--accent))", r: 3 }} name="Annual Rate" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Historical Performance */}
          {yields.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Historical Performance</h2>
              <div className="rounded-xl border border-border bg-card p-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={yields}>
                    <defs>
                      <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                    <RechartsTooltip contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Area type="monotone" dataKey="yield" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#yieldGrad)" dot={{ fill: "hsl(var(--accent))" }} name="Yield (%)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Peer comparison quick list */}
          {peers.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Similar Funds</h2>
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="divide-y divide-border">
                  {peers.slice(0, 5).map((peer) => {
                    const peerInCompare = isSelected(peer.id);
                    return (
                      <div key={peer.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <Link to={`/compare/${peer.slug}`} className="text-sm font-medium hover:text-accent transition-colors line-clamp-1">
                            {peer.name}
                          </Link>
                          <p className="text-[11px] text-muted-foreground truncate">{peer.manager}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold tabular-nums ${peer.annual_yield > fund.annual_yield ? "text-accent" : "text-foreground"}`}>
                            {formatYield(peer.annual_yield, peer.yield_unit)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Fee: {peer.management_fee}%</p>
                        </div>
                        <Button
                          variant={peerInCompare ? "default" : "ghost"}
                          size="icon"
                          className={`h-7 w-7 shrink-0 ${peerInCompare ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
                          onClick={() => peerInCompare ? remove(peer.id) : add(peer)}
                        >
                          {peerInCompare ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* About */}
          {fund.description && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">About This Fund</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{fund.description}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {fund.website && /^https?:\/\//i.test(fund.website) && (
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <a href={fund.website} target="_blank" rel="noopener noreferrer">
                  Visit Official Website <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to={`/calculator?fund=${fund.slug}`}>
                <Calculator className="mr-2 h-4 w-4" /> Use in Calculator
              </Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Blurred chart teaser */}
          <div className="relative rounded-xl border border-border bg-card p-4 mb-6 overflow-hidden">
            <h2 className="text-lg font-semibold mb-3 text-muted-foreground/60">Rate History</h2>
            <div className="h-56 blur-md pointer-events-none select-none opacity-60" aria-hidden="true">
              <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="blurGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,120 Q50,100 100,90 T200,70 T300,50 T400,60" fill="none" stroke="hsl(var(--accent))" strokeWidth="2" />
                <path d="M0,120 Q50,100 100,90 T200,70 T300,50 T400,60 L400,150 L0,150 Z" fill="url(#blurGrad)" />
                {/* Fake grid lines */}
                {[30, 60, 90, 120].map((y) => (
                  <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4 4" />
                ))}
              </svg>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
              <div className="text-center">
                <BarChart3 className="h-8 w-8 text-accent mx-auto mb-2" />
                <p className="text-sm font-semibold mb-1">Unlock Performance Charts</p>
                <p className="text-xs text-muted-foreground">Sign up to view rate history & trends</p>
              </div>
            </div>
          </div>

          <AuthGate
            source="fund_detail"
            title="Sign up to see full fund details"
            description="Get access to performance context, historical charts, similar funds, and investment tools — completely free."
          />
        </>
      )}

      <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> {getDisclaimer(fund?.fund_type)}
        </p>
      </div>
    </div>
  );
};

/* ── Sub-components ── */

const MetricCard = ({ label, value, change, accent, rank, subtext, icon }: {
  label: string;
  value: string;
  change?: React.ReactNode;
  accent?: boolean;
  rank?: string;
  subtext?: string;
  icon?: React.ReactNode;
}) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-center justify-between mb-1.5">
      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      {icon && <span className="text-muted-foreground">{icon}</span>}
    </div>
    <p className={`font-bold text-xl tabular-nums ${accent ? "text-accent" : "text-foreground"}`}>
      {value}
    </p>
    <div className="flex items-center gap-2 mt-1">
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

export default FundDetailPage;
