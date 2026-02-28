import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { funds } from "@/data/funds";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const FundDetailPage = () => {
  const { id } = useParams();
  const fund = funds.find((f) => f.id === id);

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
      <p className="text-muted-foreground mb-6">{fund.manager}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Annual Yield", value: `${fund.annualYield}%`, accent: true },
          { label: "7-Day Yield", value: `${fund.sevenDayYield}%` },
          { label: "30-Day Yield", value: `${fund.thirtyDayYield}%` },
          { label: "Management Fee", value: `${fund.managementFee}%` },
          { label: "Min. Investment", value: `KES ${fund.minimumInvestment.toLocaleString()}` },
          { label: "Withdrawal", value: fund.withdrawalTime },
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

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Historical Performance</h2>
        <div className="rounded-lg border border-border bg-card p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={fund.historicalYields}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215 14% 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215 14% 46%)" domain={["dataMin - 0.5", "dataMax + 0.5"]} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(214 20% 90%)" }} />
              <Line type="monotone" dataKey="yield" stroke="hsl(152 55% 42%)" strokeWidth={2} dot={{ fill: "hsl(152 55% 42%)" }} name="Yield (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
        <a href={fund.website} target="_blank" rel="noopener noreferrer">
          Visit Official Website <ExternalLink className="ml-2 h-4 w-4" />
        </a>
      </Button>
    </div>
  );
};

export default FundDetailPage;
