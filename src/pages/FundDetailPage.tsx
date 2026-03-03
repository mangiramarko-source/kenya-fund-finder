import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchFundBySlug, fetchHistoricalYields, fetchFundSnapshots, type FundFromDB, type HistoricalYield, type YieldSnapshot } from "@/lib/api";
import { getDisclaimer } from "@/lib/disclaimers";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import AuthGate from "@/components/AuthGate";
import YieldChange, { formatYield } from "@/components/YieldChange";

const FundDetailPage = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [fund, setFund] = useState<FundFromDB | null>(null);
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
    fetchFundBySlug(id).then(async (f) => {
      setFund(f);
      if (f) {
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

  if (loading || authLoading) return <div className="container py-20 text-center text-muted-foreground">Loading...</div>;

  if (!fund) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Fund Not Found</h1>
        <Button asChild variant="outline"><Link to="/compare"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Compare</Link></Button>
      </div>
    );
  }

  const isAuthenticated = !!user;

  const prevSnapshot = snapshots.length > 0 ? snapshots[0] : undefined;

  return (
    <div className="container py-10 max-w-3xl">
      <Link to="/compare" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Compare
      </Link>

      <h1 className="text-2xl md:text-3xl font-bold mb-1">{fund.name}</h1>
      <p className="text-muted-foreground mb-1">{fund.manager}</p>
      <p className="text-xs text-muted-foreground mb-6">
        Last updated: {new Date(fund.updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
        {fund.fact_sheet_date && ` · Fact sheet: ${new Date(fund.fact_sheet_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}`}
      </p>

      {/* Always show annual yield as a teaser */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Annual Rate</p>
          <p className="font-bold text-lg text-accent">
            {formatYield(fund.annual_yield, fund.yield_unit)}
            {prevSnapshot && <YieldChange current={fund.annual_yield} previous={prevSnapshot.annual_yield} unit={fund.yield_unit} className="text-xs ml-1.5" />}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Daily Yield</p>
          <p className="font-bold text-lg text-accent">
            {formatYield(fund.daily_yield, fund.yield_unit)}
            {prevSnapshot && <YieldChange current={fund.daily_yield} previous={prevSnapshot.daily_yield} unit={fund.yield_unit} className="text-xs ml-1.5" />}
          </p>
        </div>
        {isAuthenticated ? (
          <>
            {[
              { label: "Management Fee", value: `${fund.management_fee}%` },
              { label: "Min. Investment", value: `KES ${fund.minimum_investment.toLocaleString()}` },
              { label: "Withdrawal", value: fund.withdrawal_time },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className="font-bold text-lg">{item.value}</p>
              </div>
            ))}
          </>
        ) : (
          <>
            {["Management Fee"].map((label) => (
              <div key={label} className="rounded-lg border border-border bg-card p-4 relative overflow-hidden">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="font-bold text-lg text-muted-foreground/30 blur-sm select-none">10.0%</p>
              </div>
            ))}
          </>
        )}
      </div>

      {isAuthenticated ? (
        <>
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-2">About This Fund</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{fund.description}</p>
          </div>

          {snapshots.length >= 1 && (() => {
            // Build chart data: snapshots + current fund values as "Today"
            const chartData = [...snapshots].reverse().map((s) => ({
              date: new Date(s.snapshot_date).toLocaleDateString("en-KE", { day: "numeric", month: "short" }),
              "Annual Rate": Number(s.annual_yield),
            }));
            // Add current values as the latest point if different from last snapshot
            const lastSnap = snapshots[0];
            if (lastSnap && (Number(lastSnap.annual_yield) !== fund.annual_yield)) {
              chartData.push({ date: "Today", "Annual Rate": fund.annual_yield });
            }
            return chartData.length > 1 ? (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Rate History</h2>
                <div className="rounded-lg border border-border bg-card p-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={["dataMin - 0.2", "dataMax + 0.2"]} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px" }} />
                      <Line type="monotone" dataKey="Annual Rate" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))", r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Rate History</h2>
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <p className="text-sm text-muted-foreground">Current annual rate: <span className="font-semibold text-accent">{fund.annual_yield}%</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Chart will appear once rate changes are recorded over time.</p>
                </div>
              </div>
            );
          })()}

          {yields.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Historical Performance</h2>
              <div className="rounded-lg border border-border bg-card p-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yields}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                    <Line type="monotone" dataKey="yield" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))" }} name="Yield (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <a href={fund.website} target="_blank" rel="noopener noreferrer">
                Visit Official Website <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/calculator?fund=${fund.slug}`}>
                <Calculator className="mr-2 h-4 w-4" /> Use in Calculator
              </Link>
            </Button>
          </div>
        </>
      ) : (
        <AuthGate
          source="fund_detail"
          title="Sign up to see full fund details"
          description="Get access to all yield metrics, fund descriptions, historical performance charts, and investment tools — completely free."
        />
      )}

      <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> {getDisclaimer(fund?.fund_type)}
        </p>
      </div>
    </div>
  );
};

export default FundDetailPage;
