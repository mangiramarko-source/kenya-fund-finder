import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Shield, ExternalLink, Heart, GitCompareArrows, Calculator,
  TrendingUp, Wallet, Clock, Activity, Users, Award, AlertTriangle, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchFundBySlug, fetchFunds, fetchFundSnapshots, fetchHistoricalYields,
  type FundFromDB, type YieldSnapshot, type HistoricalYield,
} from "@/lib/api";
import { computeFundScore, computePeerMedians, SCORE_BAND_LABEL } from "@/lib/fundScore";
import FundScoreDiamond from "@/components/fund/FundScoreDiamond";
import FundCard from "@/components/fund/FundCard";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/hooks/useAuth";
import { useFundWatchlist } from "@/hooks/useFundWatchlist";
import { useCompare } from "@/hooks/useCompare";
import { toast } from "sonner";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "yield", label: "Yield" },
  { id: "fees", label: "Fees" },
  { id: "risk", label: "Risk" },
  { id: "liquidity", label: "Liquidity" },
  { id: "manager", label: "Manager" },
  { id: "fit", label: "Good for" },
  { id: "similar", label: "Similar" },
];

const riskCopy: Record<string, { tone: string; line: string }> = {
  low: {
    tone: "text-accent",
    line: "Capital risk is low. These funds typically invest in short-term government paper and bank deposits where price movement is minimal.",
  },
  medium: {
    tone: "text-warning",
    line: "Capital can fluctuate as the fund holds a mix of fixed-income and equity instruments. Expect some month-to-month variation in value.",
  },
  high: {
    tone: "text-destructive",
    line: "This is an equity-heavy fund. Values can swing significantly over short periods. Best suited to long-term goals (5+ years).",
  },
};

const FundReportPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavourite, toggle } = useFundWatchlist();
  const { add: addCompare } = useCompare();

  const [fund, setFund] = useState<FundFromDB | null>(null);
  const [peers, setPeers] = useState<FundFromDB[]>([]);
  const [snapshots, setSnapshots] = useState<YieldSnapshot[]>([]);
  const [history, setHistory] = useState<HistoricalYield[]>([]);
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);

  useDocumentTitle(
    fund ? `${fund.name} — Kenya Fund Report` : "Fund Report",
    fund ? `${fund.name} by ${fund.manager}. Annual yield ${fund.annual_yield}%. Min investment KES ${fund.minimum_investment.toLocaleString()}. ${fund.cma_licensed ? "CMA regulated." : ""}` : undefined,
  );

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([fetchFundBySlug(slug), fetchFunds()])
      .then(async ([f, all]) => {
        setFund(f);
        if (f) {
          setPeers(all.filter((p) => p.fund_type === f.fund_type && p.id !== f.id));
          const [s, h] = await Promise.all([
            fetchFundSnapshots(f.id),
            fetchHistoricalYields(f.id),
          ]);
          setSnapshots(s);
          setHistory(h);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const peerMedians = useMemo(() => computePeerMedians(fund ? [fund, ...peers] : []), [fund, peers]);
  const score = useMemo(() => fund ? computeFundScore(fund, peerMedians) : null, [fund, peerMedians]);

  useJsonLd(fund ? {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: fund.name,
    description: fund.description,
    provider: { "@type": "Organization", name: fund.manager },
    url: `https://kenyafundfinder.com/funds/${fund.slug}`,
    interestRate: { "@type": "QuantitativeValue", value: fund.annual_yield, unitText: "percent per annum" },
  } : null);
  useJsonLd(fund ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://kenyafundfinder.com/" },
      { "@type": "ListItem", position: 2, name: "Funds", item: "https://kenyafundfinder.com/funds" },
      { "@type": "ListItem", position: 3, name: fund.name, item: `https://kenyafundfinder.com/funds/${fund.slug}` },
    ],
  } : null);

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-10 max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-muted/40 rounded animate-pulse mb-4" />
        <div className="h-32 bg-muted/30 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!fund || !score) {
    return (
      <div className="px-4 md:px-6 py-20 max-w-3xl mx-auto text-center">
        <h1 className="font-heading text-2xl mb-2">Fund not found</h1>
        <p className="text-muted-foreground mb-6">The fund you're looking for doesn't exist or has been removed.</p>
        <Button asChild><Link to="/funds"><ArrowLeft className="mr-2 h-4 w-4" /> Browse all funds</Link></Button>
      </div>
    );
  }

  // Build chart data
  const sorted = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
  const sliced = sorted.slice(-range);
  const chartData = sliced.length >= 2 ? sliced : null;

  const peerScored = peers
    .map((p) => ({ p, sc: computeFundScore(p, peerMedians) }))
    .sort((a, b) => Math.abs(a.sc.total - score.total) - Math.abs(b.sc.total - score.total))
    .slice(0, 3);

  const onCompare = () => {
    addCompare(fund);
    toast.success(`${fund.name} added to compare`);
  };

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 max-w-5xl mx-auto">
      <Link to="/funds" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-3.5 w-3.5" /> All funds
      </Link>

      {/* HEADER */}
      <header className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
          <div className="md:hidden mx-auto">
            <FundScoreDiamond score={score} size={96} showLabels />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {fund.cma_licensed && (
                <Badge variant="outline" className="text-[10px] gap-1 rounded-full border-accent/40 text-accent">
                  <Shield className="h-3 w-3" /> CMA regulated
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] rounded-full capitalize">{fund.risk_level} risk</Badge>
              <Badge variant="secondary" className="text-[10px] rounded-full">
                {fund.fund_type.replace("_", " ")}
              </Badge>
            </div>
            <h1 className="font-heading text-2xl md:text-3xl font-semibold text-foreground leading-tight">{fund.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">by {fund.manager}</p>

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={() => toggle(fund.id, fund.name)} className="gap-1.5">
                <Heart className={`h-3.5 w-3.5 ${isFavourite(fund.id) ? "fill-accent text-accent" : ""}`} />
                {isFavourite(fund.id) ? "Saved" : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={onCompare} className="gap-1.5">
                <GitCompareArrows className="h-3.5 w-3.5" /> Compare
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(`/calculator?fund=${fund.slug}`)} className="gap-1.5">
                <Calculator className="h-3.5 w-3.5" /> Calculator
              </Button>
              {fund.website && (
                <a href={fund.website} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" /> Official site</Button>
                </a>
              )}
            </div>
          </div>
          <div className="hidden md:block shrink-0 text-center">
            <FundScoreDiamond score={score} size={120} showLabels />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Kenya Fund Score</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: `var(--accent)` }}>{SCORE_BAND_LABEL[score.band]}</p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t border-border/60">
          Updated {new Date(fund.updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </header>

      {/* Section nav */}
      <nav className="sticky top-14 md:top-16 z-10 -mx-4 md:mx-0 mt-4 px-4 md:px-0 py-2 bg-background/95 backdrop-blur border-b border-border/60 overflow-x-auto no-scrollbar">
        <div className="flex gap-1 min-w-max">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="px-3 h-8 inline-flex items-center text-xs font-medium text-muted-foreground hover:text-accent rounded-md hover:bg-accent/10">
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mt-6 space-y-8">
        {/* OVERVIEW */}
        <Section id="overview" title="Overview" icon={<Activity className="h-4 w-4" />}>
          {fund.description && <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{fund.description}</p>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Annual yield" value={`${fund.annual_yield.toFixed(2)}%`} accent />
            <Stat label="Daily yield" value={`${fund.daily_yield.toFixed(3)}%`} />
            <Stat label="Minimum investment" value={`KES ${fund.minimum_investment.toLocaleString()}`} />
            <Stat label="Withdrawal time" value={fund.withdrawal_time} />
          </div>
        </Section>

        {/* YIELD HISTORY */}
        <Section id="yield" title="Yield history" icon={<TrendingUp className="h-4 w-4" />}>
          <div className="flex items-center gap-1 mb-3">
            {([7, 30, 90] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 h-7 rounded-md text-[11px] font-medium ${
                  range === r ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}D
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            {chartData ? (
              <YieldChart data={chartData} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Not enough history yet to draw a chart.</p>
            )}
          </div>
        </Section>

        {/* FEES */}
        <Section id="fees" title="Fees" icon={<Wallet className="h-4 w-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FeeCard label="Management fee" value={`${fund.management_fee.toFixed(2)}%`} note="Charged annually on the value of your investment." />
            <FeeCard label="Exit fee" value={fund.exit_fee != null ? `${fund.exit_fee.toFixed(2)}%` : "None disclosed"} note="Charged when you withdraw." />
            <FeeCard label="Withholding tax" value="15%" note="Government tax on interest earned. Deducted at source." />
          </div>
        </Section>

        {/* RISK */}
        <Section id="risk" title="Risk" icon={<AlertTriangle className="h-4 w-4" />}>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className={`text-xs capitalize ${riskCopy[fund.risk_level || "low"].tone} border-current`}>
                {fund.risk_level} risk
              </Badge>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{riskCopy[fund.risk_level || "low"].line}</p>
          </div>
        </Section>

        {/* LIQUIDITY */}
        <Section id="liquidity" title="Liquidity" icon={<Clock className="h-4 w-4" />}>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-3xl font-mono font-bold text-foreground">{fund.withdrawal_time}</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              How long it takes for cash to land in your account after you request a withdrawal. Faster is more useful for emergency funds; longer doesn't necessarily mean a worse fund.
            </p>
          </div>
        </Section>

        {/* MANAGER */}
        <Section id="manager" title="Fund manager" icon={<Users className="h-4 w-4" />}>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="font-heading text-lg text-foreground">{fund.manager}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 text-sm">
              {fund.manager_years_active != null && (
                <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Years active</p><p className="font-mono">{fund.manager_years_active}</p></div>
              )}
              {fund.aum_kes && (
                <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">AUM</p><p className="font-mono">KES {(fund.aum_kes / 1e9).toFixed(2)}B</p></div>
              )}
              {fund.inception_date && (
                <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Inception</p><p className="font-mono">{new Date(fund.inception_date).getFullYear()}</p></div>
              )}
            </div>
          </div>
        </Section>

        {/* GOOD / NOT GOOD */}
        <Section id="fit" title="Good for / Not good for" icon={<Award className="h-4 w-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FitCard tone="good" title="Good for" items={fund.good_for?.length ? fund.good_for : defaultGoodFor(fund)} />
            <FitCard tone="bad" title="Not good for" items={fund.not_good_for?.length ? fund.not_good_for : defaultNotGoodFor(fund)} />
          </div>
        </Section>

        {/* SIMILAR */}
        {peerScored.length > 0 && (
          <Section id="similar" title="Similar funds" icon={<GitCompareArrows className="h-4 w-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {peerScored.map(({ p }) => (
                <FundCard key={p.id} fund={p} peerMedians={peerMedians} />
              ))}
            </div>
          </Section>
        )}

        {/* DISCLAIMER */}
        <div className="rounded-xl border border-border bg-card/60 p-5 text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-1">This is information, not financial advice.</p>
          Past performance does not guarantee future returns. {fund.cma_licensed && "This fund is regulated by the Capital Markets Authority of Kenya. "}A 15% withholding tax applies on interest income.
        </div>
      </div>
    </div>
  );
};

/* --- subcomponents --- */

const Section = ({ id, title, icon, children }: { id: string; title: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-32">
    <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground mb-3">
      <span className="text-accent">{icon}</span> {title}
    </h2>
    {children}
  </section>
);

const Stat = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
    <p className={`font-mono text-xl font-bold tabular-nums ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
  </div>
);

const FeeCard = ({ label, value, note }: { label: string; value: string; note: string }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="font-mono text-2xl font-bold text-foreground mt-1">{value}</p>
    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{note}</p>
  </div>
);

const FitCard = ({ tone, title, items }: { tone: "good" | "bad"; title: string; items: string[] }) => (
  <div className={`rounded-xl border p-5 ${tone === "good" ? "border-accent/30 bg-accent/5" : "border-destructive/30 bg-destructive/5"}`}>
    <p className={`font-semibold mb-3 ${tone === "good" ? "text-accent" : "text-destructive"}`}>{title}</p>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
          {tone === "good" ? <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" /> : <span className="text-destructive shrink-0 mt-0.5">✗</span>}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const YieldChart = ({ data }: { data: YieldSnapshot[] }) => {
  const vals = data.map((d) => d.annual_yield);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 800, H = 220, PAD = 24;
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + (H - PAD * 2) - ((d.annual_yield - min) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-56">
      <defs>
        <linearGradient id="yc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`${pts.join(" ")} ${W - PAD},${H - PAD} ${PAD},${H - PAD}`} fill="url(#yc)" />
      <polyline points={pts.join(" ")} fill="none" stroke="hsl(var(--accent))" strokeWidth={2} strokeLinejoin="round" />
      <text x={PAD} y={16} fontSize={10} fill="hsl(var(--muted-foreground))" fontFamily="monospace">{max.toFixed(2)}%</text>
      <text x={PAD} y={H - 6} fontSize={10} fill="hsl(var(--muted-foreground))" fontFamily="monospace">{min.toFixed(2)}%</text>
    </svg>
  );
};

const defaultGoodFor = (f: FundFromDB): string[] => {
  if (f.fund_type === "money_market") return ["Emergency fund or short-term savings", "Parking cash you'll need within a year", "Beginners learning how funds work"];
  if (f.fund_type === "fixed_income" || f.fund_type === "bond") return ["Predictable returns over 1–3 years", "Investors who prefer income over growth"];
  if (f.fund_type === "equity") return ["Long-term wealth building (5+ years)", "Investors comfortable with volatility"];
  return ["Diversified medium-term goals"];
};
const defaultNotGoodFor = (f: FundFromDB): string[] => {
  if (f.fund_type === "money_market") return ["Beating inflation by a wide margin", "Long-term wealth building on its own"];
  if (f.fund_type === "equity") return ["Money you'll need within 12 months", "Investors who can't stomach a 20%+ drawdown"];
  return ["Money you'll need within 30 days"];
};

export default FundReportPage;
