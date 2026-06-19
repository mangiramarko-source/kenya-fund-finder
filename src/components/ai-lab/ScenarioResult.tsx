import { AlertTriangle, ArrowLeftRight, Calculator, ExternalLink, FileText, Info, Newspaper, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import type { RouterResult } from "@/lib/aiLab/router";
import type { ComparableAsset } from "@/lib/aiLab/marketContext";
import type { AssetHistory, LookbackDays } from "@/lib/aiLab/history";
import {
  formatReturnLabel,
  formatTrendLabel,
  formatHistoryAssumption,
} from "@/lib/aiLab/history";
import Sparkline from "@/components/Sparkline";
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

interface ScenarioResultProps {
  result: RouterResult | null;
  history?: Record<string, AssetHistory> | null;
  historyLoading?: boolean;
  lookbackDays?: LookbackDays;
}

const ScenarioResult = ({ result, history, historyLoading, lookbackDays }: ScenarioResultProps) => {
  const effectiveLookbackDays = lookbackDays ?? 30;
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
                <tr className="border-t border-border/40">
                  <td className="py-1.5 pr-3 text-xs text-muted-foreground">{formatReturnLabel(effectiveLookbackDays)}</td>
                  <td className="py-1.5 px-2 text-right">
                    {historyLoading ? <span className="text-muted-foreground">…</span> : fmtPct(history?.[a.symbol]?.returnPct ?? null)}
                  </td>
                  <td className="py-1.5 pl-2 text-right">
                    {historyLoading ? <span className="text-muted-foreground">…</span> : fmtPct(history?.[b.symbol]?.returnPct ?? null)}
                  </td>
                </tr>
                <tr className="border-t border-border/40">
                  <td className="py-1.5 pr-3 text-xs text-muted-foreground">{formatTrendLabel(effectiveLookbackDays)}</td>
                  <td className="py-1.5 px-2 text-right">
                    {history?.[a.symbol]?.points?.length ? (
                      <div className="inline-flex justify-end w-full">
                        <Sparkline
                          data={history[a.symbol].points}
                          width={90}
                          height={22}
                          color="auto"
                          trend={(history[a.symbol].returnPct ?? 0) > 0 ? "up" : (history[a.symbol].returnPct ?? 0) < 0 ? "down" : "flat"}
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">{historyLoading ? "…" : "—"}</span>
                    )}
                  </td>
                  <td className="py-1.5 pl-2 text-right">
                    {history?.[b.symbol]?.points?.length ? (
                      <div className="inline-flex justify-end w-full">
                        <Sparkline
                          data={history[b.symbol].points}
                          width={90}
                          height={22}
                          color="auto"
                          trend={(history[b.symbol].returnPct ?? 0) > 0 ? "up" : (history[b.symbol].returnPct ?? 0) < 0 ? "down" : "flat"}
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">{historyLoading ? "…" : "—"}</span>
                    )}
                  </td>
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
            <li>{sanitizeOutput(formatHistoryAssumption(effectiveLookbackDays))}</li>
          </ul>
        </Section>
        <Disclaimer text={result.disclaimer} />
      </div>
    );
  }

  if (result.kind === "news-summary") {
    const fmtDate = (iso?: string) => {
      if (!iso) return null;
      const d = new Date(iso);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString("en-KE", {
        timeZone: "Africa/Nairobi",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    };

    return (
      <div className="space-y-3">
        <Section icon={<Info className="h-3 w-3" />} title="Summary">
          <p>{sanitizeOutput(result.summary)}</p>
        </Section>
        <Section icon={<Newspaper className="h-3 w-3" />} title="Articles used">
          <div className="space-y-3">
            {result.articles.map((article, i) => (
              <div
                key={`${article.title}-${i}`}
                className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5"
              >
                <p className="text-sm font-semibold text-foreground">{sanitizeOutput(article.title)}</p>
                {article.source && (
                  <p className="text-xs text-muted-foreground">
                    Source: {sanitizeOutput(article.source)}
                  </p>
                )}
                {article.publishedAt && fmtDate(article.publishedAt) && (
                  <p className="text-xs text-muted-foreground">
                    Published: {fmtDate(article.publishedAt)}
                  </p>
                )}
                {article.relatedSymbol && (
                  <p className="text-xs text-muted-foreground">
                    Related: {sanitizeOutput(article.relatedSymbol)}
                  </p>
                )}
                {article.snippet && (
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {sanitizeOutput(article.snippet)}
                  </p>
                )}
                {article.url && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    View article
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </Section>
        <Section icon={<FileText className="h-3 w-3" />} title="Possible relevance">
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.possibleRelevance.map((item, i) => (
              <li key={i}>{sanitizeOutput(item)}</li>
            ))}
          </ul>
        </Section>
        <Section icon={<AlertTriangle className="h-3 w-3" />} title="Important notes">
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.importantNotes.map((n, i) => (
              <li key={i}>{sanitizeOutput(n)}</li>
            ))}
          </ul>
        </Section>
        <Disclaimer text={result.disclaimer} />
      </div>
    );
  }

  const fmtMovement = (n: number) => (n > 0 ? `+${n}%` : `${n}%`);
  const fmtSigned = (n: number, prefix = "") =>
    `${n >= 0 ? "+" : ""}${prefix}${n.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;

  if (result.kind === "fx-conversion") {
    const { inputs } = result;
    const amountLabel =
      inputs.fromCurrency === "KES"
        ? fmtKES(inputs.amount)
        : `${inputs.amount.toLocaleString("en-KE")} ${inputs.fromCurrency}`;
    const convertedLabel =
      inputs.toCurrency === "KES"
        ? fmtKES2(result.convertedAmount)
        : `${result.convertedAmount.toLocaleString("en-KE", { maximumFractionDigits: 2 })} ${inputs.toCurrency}`;

    return (
      <div className="space-y-3">
        <Section icon={<Info className="h-3 w-3" />} title="Summary">
          <p>{sanitizeOutput(result.summary)}</p>
        </Section>
        <Section icon={<FileText className="h-3 w-3" />} title="Assumptions">
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.assumptions.map((a, i) => (
              <li key={i}>{sanitizeOutput(a)}</li>
            ))}
          </ul>
        </Section>
        <Section icon={<Calculator className="h-3 w-3" />} title="Calculations">
          <KV k="Amount" v={amountLabel} />
          <KV k="From currency" v={inputs.fromCurrency} />
          <KV k="To currency" v={inputs.toCurrency} />
          <KV k="Rate used" v={`${inputs.rate.toLocaleString("en-KE", { maximumFractionDigits: 4 })} (${inputs.rateLabel})`} />
          <KV k="Estimated converted amount" v={convertedLabel} />
        </Section>
        <Section icon={<AlertTriangle className="h-3 w-3" />} title="Important notes">
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.importantNotes.map((n, i) => (
              <li key={i}>{sanitizeOutput(n)}</li>
            ))}
          </ul>
        </Section>
        <Disclaimer text={result.disclaimer} />
      </div>
    );
  }

  if (result.kind === "fx-move") {
    const { inputs } = result;
    return (
      <div className="space-y-3">
        <Section icon={<Info className="h-3 w-3" />} title="Summary">
          <p>{sanitizeOutput(result.summary)}</p>
        </Section>
        <Section icon={<FileText className="h-3 w-3" />} title="Assumptions">
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.assumptions.map((a, i) => (
              <li key={i}>{sanitizeOutput(a)}</li>
            ))}
          </ul>
        </Section>
        <Section icon={<Calculator className="h-3 w-3" />} title="Calculations">
          <KV k="Pair" v={inputs.pair} />
          <KV k="Current rate" v={inputs.currentRate.toLocaleString("en-KE", { maximumFractionDigits: 4 })} />
          <KV k="Movement assumption" v={fmtMovement(inputs.movementPct)} />
          <KV k="Estimated rate after movement" v={result.estimatedRateAfterMove.toLocaleString("en-KE", { maximumFractionDigits: 4 })} />
        </Section>
        <Section icon={<AlertTriangle className="h-3 w-3" />} title="Important notes">
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.importantNotes.map((n, i) => (
              <li key={i}>{sanitizeOutput(n)}</li>
            ))}
          </ul>
        </Section>
        <Disclaimer text={result.disclaimer} />
      </div>
    );
  }

  if (result.kind === "commodity-move") {
    const { inputs } = result;
    return (
      <div className="space-y-3">
        <Section icon={<Info className="h-3 w-3" />} title="Summary">
          <p>{sanitizeOutput(result.summary)}</p>
        </Section>
        <Section icon={<FileText className="h-3 w-3" />} title="Assumptions">
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.assumptions.map((a, i) => (
              <li key={i}>{sanitizeOutput(a)}</li>
            ))}
          </ul>
        </Section>
        <Section icon={<Calculator className="h-3 w-3" />} title="Calculations">
          <KV k="Commodity" v={`${inputs.symbol} · ${inputs.name}`} />
          <KV k="Current value" v={`${inputs.currentValue.toLocaleString("en-KE", { maximumFractionDigits: 2 })} (${inputs.valueLabel})`} />
          <KV k="Movement assumption" v={fmtMovement(inputs.movementPct)} />
          <KV k="Estimated value after movement" v={result.estimatedValueAfterMove.toLocaleString("en-KE", { maximumFractionDigits: 2 })} />
          <KV k="Estimated change" v={fmtSigned(result.estimatedChange)} />
        </Section>
        <Section icon={<AlertTriangle className="h-3 w-3" />} title="Important notes">
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.importantNotes.map((n, i) => (
              <li key={i}>{sanitizeOutput(n)}</li>
            ))}
          </ul>
        </Section>
        <Disclaimer text={result.disclaimer} />
      </div>
    );
  }

  if (result.kind === "stock-amount") {
    const fmtGainLoss = (n: number) => `${n >= 0 ? "+" : ""}${fmtKES(n)}`;
    return (
      <div className="space-y-3">
        <Section icon={<Info className="h-3 w-3" />} title="Summary">
          <p>{sanitizeOutput(result.summary)}</p>
        </Section>
        <Section icon={<FileText className="h-3 w-3" />} title="Assumptions">
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.assumptions.map((a, i) => (
              <li key={i}>{sanitizeOutput(a)}</li>
            ))}
          </ul>
        </Section>
        <Section icon={<Calculator className="h-3 w-3" />} title="Calculations">
          <div className="space-y-3">
            <div>
              <KV k="Starting amount" v={fmtKES(result.inputs.amount)} />
              <KV k="Stock" v={`${result.inputs.symbol} · ${result.inputs.name}`} />
              <KV k="Latest available price" v={fmtKES2(result.inputs.latestPrice)} />
              <KV k="Approximate shares" v={result.approximateShares.toLocaleString("en-KE")} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="text-left font-medium py-1 pr-3">Price movement</th>
                    <th className="text-right font-medium py-1 px-2">Estimated price</th>
                    <th className="text-right font-medium py-1 px-2">Estimated value</th>
                    <th className="text-right font-medium py-1 pl-2">Estimated gain/loss</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.movementPct} className="border-t border-border/40">
                      <td className="py-1.5 pr-3 text-xs text-muted-foreground">
                        {fmtMovement(row.movementPct)}
                      </td>
                      <td className="py-1.5 px-2 text-right">{fmtKES2(row.estimatedPrice)}</td>
                      <td className="py-1.5 px-2 text-right font-semibold">
                        {fmtKES(row.estimatedValue)}
                      </td>
                      <td className="py-1.5 pl-2 text-right">{fmtGainLoss(row.estimatedGainLoss)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
        <Section icon={<AlertTriangle className="h-3 w-3" />} title="Important notes">
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.importantNotes.map((n, i) => (
              <li key={i}>{sanitizeOutput(n)}</li>
            ))}
          </ul>
        </Section>
        <Disclaimer text={result.disclaimer} />
      </div>
    );
  }

  if (result.kind === "goal-projection") {
    const { rows, inputs, totals } = result;
    const displayRows =
      inputs.months <= 12
        ? rows
        : [
            ...rows.slice(0, 3),
            null,
            ...rows.slice(-3),
          ];
    return (
      <div className="space-y-3">
        <Section icon={<Info className="h-3 w-3" />} title="Summary">
          <p>{sanitizeOutput(result.summary)}</p>
        </Section>
        <Section icon={<FileText className="h-3 w-3" />} title="Assumptions">
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.assumptions.map((a, i) => (
              <li key={i}>{sanitizeOutput(a)}</li>
            ))}
          </ul>
        </Section>
        <Section icon={<Calculator className="h-3 w-3" />} title="Calculations">
          <div className="space-y-3">
            <div>
              <KV k="Starting amount" v={fmtKES(inputs.startAmount)} />
              <KV k="Monthly contribution" v={fmtKES(inputs.monthlyContribution)} />
              <KV k="Annual yield assumption" v={`${inputs.annualYieldPct}%`} />
              <KV k="Time period" v={`${inputs.months} months`} />
              <KV k="Total contributed" v={fmtKES2(totals.totalContributions)} />
              <KV k="Estimated gross growth" v={fmtKES2(totals.estimatedGrossGrowth)} />
              <KV k="Estimated gross value" v={fmtKES2(totals.estimatedGrossValue)} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="text-left font-medium py-1 pr-3">Month</th>
                    <th className="text-right font-medium py-1 px-2">Starting value</th>
                    <th className="text-right font-medium py-1 px-2">Contribution</th>
                    <th className="text-right font-medium py-1 px-2">Estimated growth</th>
                    <th className="text-right font-medium py-1 pl-2">Ending value</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, i) =>
                    row == null ? (
                      <tr key="ellipsis" className="border-t border-border/40">
                        <td
                          colSpan={5}
                          className="py-1.5 text-center text-xs text-muted-foreground"
                        >
                          …
                        </td>
                      </tr>
                    ) : (
                      <tr key={row.month} className="border-t border-border/40">
                        <td className="py-1.5 pr-3 text-xs text-muted-foreground">{row.month}</td>
                        <td className="py-1.5 px-2 text-right">{fmtKES2(row.startingValue)}</td>
                        <td className="py-1.5 px-2 text-right">{fmtKES2(row.contribution)}</td>
                        <td className="py-1.5 px-2 text-right">{fmtKES2(row.estimatedGrowth)}</td>
                        <td className="py-1.5 pl-2 text-right font-semibold">
                          {fmtKES2(row.endingValue)}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
        <Section icon={<AlertTriangle className="h-3 w-3" />} title="Important notes">
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.importantNotes.map((n, i) => (
              <li key={i}>{sanitizeOutput(n)}</li>
            ))}
          </ul>
        </Section>
        <Disclaimer text={result.disclaimer} />
      </div>
    );
  }

  if (result.kind === "mmf-yield-change") {
    return (
      <div className="space-y-3">
        <Section icon={<Info className="h-3 w-3" />} title="Summary">
          <p>{sanitizeOutput(result.summary)}</p>
        </Section>
        <Section icon={<Calculator className="h-3 w-3" />} title="Calculations">
          <div>
            <KV k="Amount" v={fmtKES(result.inputs.amount)} />
            <KV k="From yield" v={`${result.inputs.fromYieldPct}%`} />
            <KV k="To yield" v={`${result.inputs.toYieldPct}%`} />
            <KV k="Period" v={`${result.inputs.months} months`} />
            <KV k="From annual gross income" v={fmtKES(result.fromGrossYearly)} />
            <KV k="To annual gross income" v={fmtKES(result.toGrossYearly)} />
            <KV k="From monthly equivalent" v={fmtKES2(result.fromMonthly)} />
            <KV k="To monthly equivalent" v={fmtKES2(result.toMonthly)} />
            <KV
              k="Annual income delta"
              v={`${result.deltaYearly >= 0 ? "+" : ""}${fmtKES(result.deltaYearly)}`}
            />
          </div>
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
            This is a projection comparing two yield assumptions, not a guarantee. Actual outcomes
            can differ because of fees, taxes, compounding methods, and changing market rates.
          </p>
        </Section>
        <Disclaimer text={result.disclaimer} />
      </div>
    );
  }

  // Numeric scenario layout
  let summary: React.ReactNode = null;
  let calcs: React.ReactNode = null;
  let importantNotes: React.ReactNode = (
    <p className="text-xs text-muted-foreground">
      This is a projection, not a guarantee. Possible trade-offs include changing yields, market
      volatility, fees, and withholding tax on interest income.
    </p>
  );

  if (result.kind === "mmf") {
    summary = <p>{sanitizeOutput(result.summary)}</p>;
    calcs = (
      <>
        <KV k="Initial amount" v={fmtKES(result.inputs.amount)} />
        <KV k="Annual yield" v={`${result.inputs.annualYieldPct}%`} />
        <KV k="Period" v={`${result.inputs.months} months`} />
        <KV k="Estimated annual gross income" v={fmtKES(result.grossYearly)} />
        <KV k="Estimated monthly gross equivalent" v={fmtKES2(result.monthlyEquivalent)} />
        <KV k="Estimated daily gross equivalent (365-day simple estimate)" v={fmtKES2(result.dailyEquivalent)} />
        <KV k="Projected gross value" v={fmtKES(result.projectedGross)} />
      </>
    );
    importantNotes = (
      <p className="text-xs text-muted-foreground">
        This is a projection, not a guarantee. Actual fund distributions can differ because of
        fees, taxes, compounding methods, and changing yields.
      </p>
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
        {importantNotes}
      </Section>
      <Disclaimer text={result.disclaimer} />
    </div>
  );
};

export default ScenarioResult;
