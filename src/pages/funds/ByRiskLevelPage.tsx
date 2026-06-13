import { Link } from "react-router-dom";
import DataViewPage from "@/components/funds/DataViewPage";
import { Badge } from "@/components/ui/badge";
import type { FundFromDB, FundType } from "@/lib/api";

/**
 * Risk grouping is derived from fund category, not from a per-fund risk field.
 * This is a conservative, deterministic mapping based on the typical asset
 * composition of each category. Verify with each fund's fact sheet.
 */
const RISK_BUCKETS: { key: string; label: string; description: string; types: FundType[] }[] = [
  {
    key: "low",
    label: "Lower volatility (short-term debt)",
    description:
      "Funds that invest primarily in short-term debt instruments such as Treasury bills, commercial paper, and fixed deposits. Day-to-day price movements are typically small.",
    types: ["money_market"],
  },
  {
    key: "low_med",
    label: "Lower–medium volatility (longer-dated debt)",
    description:
      "Funds that invest in longer-dated debt instruments such as government and corporate bonds. The fund's value can move with interest rates.",
    types: ["fixed_income", "bond"],
  },
  {
    key: "medium",
    label: "Medium volatility (mixed assets)",
    description:
      "Funds that hold a mix of shares and interest-paying instruments. Returns and price movements depend on both markets.",
    types: ["balanced"],
  },
  {
    key: "high",
    label: "Higher volatility (equity)",
    description:
      "Funds that invest primarily in listed shares. The fund's value can rise or fall significantly in the short term.",
    types: ["equity"],
  },
  {
    key: "varies",
    label: "Varies (specialised mandates)",
    description:
      "Thematic, Shariah-compliant, high-yield, and other specialised funds. Read each fund's fact sheet for its specific strategy.",
    types: ["special"],
  },
];

const ByRiskLevelPage = () => (
  <DataViewPage
    title="Funds by Risk Level"
    intro="Published funds grouped by typical price-movement profile, derived from each fund's category. This is a category-based grouping — it does not replace the risk disclosures in each fund's official fact sheet."
    methodology="Risk grouping is derived from the fund category we have on file, not from a per-fund risk rating. Within each group, individual funds can have different underlying holdings and risk profiles. Verify each fund's risk disclosures with the fund manager before making decisions."
    seoTitle="Funds by Risk Level — KenyaFundFinder"
    seoDescription="Kenyan unit trusts grouped by typical price-movement profile, derived from each fund's category."
  >
    {(funds) => {
      const usedIds = new Set<string>();
      const groups = RISK_BUCKETS.map((bucket) => {
        const matches = funds.filter((f) => bucket.types.includes(f.fund_type as FundType));
        matches.forEach((f) => usedIds.add(f.id));
        return { ...bucket, funds: matches };
      });
      const uncategorised = funds.filter((f) => !usedIds.has(f.id));

      return (
        <div className="space-y-5">
          {groups.map((group) => (
            group.funds.length > 0 && <RiskGroup key={group.key} {...group} />
          ))}
          {uncategorised.length > 0 && (
            <RiskGroup
              key="other"
              label="Other"
              description="Funds whose category is not currently mapped to a risk grouping."
              funds={uncategorised}
            />
          )}
        </div>
      );
    }}
  </DataViewPage>
);

const RiskGroup = ({
  label, description, funds,
}: { label: string; description: string; funds: FundFromDB[] }) => (
  <section className="rounded-xl border border-border bg-card overflow-hidden">
    <div className="px-4 py-3 border-b border-border/60 bg-muted/20">
      <h2 className="text-sm font-semibold text-foreground">{label}</h2>
      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
    </div>
    <ul className="divide-y divide-border/40">
      {funds.map((f) => (
        <li key={f.id} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-muted/20">
          <div className="min-w-0">
            <Link to={`/compare/${f.slug}`} className="text-sm font-semibold text-foreground hover:text-accent">
              {f.name}
            </Link>
            <p className="text-[11px] text-muted-foreground truncate">{f.manager}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge variant="secondary" className="text-[10px] rounded-md">
              {labelForType(f.fund_type as FundType)}
            </Badge>
            <span className="text-sm font-semibold tabular-nums text-accent">{f.annual_yield.toFixed(2)}%</span>
          </div>
        </li>
      ))}
    </ul>
  </section>
);

const TYPE_LABELS: Record<FundType, string> = {
  money_market: "Money Market",
  fixed_income: "Fixed Income",
  balanced: "Balanced",
  equity: "Equity",
  bond: "Bond",
  special: "Special",
};

const labelForType = (t: FundType) => TYPE_LABELS[t] || String(t);

export default ByRiskLevelPage;
