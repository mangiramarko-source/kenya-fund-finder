import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeftRight, Calculator, Database, ExternalLink, FileText, Info, Newspaper, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
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
import {
  BreakdownTable,
  CollapsibleDetails,
  Disclaimer,
  KV,
  ResultShell,
  Section,
  SummaryMetricCard,
  SummaryMetricGrid,
  TableCell,
  TableHeadCell,
  TableHeadRow,
  TableRow,
  fmtGainLoss,
  fmtKES,
  fmtKES2,
  fmtPctColored,
  signedColorClass,
} from "@/components/ai-lab/ScenarioResultPrimitives";

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
      <ResultShell className="text-center">
        <p className="text-sm text-stone-600">Run a scenario to see structured results here.</p>
      </ResultShell>
    );
  }

  if (result.kind === "refusal") {
    const msg = sanitizeOutput(result.message);
    return (
      <ResultShell className="border-amber-400/40 bg-amber-50/50 space-y-3">
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
      </ResultShell>
    );
  }

  if (result.kind === "unknown") {
    return (
      <ResultShell className="space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-stone-500 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-900">{sanitizeOutput(result.message)}</p>
        </div>
        {result.suggestions.length > 0 && (
          <div className="pl-6 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Try instead
            </p>
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
              {result.suggestions.map((s) => (
                <li key={s}>{sanitizeOutput(s)}</li>
              ))}
            </ul>
          </div>
        )}
        <Disclaimer text={result.disclaimer} />
      </ResultShell>
    );
  }


  if (result.kind === "website-lookup") {
    const topFields = result.fields.slice(0, 3);
    const restFields = result.fields.slice(3);
    return (
      <ResultShell>
        <SummaryMetricGrid>
          {topFields.map((field) => (
            <SummaryMetricCard key={field.label} label={field.label} value={field.value} />
          ))}
        </SummaryMetricGrid>
        {restFields.length > 0 && (
          <Section icon={<Database className="h-3 w-3" />} title="Website data">
            {restFields.map((field) => (
              <KV key={field.label} k={field.label} v={field.value} />
            ))}
          </Section>
        )}
        <Disclaimer text={result.disclaimer} />
      </ResultShell>
    );
  }

  if (result.kind === "explainer") {
    return (
      <ResultShell className="space-y-3">
        <h3 className="text-base font-semibold text-slate-950">{sanitizeOutput(result.title)}</h3>
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
      </ResultShell>
    );
  }


  if (result.kind === "compare") {
    const fmtVal = (a: ComparableAsset) =>
      new Intl.NumberFormat("en-KE", { maximumFractionDigits: 4 }).format(a.value);
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
      <ResultShell>
        <SummaryMetricGrid>
          <SummaryMetricCard label={a.symbol} value={fmtVal(a)} sublabel={a.name} />
          <SummaryMetricCard label={b.symbol} value={fmtVal(b)} sublabel={b.name} />
          <SummaryMetricCard label={`${a.symbol} recent change`} value={fmtPctColored(a.changePct)} sublabel={`${b.symbol}: see breakdown`} />
        </SummaryMetricGrid>
        <Section icon={<ArrowLeftRight className="h-3 w-3" />} title="Compare breakdown">
          <BreakdownTable>
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
                  <td className="py-1.5 px-2 text-right">{fmtPctColored(a.changePct)}</td>
                  <td className="py-1.5 pl-2 text-right">{fmtPctColored(b.changePct)}</td>
                </tr>
                <tr className="border-t border-border/40">
                  <td className="py-1.5 pr-3 text-xs text-muted-foreground">{formatReturnLabel(effectiveLookbackDays)}</td>
                  <td className="py-1.5 px-2 text-right">
                    {historyLoading ? <span className="text-muted-foreground">…</span> : fmtPctColored(history?.[a.symbol]?.returnPct ?? null)}
                  </td>
                  <td className="py-1.5 pl-2 text-right">
                    {historyLoading ? <span className="text-muted-foreground">…</span> : fmtPctColored(history?.[b.symbol]?.returnPct ?? null)}
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
          </BreakdownTable>
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
        
        <CollapsibleDetails title="Assumptions">
<ul className="list-disc pl-4 space-y-1 text-xs text-stone-500">
            {result.assumptions.map((a, i) => (
              <li key={i}>{sanitizeOutput(a)}</li>
            ))}
            <li>{sanitizeOutput(formatHistoryAssumption(effectiveLookbackDays))}</li>
          </ul>
        </CollapsibleDetails>
        <Disclaimer text={result.disclaimer} />
      </ResultShell>
    );
  }

  if (result.kind === "portfolio-split") {
    return (
      <ResultShell>
        <SummaryMetricGrid>
          <SummaryMetricCard label="Total amount" value={fmtKES(result.inputs.totalAmount)} />
          <SummaryMetricCard label="MMF allocation" value={fmtKES(result.inputs.mmfAmount)} sublabel={`${result.inputs.mmfPercent}%`} />
          <SummaryMetricCard label="Stock allocation" value={fmtKES(result.inputs.stockAmount)} sublabel={`${result.inputs.stockSymbol} · ${result.inputs.stockPercent}%`} />
        </SummaryMetricGrid>
        
        <CollapsibleDetails title="Assumptions">
<ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.assumptions.map((a, i) => (
              <li key={i}>{sanitizeOutput(a)}</li>
            ))}
          </ul>
        </CollapsibleDetails>
        <Section icon={<Calculator className="h-3 w-3" />} title="Allocation breakdown">
          <KV k="Total amount" v={fmtKES(result.inputs.totalAmount)} />
          <KV
            k="MMF allocation"
            v={`${fmtKES(result.inputs.mmfAmount)} (${result.inputs.mmfPercent}%)`}
          />
          <KV
            k="Stock allocation"
            v={`${fmtKES(result.inputs.stockAmount)} (${result.inputs.stockPercent}%)`}
          />
          <KV k="Stock asset" v={`${result.inputs.stockSymbol} · ${result.inputs.stockName}`} />
          <KV k="Latest stock price" v={fmtKES2(result.inputs.stockPrice)} />
          <KV k="MMF yield assumption" v={`${result.inputs.annualYieldPct}%`} />
          <KV k="Projection period" v={`${result.inputs.projectionMonths} months`} />
        </Section>
        <Section icon={<Calculator className="h-3 w-3" />} title="Scenario table">
          <BreakdownTable>
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="text-left font-medium py-1 pr-3">Stock movement</th>
                  <th className="text-right font-medium py-1 px-2">MMF est. value</th>
                  <th className="text-right font-medium py-1 px-2">Stock est. value</th>
                  <th className="text-right font-medium py-1 px-2">Total est. value</th>
                  <th className="text-right font-medium py-1 pl-2">Est. gain/loss</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.stockMovementPct} className="border-t border-border/40">
                    <td className="py-1.5 pr-3 text-xs text-muted-foreground">
                      {row.stockMovementPct > 0 ? `+${row.stockMovementPct}%` : `${row.stockMovementPct}%`}
                    </td>
                    <td className="py-1.5 px-2 text-right">{fmtKES(row.mmfEstimatedValue)}</td>
                    <td className="py-1.5 px-2 text-right">{fmtKES(row.stockEstimatedValue)}</td>
                    <td className="py-1.5 px-2 text-right font-semibold">
                      {fmtKES(row.totalEstimatedValue)}
                    </td>
                    <td className="py-1.5 pl-2 text-right">{fmtGainLoss(row.estimatedGainLoss)}</td>
                  </tr>
                ))}
              </tbody>
          </BreakdownTable>
        </Section>
        
        <CollapsibleDetails title="Notes">
<ul className="list-disc pl-4 space-y-1 text-xs text-stone-500">
            {result.importantNotes.map((n, i) => (
              <li key={i}>{sanitizeOutput(n)}</li>
            ))}
          </ul>
        </CollapsibleDetails>
        <Disclaimer text={result.disclaimer} />
      </ResultShell>
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
      <ResultShell>
        <SummaryMetricGrid>
          <SummaryMetricCard label="Articles" value={result.articles.length} sublabel="From KenyaFundFinder news data" />
        </SummaryMetricGrid>
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
        
        <CollapsibleDetails title="Notes">
<ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.importantNotes.map((n, i) => (
              <li key={i}>{sanitizeOutput(n)}</li>
            ))}
          </ul>
        </CollapsibleDetails>
        <Disclaimer text={result.disclaimer} />
      </ResultShell>
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
      <ResultShell>
        <SummaryMetricGrid>
          <SummaryMetricCard label="Amount in" value={amountLabel} />
          <SummaryMetricCard label="Converted out" value={convertedLabel} />
          <SummaryMetricCard label="Rate used" value={inputs.rate.toLocaleString("en-KE", { maximumFractionDigits: 4 })} sublabel={inputs.rateLabel} />
        </SummaryMetricGrid>
        
        <CollapsibleDetails title="Assumptions">
<ul className="list-disc pl-4 space-y-1 text-xs text-stone-500">
            {result.assumptions.map((a, i) => (
              <li key={i}>{sanitizeOutput(a)}</li>
            ))}
          </ul>
        </CollapsibleDetails>
        <Section icon={<Calculator className="h-3 w-3" />} title="Calculations">
          <KV k="Amount" v={amountLabel} />
          <KV k="From currency" v={inputs.fromCurrency} />
          <KV k="To currency" v={inputs.toCurrency} />
          <KV k="Rate used" v={`${inputs.rate.toLocaleString("en-KE", { maximumFractionDigits: 4 })} (${inputs.rateLabel})`} />
          <KV k="Estimated converted amount" v={convertedLabel} />
        </Section>
        
        <CollapsibleDetails title="Notes">
<ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.importantNotes.map((n, i) => (
              <li key={i}>{sanitizeOutput(n)}</li>
            ))}
          </ul>
        </CollapsibleDetails>
        <Disclaimer text={result.disclaimer} />
      </ResultShell>
    );
  }

  if (result.kind === "fx-move") {
    const { inputs } = result;
    return (
      <ResultShell>
        
        <CollapsibleDetails title="Assumptions">
<ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.assumptions.map((a, i) => (
              <li key={i}>{sanitizeOutput(a)}</li>
            ))}
          </ul>
        </CollapsibleDetails>
        <Section icon={<Calculator className="h-3 w-3" />} title="Calculations">
          <KV k="Pair" v={inputs.pair} />
          <KV k="Current rate" v={inputs.currentRate.toLocaleString("en-KE", { maximumFractionDigits: 4 })} />
          <KV k="Movement assumption" v={fmtMovement(inputs.movementPct)} />
          <KV k="Estimated rate after movement" v={result.estimatedRateAfterMove.toLocaleString("en-KE", { maximumFractionDigits: 4 })} />
        </Section>
        
        <CollapsibleDetails title="Notes">
<ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.importantNotes.map((n, i) => (
              <li key={i}>{sanitizeOutput(n)}</li>
            ))}
          </ul>
        </CollapsibleDetails>
        <Disclaimer text={result.disclaimer} />
      </ResultShell>
    );
  }

  if (result.kind === "commodity-move") {
    const { inputs } = result;
    return (
      <ResultShell>
        
        <CollapsibleDetails title="Assumptions">
<ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.assumptions.map((a, i) => (
              <li key={i}>{sanitizeOutput(a)}</li>
            ))}
          </ul>
        </CollapsibleDetails>
        <Section icon={<Calculator className="h-3 w-3" />} title="Calculations">
          <KV k="Commodity" v={`${inputs.symbol} · ${inputs.name}`} />
          <KV k="Current value" v={`${inputs.currentValue.toLocaleString("en-KE", { maximumFractionDigits: 2 })} (${inputs.valueLabel})`} />
          <KV k="Movement assumption" v={fmtMovement(inputs.movementPct)} />
          <KV k="Estimated value after movement" v={result.estimatedValueAfterMove.toLocaleString("en-KE", { maximumFractionDigits: 2 })} />
          <KV k="Estimated change" v={fmtSigned(result.estimatedChange)} />
        </Section>
        
        <CollapsibleDetails title="Notes">
<ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.importantNotes.map((n, i) => (
              <li key={i}>{sanitizeOutput(n)}</li>
            ))}
          </ul>
        </CollapsibleDetails>
        <Disclaimer text={result.disclaimer} />
      </ResultShell>
    );
  }

  if (result.kind === "stock-amount") {
    return (
      <ResultShell>
        <SummaryMetricGrid>
          <SummaryMetricCard label="Starting amount" value={fmtKES(result.inputs.amount)} />
          <SummaryMetricCard label="Latest price" value={fmtKES2(result.inputs.latestPrice)} sublabel={result.inputs.symbol} />
          <SummaryMetricCard label="Approx. shares" value={result.approximateShares.toLocaleString("en-KE")} />
        </SummaryMetricGrid>
        
        <CollapsibleDetails title="Assumptions">
<ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.assumptions.map((a, i) => (
              <li key={i}>{sanitizeOutput(a)}</li>
            ))}
          </ul>
        </CollapsibleDetails>
        <Section icon={<Calculator className="h-3 w-3" />} title="Calculations">
          <div className="space-y-3">
            <div>
              <KV k="Starting amount" v={fmtKES(result.inputs.amount)} />
              <KV k="Stock" v={`${result.inputs.symbol} · ${result.inputs.name}`} />
              <KV k="Latest available price" v={fmtKES2(result.inputs.latestPrice)} />
              <KV k="Approximate shares" v={result.approximateShares.toLocaleString("en-KE")} />
            </div>
            <BreakdownTable>
              <thead>
                <TableHeadRow>
                  <TableHeadCell>Price movement</TableHeadCell>
                  <TableHeadCell align="right">Estimated price</TableHeadCell>
                  <TableHeadCell align="right">Estimated value</TableHeadCell>
                  <TableHeadCell align="right">Est. gain/loss</TableHeadCell>
                </TableHeadRow>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <TableRow key={row.movementPct}>
                    <TableCell>{fmtMovement(row.movementPct)}</TableCell>
                    <TableCell align="right">{fmtKES2(row.estimatedPrice)}</TableCell>
                    <TableCell align="right" className="font-semibold">{fmtKES(row.estimatedValue)}</TableCell>
                    <TableCell align="right">{fmtGainLoss(row.estimatedGainLoss)}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </BreakdownTable>
          </div>
        </Section>
        
        <CollapsibleDetails title="Notes">
<ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.importantNotes.map((n, i) => (
              <li key={i}>{sanitizeOutput(n)}</li>
            ))}
          </ul>
        </CollapsibleDetails>
        <Disclaimer text={result.disclaimer} />
      </ResultShell>
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
      <ResultShell>
        <SummaryMetricGrid>
          <SummaryMetricCard label="Estimated gross value" value={fmtKES2(totals.estimatedGrossValue)} />
          <SummaryMetricCard label="Total contributed" value={fmtKES2(totals.totalContributions)} />
          <SummaryMetricCard label="Estimated gross growth" value={fmtKES2(totals.estimatedGrossGrowth)} valueClassName={signedColorClass(totals.estimatedGrossGrowth)} />
        </SummaryMetricGrid>
        
        <CollapsibleDetails title="Assumptions">
<ul className="list-disc pl-4 space-y-1 text-xs text-stone-500">
            {result.assumptions.map((a, i) => (
              <li key={i}>{sanitizeOutput(a)}</li>
            ))}
          </ul>
        </CollapsibleDetails>
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
            <BreakdownTable>
              <thead>
                <TableHeadRow>
                  <TableHeadCell>Month</TableHeadCell>
                  <TableHeadCell align="right">Starting value</TableHeadCell>
                  <TableHeadCell align="right">Contribution</TableHeadCell>
                  <TableHeadCell align="right">Estimated growth</TableHeadCell>
                  <TableHeadCell align="right">Ending value</TableHeadCell>
                </TableHeadRow>
              </thead>
              <tbody>
                {displayRows.map((row, i) =>
                  row == null ? (
                    <TableRow key={`ellipsis-${i}`}>
                      <TableCell colSpan={5} className="text-center !text-stone-500">
                        …
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={row.month}>
                      <TableCell>{row.month}</TableCell>
                      <TableCell align="right">{fmtKES2(row.startingValue)}</TableCell>
                      <TableCell align="right">{fmtKES2(row.contribution)}</TableCell>
                      <TableCell align="right">{fmtKES2(row.estimatedGrowth)}</TableCell>
                      <TableCell align="right" className="font-semibold">
                        {fmtKES2(row.endingValue)}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </tbody>
            </BreakdownTable>
          </div>
        </Section>
        
        <CollapsibleDetails title="Notes">
<ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.importantNotes.map((n, i) => (
              <li key={i}>{sanitizeOutput(n)}</li>
            ))}
          </ul>
        </CollapsibleDetails>
        <Disclaimer text={result.disclaimer} />
      </ResultShell>
    );
  }

  if (result.kind === "mmf-yield-change") {
    return (
      <ResultShell>
        <SummaryMetricGrid>
          <SummaryMetricCard label="From annual income" value={fmtKES(result.fromGrossYearly)} sublabel={`${result.inputs.fromYieldPct}% yield`} />
          <SummaryMetricCard label="To annual income" value={fmtKES(result.toGrossYearly)} sublabel={`${result.inputs.toYieldPct}% yield`} />
          <SummaryMetricCard label="Annual delta" value={`${result.deltaYearly >= 0 ? "+" : ""}${fmtKES(result.deltaYearly)}`} valueClassName={signedColorClass(result.deltaYearly)} />
        </SummaryMetricGrid>
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
        
        <CollapsibleDetails title="Assumptions">
<ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {result.assumptions.map((a, i) => (
              <li key={i}>{sanitizeOutput(a)}</li>
            ))}
          </ul>
        </CollapsibleDetails>
        
        <CollapsibleDetails title="Notes">
<p className="text-xs text-muted-foreground">
            This is a projection comparing two yield assumptions, not a guarantee. Actual outcomes
            can differ because of fees, taxes, compounding methods, and changing market rates.
          </p>
        </CollapsibleDetails>
        <Disclaimer text={result.disclaimer} />
      </ResultShell>
    );
  }

  // Numeric scenario layout
  let calcs: React.ReactNode = null;
  let importantNotes: React.ReactNode = (
    <p className="text-xs text-muted-foreground">
      This is a projection, not a guarantee. Possible trade-offs include changing yields, market
      volatility, fees, and withholding tax on interest income.
    </p>
  );

  if (result.kind === "mmf") {
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
    calcs = (
      <>
        <KV k="Position size" v={fmtKES(result.inputs.amount)} />
        <KV k="Price change" v={`${result.inputs.priceChangePct}%`} />
        <KV k="New value" v={fmtKES(result.newValue)} />
        <KV k="Profit / loss" v={`${result.delta >= 0 ? "+" : ""}${fmtKES(result.delta)}`} />
      </>
    );
  } else if (result.kind === "monthly-contribution") {
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

  const metricCards =
    result.kind === "mmf" ? (
      <SummaryMetricGrid>
        <SummaryMetricCard label="Projected gross" value={fmtKES(result.projectedGross)} />
        <SummaryMetricCard label="Monthly equivalent" value={fmtKES2(result.monthlyEquivalent)} />
        <SummaryMetricCard label="Annual yield" value={`${result.inputs.annualYieldPct}%`} sublabel={fmtKES(result.inputs.amount)} />
      </SummaryMetricGrid>
    ) : result.kind === "stock-move" ? (
      <SummaryMetricGrid>
        <SummaryMetricCard label="New value" value={fmtKES(result.newValue)} />
        <SummaryMetricCard label="Profit / loss" value={`${result.delta >= 0 ? "+" : ""}${fmtKES(result.delta)}`} valueClassName={signedColorClass(result.delta)} />
        <SummaryMetricCard label="Price change" value={`${result.inputs.priceChangePct}%`} sublabel={fmtKES(result.inputs.amount)} />
      </SummaryMetricGrid>
    ) : null;

  return (
    <ResultShell>
      {metricCards}
      <Section icon={<Calculator className="h-3 w-3" />} title="Calculations">
        <div>{calcs}</div>
      </Section>
      
        <CollapsibleDetails title="Assumptions">
<ul className="list-disc pl-4 space-y-1 text-xs text-stone-500">
          {result.assumptions.map((a, i) => (
            <li key={i}>{sanitizeOutput(a)}</li>
          ))}
        </ul>
        </CollapsibleDetails>
      
        <CollapsibleDetails title="Notes">
{importantNotes}
        </CollapsibleDetails>
      <Disclaimer text={result.disclaimer} />
    </ResultShell>
  );
};

export default ScenarioResult;
