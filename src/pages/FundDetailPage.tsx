import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchFundBySlug, fetchHistoricalYields, type FundFromDB, type HistoricalYield } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const FundDetailPage = () => {
  const { id } = useParams();
  const [fund, setFund] = useState<FundFromDB | null>(null);
  const [yields, setYields] = useState<HistoricalYield[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchFundBySlug(id).then(async (f) => {
      setFund(f);
      if (f) {
        const y = await fetchHistoricalYields(f.id);
        setYields(y);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container py-20 text-center text-muted-foreground">Loading...</div>;

  if (!fund) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Fund Not Found</h1>
        <Button asChild variant="outline"><Link to="/compare"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Compare</Link></Button>
      </div>
    );
  }

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Annual Yield", value: `${fund.annual_yield}%`, accent: true },
          { label: "7-Day Yield", value: `${fund.seven_day_yield}%` },
          { label: "30-Day Yield", value: `${fund.thirty_day_yield}%` },
          { label: "Management Fee", value: `${fund.management_fee}%` },
          { label: "Min. Investment", value: `KES ${fund.minimum_investment.toLocaleString()}` },
          { label: "Withdrawal", value: fund.withdrawal_time },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p className={`font-bold text-lg ${item.accent ? "text-accent" : ""}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">About This Fund</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{fund.description}</p>
      </div>

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

      <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> Yields shown are gross annual effective rates before the 15% withholding tax unless otherwise stated. Past performance is not indicative of future results. This platform does not offer investment advice. Please consult a licensed financial advisor before making investment decisions.
        </p>
      </div>
    </div>
  );
};

export default FundDetailPage;
