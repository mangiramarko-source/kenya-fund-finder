import { AlertTriangle, ArrowLeftRight, Calculator, FileText, Info, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import type { RouterResult } from "@/lib/aiLab/router";
import type { ComparableAsset } from "@/lib/aiLab/marketContext";
import { sanitizeOutput } from "@/lib/aiLab/safety";

const fmtKES = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(n);

const fmtKES2 = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(n);

const Section = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border border-border bg-muted/20 p-3">
    <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
      {icon}
      <span className="text-[10px] uppercase tracking-widest font-semibold">{title}</span>
    </div>
    <div className="text-sm text-foreground/90 space-y-1">{children}</div>
  </div>
);

const Disclaimer = ({ text }: { text: string }) => (
  <p className="text-[11px] text-muted-foreground italic flex items-center gap-1.5">
    <Info className="h-3 w-3" />
    {text}
  </p>
);

const KV = ({ k, v }: { k: string; v: string }) => (
  <div className="flex items-baseline justify-between gap-3 py-1 border-b border-border/40 last:border-0">
    <span className="text-xs text-muted-foreground">{k}</span>
    <span className="text-sm font-semibold tabular-nums">{v}</span>
  </div>
);

const ScenarioResult = ({ result }: { result: RouterResult | null }) => {
  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
        Run a scenario above to see structured results here.
      </div>
    );
  }

  if (result.kind === "refusal") {
    const msg = sanitizeOutput(result.message);
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-500">Out of scope</h3>
            <p className="text-sm text-foreground/90 mt-1">{msg}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pl-6">
          {result.safeAlternatives.map((s) => (
            <span
              key={s}
              className="text-[11px] px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20"
            >
              {s}
            </span>
          ))}
        </div>
        <Disclaimer text={result.disclaimer} />
      </div>
    );
  }

  if (result.kind === "unknown") {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm">{result.message}</p>
        </div>
        {result.suggestions.length > 0 && (
          <ul className="text-xs text-muted-foreground list-disc pl-8 space-y-1">
            {result.suggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
        <Disclaimer text={result.disclaimer} />
      </div>
    );
  }

  if (result.kind === "explainer") {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-base font-semibold">{sanitizeOutput(result.title)}</h3>
        <div className="space-y-2">
          {result.paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-foreground/90 leading-relaxed">
              {sanitizeOutput(p)}
            </p>
          ))}
        </div>
        <Section icon={<FileText className="h-3 w-3" />} title="Important notes">
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.assumptions.map((a, i) => (
              <li key={i}>{sanitizeOutput(a)}</li>
            ))}
          </ul>
        </Section>
        <Disclaimer text={result.disclaimer} />
      </div>
    );
  }


  if (result.kind === "compare") {
    const fmtVal = (a: ComparableAsset) =>
      new Intl.NumberFormat("en-KE", { maximumFractionDigits: 4 }).format(a.value);
    const fmtPct = (n: number | null) => {
      if (n == null) return "—";
      const cls = n > 0 ? "text-emerald-500" : n < 0 ? "text-rose-500" : "text-muted-foreground";
      return <span className={`font-semibold ${cls}`}>{`${n > 0 ? "+" : ""}${n.toFixed(2)}%`}</span>;
    };
    const [a, b] = result.assets;
    // Build full metric list across both assets
    const metrics = new Set<string>();
    metrics.add(a.valueLabel);
    metrics.add(b.valueLabel);
    const extraLabels = new Set<string>();
    for (const x of result.assets) for (const e of x.extras ?? []) extraLabels.add(e.label);

    const valueRow = (asset: ComparableAsset, label: string) =>
      asset.valueLabel === label ? fmtVal(asset) : "—";
    const extraRow = (asset: ComparableAsset, label: string) =>
      asset.extras?.find((e) => e.label === label)?.value ?? "—";

    return (
      <div className="space-y-3">
        <Section icon={<ArrowLeftRight className="h-3 w-3" />} title="Compare">
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="text-left font-medium py-1 pr-3">Metric</th>
                  <th className="text-right font-medium py-1 px-2">
                    {a.symbol}
                    <div className="text-[10px] text-muted-foreground/70 normal-case font-normal">
                      {a.kind} · {a.name}
                    </div>
                  </th>
                  <th className="text-right font-medium py-1 pl-2">
                    {b.symbol}
                    <div className="text-[10px] text-muted-foreground/70 normal-case font-normal">
                      {b.kind} · {b.name}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...metrics].map((m) => (
                  <tr key={m} className="border-t border-border/40">
                    <td className="py-1.5 pr-3 text-xs text-muted-foreground">{m}</td>
                    <td className="py-1.5 px-2 text-right font-semibold">{valueRow(a, m)}</td>
                    <td className="py-1.5 pl-2 text-right font-semibold">{valueRow(b, m)}</td>
                  </tr>
                ))}
                <tr className="border-t border-border/40">
                  <td className="py-1.5 pr-3 text-xs text-muted-foreground">Recent change</td>
                  <td className="py-1.5 px-2 text-right">{fmtPct(a.changePct)}</td>
                  <td className="py-1.5 pl-2 text-right">{fmtPct(b.changePct)}</td>
                </tr>
                {[...extraLabels].map((lbl) => (
                  <tr key={lbl} className="border-t border-border/40">
                    <td className="py-1.5 pr-3 text-xs text-muted-foreground">{lbl}</td>
                    <td className="py-1.5 px-2 text-right text-xs">{extraRow(a, lbl)}</td>
                    <td className="py-1.5 pl-2 text-right text-xs">{extraRow(b, lbl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
        {result.diff.length > 0 && (
          <Section icon={<Calculator className="h-3 w-3" />} title="Difference">
            <div>
              {result.diff.map((d) => (
                <KV key={d.label} k={d.label} v={d.value} />
              ))}
            </div>
          </Section>
        )}
        <Section icon={<FileText className="h-3 w-3" />} title="Assumptions">
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.assumptions.map((a, i) => (
              <li key={i}>{sanitizeOutput(a)}</li>
            ))}
          </ul>
        </Section>
        <Disclaimer text={result.disclaimer} />
      </div>
    );
  }

  // Numeric scenario layout
  let summary: React.ReactNode = null;
  let calcs: React.ReactNode = null;

  if (result.kind === "mmf") {
    summary = (
      <p>
        Based on the data shown, {fmtKES(result.inputs.amount)} at {result.inputs.annualYieldPct}% over{" "}
        {result.inputs.months} months projects a gross value of{" "}
        <span className="font-semibold text-accent">{fmtKES(result.projectedGross)}</span>.
      </p>
    );
    calcs = (
      <>
        <KV k="Initial amount" v={fmtKES(result.inputs.amount)} />
        <KV k="Annual yield" v={`${result.inputs.annualYieldPct}%`} />
        <KV k="Period" v={`${result.inputs.months} months`} />
        <KV k="Gross yearly income" v={fmtKES(result.grossYearly)} />
        <KV k="Monthly equivalent" v={fmtKES2(result.monthlyEquivalent)} />
        <KV k="Projected gross value" v={fmtKES(result.projectedGross)} />
      </>
    );
  } else if (result.kind === "stock-move") {
    const Icon = result.direction === "up" ? TrendingUp : TrendingDown;
    const color = result.direction === "up" ? "text-emerald-500" : "text-rose-500";
    summary = (
      <p className="flex items-start gap-2">
        <Icon className={`h-4 w-4 mt-0.5 ${color}`} />
        <span>
          A {Math.abs(result.inputs.priceChangePct)}% {result.direction === "up" ? "rise" : "fall"} on{" "}
          {fmtKES(result.inputs.amount)} brings the position to{" "}
          <span className={`font-semibold ${color}`}>{fmtKES(result.newValue)}</span> ({result.delta >= 0 ? "+" : ""}
          {fmtKES(result.delta)}).
        </span>
      </p>
    );
    calcs = (
      <>
        <KV k="Position size" v={fmtKES(result.inputs.amount)} />
        <KV k="Price change" v={`${result.inputs.priceChangePct}%`} />
        <KV k="New value" v={fmtKES(result.newValue)} />
        <KV k="Profit / loss" v={`${result.delta >= 0 ? "+" : ""}${fmtKES(result.delta)}`} />
      </>
    );
  } else if (result.kind === "monthly-contribution") {
    summary = (
      <p>
        Contributing {fmtKES(result.inputs.monthly)} monthly on top of{" "}
        {fmtKES(result.inputs.startAmount)} at {result.inputs.annualYieldPct}% for{" "}
        {result.inputs.months} months projects to{" "}
        <span className="font-semibold text-accent">{fmtKES(result.projectedGross)}</span>.
      </p>
    );
    calcs = (
      <>
        <KV k="Starting amount" v={fmtKES(result.inputs.startAmount)} />
        <KV k="Monthly contribution" v={fmtKES(result.inputs.monthly)} />
        <KV k="Annual yield" v={`${result.inputs.annualYieldPct}%`} />
        <KV k="Period" v={`${result.inputs.months} months`} />
        <KV k="Total contributions" v={fmtKES(result.totalContributions)} />
        <KV k="Gross earnings" v={fmtKES(result.grossEarnings)} />
        <KV k="Projected gross value" v={fmtKES(result.projectedGross)} />
      </>
    );
  }

  return (
    <div className="space-y-3">
      <Section icon={<Info className="h-3 w-3" />} title="Summary">
        {summary}
      </Section>
      <Section icon={<Calculator className="h-3 w-3" />} title="Calculations">
        <div>{calcs}</div>
      </Section>
      <Section icon={<FileText className="h-3 w-3" />} title="Assumptions">
        <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
          {result.assumptions.map((a, i) => (
            <li key={i}>{sanitizeOutput(a)}</li>
          ))}
        </ul>
      </Section>
      <Section icon={<AlertTriangle className="h-3 w-3" />} title="Important notes">
        <p className="text-xs text-muted-foreground">
          This is a projection, not a guarantee. Possible trade-offs include changing yields, market
          volatility, fees, and the 15% withholding tax on interest income.
        </p>
      </Section>
      <Disclaimer text={result.disclaimer} />
    </div>
  );
};

export default ScenarioResult;
