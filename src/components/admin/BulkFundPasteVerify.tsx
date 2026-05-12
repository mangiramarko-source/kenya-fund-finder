import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { parseBulkFundText, type ParsedRow } from "@/lib/bulkFundParser";
import { FUND_TYPE_LABELS } from "@/lib/api";
import { CheckCircle2, AlertTriangle, XCircle, Search, FileText } from "lucide-react";

interface ExistingFund {
  id: string;
  manager: string;
  fund_type: string;
  yield_unit: string;
  annual_yield: number;
}

type MatchKind = "matched" | "review" | "new";
interface MatchInfo {
  kind: MatchKind;
  fund?: ExistingFund;
  prevAnnual?: number;
  drift?: number; // % change vs current DB value
}

const SAMPLE = `Fund TypeFund ManagerCurrencyDaily Yield (%)Annual Rate (%)Money Mkt FundBritamSh9.269.71Money Mkt FundICEASh7.758.06Money Mkt FundCytonnSh11.4512.13Money Mkt FundCytonnUSD5.575.72Fixed Income FundICEASh12.0013.82Fixed Income FundICEAUSD7.007.50Balanced FundBritamSh167.09172.49Equity FundICEASh157.84157.84`;

function compositeKey(manager: string, fund_type: string, yield_unit: string) {
  return `${manager.trim().toLowerCase()}|${fund_type}|${yield_unit}`;
}

const StatusBadge = ({ row, match }: { row: ParsedRow; match?: MatchInfo }) => {
  if (row.status !== "ok") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-destructive">
        <XCircle className="h-3 w-3" /> UNPARSED
      </span>
    );
  }
  if (!match || match.kind === "new") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500">
        <span className="h-2 w-2 rounded-full bg-red-500" /> NEW
      </span>
    );
  }
  if (match.kind === "review") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-yellow-500">
        <span className="h-2 w-2 rounded-full bg-yellow-500" /> REVIEW
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
      <CheckCircle2 className="h-3 w-3" /> MATCHED
    </span>
  );
};

const BulkFundPasteVerify = () => {
  const [raw, setRaw] = useState(SAMPLE);
  const [existing, setExisting] = useState<ExistingFund[]>([]);
  const [loadedDb, setLoadedDb] = useState(false);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<ReturnType<typeof parseBulkFundText> | null>(null);

  const loadExisting = async () => {
    const { data, error } = await supabase
      .from("funds")
      .select("id, manager, fund_type, yield_unit, annual_yield");
    if (!error && data) {
      setExisting(data as ExistingFund[]);
      setLoadedDb(true);
    }
  };

  const handleParse = async () => {
    setRunning(true);
    if (!loadedDb) await loadExisting();
    setReport(parseBulkFundText(raw));
    setRunning(false);
  };

  const matches = useMemo<Record<number, MatchInfo>>(() => {
    if (!report) return {};
    const byKey = new Map<string, ExistingFund>();
    for (const f of existing) {
      byKey.set(compositeKey(f.manager, f.fund_type, f.yield_unit), f);
    }
    const out: Record<number, MatchInfo> = {};
    for (const r of report.rows) {
      if (r.status !== "ok" || !r.fund_type || !r.yield_unit) {
        out[r.index] = { kind: "new" };
        continue;
      }
      const exact = byKey.get(compositeKey(r.manager, r.fund_type, r.yield_unit));
      if (exact) {
        const drift = exact.annual_yield > 0
          ? Math.abs(((r.annual_yield ?? 0) - exact.annual_yield) / exact.annual_yield) * 100
          : 0;
        out[r.index] = { kind: "matched", fund: exact, prevAnnual: exact.annual_yield, drift };
        continue;
      }
      // Fuzzy: same fund_type+unit, manager substring either direction
      const fuzzy = existing.find(
        (f) =>
          f.fund_type === r.fund_type &&
          f.yield_unit === r.yield_unit &&
          (
            f.manager.toLowerCase().includes(r.manager.toLowerCase()) ||
            r.manager.toLowerCase().includes(f.manager.toLowerCase())
          ),
      );
      if (fuzzy) {
        out[r.index] = { kind: "review", fund: fuzzy, prevAnnual: fuzzy.annual_yield };
      } else {
        out[r.index] = { kind: "new" };
      }
    }
    return out;
  }, [report, existing]);

  const counts = useMemo(() => {
    if (!report) return { ok: 0, unparsed: 0, matched: 0, review: 0, new: 0, warn: 0 };
    let ok = 0, unparsed = 0, matched = 0, review = 0, neu = 0, warn = 0;
    for (const r of report.rows) {
      if (r.status === "ok") ok++; else unparsed++;
      const m = matches[r.index];
      if (m?.kind === "matched") matched++;
      else if (m?.kind === "review") review++;
      else neu++;
      if (r.warnings.length > 0) warn++;
      if ((m?.drift ?? 0) > 20) warn++;
    }
    return { ok, unparsed, matched, review, new: neu, warn };
  }, [report, matches]);

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Bulk Paste — Stage 1: Parse &amp; Verify</h3>
            <p className="text-xs text-muted-foreground">
              Token-based defensive parser. Currency tokens (Sh / USD / GBP) are mandatory delimiters. No DB writes happen here.
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setRaw(SAMPLE)}>Load sample</Button>
        </div>
        <Textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste raw fund data (no delimiters needed)..."
          className="min-h-[160px] font-mono text-xs"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleParse} disabled={running || !raw.trim()} className="gap-2">
            <Search className="h-4 w-4" /> Parse &amp; verify
          </Button>
          <span className="text-[11px] text-muted-foreground">
            {loadedDb ? `${existing.length} existing funds loaded for matching` : "DB will be loaded on parse"}
          </span>
        </div>
      </Card>

      {report && (
        <>
          {/* Summary chips */}
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-border px-2 py-0.5">Total: <b>{report.rows.length}</b></span>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5">OK: {counts.ok}</span>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5">Matched: {counts.matched}</span>
            <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5">Review: {counts.review}</span>
            <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5">New: {counts.new}</span>
            {counts.unparsed > 0 && <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5">Unparsed: {counts.unparsed}</span>}
            {counts.warn > 0 && <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5">Sanity warnings: {counts.warn}</span>}
            {report.unparsedSegments.length > 0 && <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5">Tail unparsed: {report.unparsedSegments.length}</span>}
          </div>

          {/* Side-by-side raw vs extracted */}
          <Card className="p-0 overflow-hidden">
            <div className="grid grid-cols-12 bg-muted px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Raw segment</div>
              <div className="col-span-2">Category → Type</div>
              <div className="col-span-2">Manager / Currency</div>
              <div className="col-span-1 text-right">Daily</div>
              <div className="col-span-1 text-right">Annual</div>
              <div className="col-span-1 text-right">Status</div>
            </div>
            <div className="max-h-[480px] overflow-y-auto divide-y divide-border/50">
              {report.rows.map((r) => {
                const m = matches[r.index];
                const drift = m?.drift ?? 0;
                const driftWarn = drift > 20;
                return (
                  <div key={r.index} className="grid grid-cols-12 items-start px-3 py-2 text-xs hover:bg-muted/30">
                    <div className="col-span-1 text-muted-foreground tabular-nums">{r.index + 1}</div>
                    <div className="col-span-4 font-mono text-[11px] text-muted-foreground break-words pr-2">
                      “{r.raw}”
                    </div>
                    <div className="col-span-2">
                      <div className="text-foreground">{r.category ?? <span className="text-destructive">—</span>}</div>
                      <div className="text-[10px] text-muted-foreground">{r.fund_type ? FUND_TYPE_LABELS[r.fund_type] : ""}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="font-medium text-foreground">{r.manager || <span className="text-destructive">empty</span>}</div>
                      <div className="text-[10px] text-muted-foreground">{r.currency} → unit {r.yield_unit ?? "?"}</div>
                      {m?.fund && m.kind !== "matched" && (
                        <div className="text-[10px] text-yellow-500 mt-0.5">≈ {m.fund.manager}</div>
                      )}
                    </div>
                    <div className="col-span-1 text-right tabular-nums">{r.daily_yield ?? "—"}</div>
                    <div className={`col-span-1 text-right tabular-nums font-medium ${driftWarn ? "text-orange-500" : ""}`}>
                      {r.annual_yield ?? "—"}
                      {m?.prevAnnual !== undefined && (
                        <div className="text-[10px] text-muted-foreground font-normal">
                          was {m.prevAnnual}{driftWarn ? ` (Δ ${drift.toFixed(0)}%)` : ""}
                        </div>
                      )}
                    </div>
                    <div className="col-span-1 text-right space-y-1">
                      <StatusBadge row={r} match={m} />
                      {(r.warnings.length > 0 || driftWarn) && (
                        <div className="inline-flex items-center gap-1 text-[10px] text-orange-500" title={[...r.warnings, driftWarn ? `Drift ${drift.toFixed(0)}%` : ""].filter(Boolean).join(" • ")}>
                          <AlertTriangle className="h-3 w-3" /> sanity
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Log preview */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center gap-2 bg-muted px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3 w-3" /> Parser log
            </div>
            <pre className="max-h-[260px] overflow-y-auto px-3 py-2 text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
              {report.rows.map((r) => r.log).join("\n")}
              {report.unparsedSegments.length > 0 && "\n\n--- UNPARSED TAIL ---\n" + report.unparsedSegments.join("\n")}
            </pre>
          </Card>

          <p className="text-[11px] text-muted-foreground">
            Stage 1 only — no records are written. Stage 2 will add per-row editing, new-fund metadata capture, and atomic apply.
          </p>
        </>
      )}
    </div>
  );
};

export default BulkFundPasteVerify;
