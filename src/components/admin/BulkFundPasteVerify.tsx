import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { parseBulkFundText, type ParsedRow } from "@/lib/bulkFundParser";
import { FUND_TYPE_LABELS, type FundType } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertTriangle, XCircle, Search, FileText, Settings2, Loader2, ExternalLink, Sparkles, ShieldAlert, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface ExistingFund {
  id: string;
  manager: string;
  fund_type: string;
  yield_unit: string;
  annual_yield: number;
}

type MatchKind = "matched" | "review" | "new" | "type-mismatch";
interface MatchInfo {
  kind: MatchKind;
  fund?: ExistingFund;
  prevAnnual?: number;
  drift?: number;
  /** For type-mismatch: the existing fund whose unit class differs */
  conflictingFund?: ExistingFund;
  /** For "review": similarity 0..1 */
  similarity?: number;
}

/** Per-row admin overrides on top of parsed data */
interface RowEdit {
  daily?: number;
  annual?: number;
  skipped?: boolean;
  newSetup?: {
    minimum_investment: number;
    management_fee: number;
    withdrawal_time: string;
  };
  /** When user manually accepts a fuzzy "review" match */
  acceptedFundId?: string;
  /** Required confirmation before a NEW fund can be synced */
  confirmedNew?: boolean;
}

// Levenshtein distance for fuzzy manager-name matching
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  }
  return dp[m][n];
}
function similarity(a: string, b: string): number {
  const la = a.toLowerCase(), lb = b.toLowerCase();
  const max = Math.max(la.length, lb.length);
  if (!max) return 1;
  return 1 - levenshtein(la, lb) / max;
}
/** Whether two yield_units belong to the same "class" (% vs price) */
function unitClass(u: string): "percent" | "price" {
  return u === "%" ? "percent" : "price";
}

const SAMPLE = `Fund TypeFund ManagerCurrencyDaily Yield (%)Annual Rate (%)Money Mkt FundBritamSh9.269.71Money Mkt FundICEASh7.758.06Money Mkt FundCytonnSh11.4512.13Money Mkt FundCytonnUSD5.575.72Fixed Income FundICEASh12.0013.82Fixed Income FundICEAUSD7.007.50Balanced FundBritamSh167.09172.49Equity FundICEASh157.84157.84`;

function compositeKey(manager: string, fund_type: string, yield_unit: string) {
  return `${manager.trim().toLowerCase()}|${fund_type}|${yield_unit}`;
}

function generateSlug(manager: string, fund_type: string, yield_unit: string) {
  const base = manager.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "-");
  const ftShort = fund_type.replace("_", "-");
  const cur = yield_unit === "%" ? "" : `-${yield_unit.toLowerCase()}`;
  return `${base}-${ftShort}${cur}`;
}

const StatusBadge = ({ row, match, edit }: { row: ParsedRow; match?: MatchInfo; edit: RowEdit }) => {
  if (edit.skipped) {
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">SKIPPED</span>;
  }
  if (row.status !== "ok") {
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-destructive"><XCircle className="h-3 w-3" /> UNPARSED</span>;
  }
  const effectiveKind: MatchKind = edit.acceptedFundId ? "matched" : (match?.kind ?? "new");
  if (effectiveKind === "type-mismatch") {
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600"><ShieldAlert className="h-3 w-3" /> TYPE MISMATCH</span>;
  }
  if (effectiveKind === "new") {
    if (edit.newSetup && edit.confirmedNew) {
      return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500"><Sparkles className="h-3 w-3" /> READY</span>;
    }
    if (edit.newSetup) {
      return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-500"><AlertTriangle className="h-3 w-3" /> CONFIRM</span>;
    }
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500"><span className="h-2 w-2 rounded-full bg-red-500" /> NEW</span>;
  }
  if (effectiveKind === "review") {
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-yellow-500"><span className="h-2 w-2 rounded-full bg-yellow-500" /> POTENTIAL MATCH</span>;
  }
  return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500"><CheckCircle2 className="h-3 w-3" /> MATCHED</span>;
};

/** Click-to-edit numeric cell. Falls back to original value on blur if empty. */
const EditableNumber = ({ value, onChange, warn }: { value: number; onChange: (v: number) => void; warn?: boolean }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  if (editing) {
    return (
      <Input
        autoFocus
        type="number"
        step="0.01"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = parseFloat(draft);
          if (!Number.isNaN(n)) onChange(n);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") { setDraft(String(value)); setEditing(false); }
        }}
        className="h-6 px-1 py-0 text-right text-xs w-20 ml-auto"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`tabular-nums hover:bg-accent/20 rounded px-1 -mx-1 cursor-pointer ${warn ? "text-orange-500 font-medium" : ""}`}
      title="Click to edit"
    >
      {value}
    </button>
  );
};

const NewFundSetupDialog = ({
  open, onOpenChange, row, edit, similarManagers, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: ParsedRow | null;
  edit: RowEdit | null;
  similarManagers: string[];
  onSave: (setup: { minimum_investment: number; management_fee: number; withdrawal_time: string }, confirmed: boolean) => void;
}) => {
  const [min, setMin] = useState("1000");
  const [fee, setFee] = useState("2");
  const [wd, setWd] = useState("T+1");
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (open && edit?.newSetup) {
      setMin(String(edit.newSetup.minimum_investment));
      setFee(String(edit.newSetup.management_fee));
      setWd(edit.newSetup.withdrawal_time);
      setConfirmed(!!edit.confirmedNew);
    } else if (open) {
      setMin("1000"); setFee("2"); setWd("T+1"); setConfirmed(false);
    }
  }, [open, edit]);
  if (!row) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set up new fund</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-muted px-3 py-2 text-sm">
            <div className="font-medium">{row.manager}</div>
            <div className="text-xs text-muted-foreground">
              {row.fund_type ? FUND_TYPE_LABELS[row.fund_type as FundType] : "—"} · {row.yield_unit}
            </div>
          </div>
          {similarManagers.length > 0 && (
            <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs">
              <div className="flex items-center gap-1 font-semibold text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-3 w-3" /> Similar names already exist
              </div>
              <div className="mt-1 text-muted-foreground">
                Make sure this isn't a misspelling of: {similarManagers.map((s) => <b key={s} className="mr-1">{s}</b>)}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Minimum investment ({row.yield_unit === "%" ? "KES" : row.yield_unit})</Label>
            <Input type="number" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Management fee (%)</Label>
            <Input type="number" inputMode="decimal" step="0.1" value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Withdrawal time</Label>
            <Input value={wd} onChange={(e) => setWd(e.target.value)} placeholder="e.g. T+1, T+3, Same day" />
          </div>
          <label className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs cursor-pointer">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(!!v)} className="mt-0.5" />
            <span>
              <b>I confirm this is a new fund</b> and not a misspelling of an existing one.
              Without this confirmation, the row will stay in quarantine.
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              onSave({
                minimum_investment: parseFloat(min) || 0,
                management_fee: parseFloat(fee) || 0,
                withdrawal_time: wd.trim() || "T+1",
              }, confirmed);
              onOpenChange(false);
            }}
          >
            Save setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const BulkFundPasteVerify = () => {
  const { user } = useAuth();
  const [raw, setRaw] = useState(SAMPLE);
  const [existing, setExisting] = useState<ExistingFund[]>([]);
  const [loadedDb, setLoadedDb] = useState(false);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<ReturnType<typeof parseBulkFundText> | null>(null);
  const [edits, setEdits] = useState<Record<number, RowEdit>>({});
  const [setupDialogIdx, setSetupDialogIdx] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ updated: string[]; created: string[] } | null>(null);
  /** Mapping for unknown headers detected in the input → fund_type */
  const [headerMap, setHeaderMap] = useState<Record<string, FundType>>({});

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
    const extras: Array<[string, FundType]> = Object.entries(headerMap).map(([label, ft]) => [label, ft]);
    setReport(parseBulkFundText(raw, extras));
    setEdits({});
    setSyncResult(null);
    setRunning(false);
  };

  /** Strict match: exact composite OR Levenshtein similarity ≥ 0.85 (NEVER auto-corrects). */
  const SIMILARITY_THRESHOLD = 0.85;

  const matches = useMemo<Record<number, MatchInfo>>(() => {
    if (!report) return {};
    const byKey = new Map<string, ExistingFund>();
    for (const f of existing) byKey.set(compositeKey(f.manager, f.fund_type, f.yield_unit), f);
    const out: Record<number, MatchInfo> = {};
    for (const r of report.rows) {
      if (r.status !== "ok" || !r.fund_type || !r.yield_unit) {
        out[r.index] = { kind: "new" };
        continue;
      }

      // Type-consistency check FIRST: same manager exists with a different unit class
      const conflicting = existing.find(
        (f) =>
          f.manager.toLowerCase().trim() === r.manager.toLowerCase().trim() &&
          unitClass(f.yield_unit) !== unitClass(r.yield_unit!),
      );
      if (conflicting) {
        out[r.index] = { kind: "type-mismatch", conflictingFund: conflicting };
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

      // Strict fuzzy: same fund_type + same unit class, similarity ≥ threshold
      let best: { fund: ExistingFund; sim: number } | null = null;
      for (const f of existing) {
        if (f.fund_type !== r.fund_type) continue;
        if (unitClass(f.yield_unit) !== unitClass(r.yield_unit)) continue;
        const sim = similarity(f.manager, r.manager);
        if (sim >= SIMILARITY_THRESHOLD && (!best || sim > best.sim)) best = { fund: f, sim };
      }
      if (best) {
        out[r.index] = { kind: "review", fund: best.fund, prevAnnual: best.fund.annual_yield, similarity: best.sim };
      } else {
        out[r.index] = { kind: "new" };
      }
    }
    return out;
  }, [report, existing]);

  /** Effective per-row state (parsed values overlaid with admin edits and match acceptance) */
  const effectiveRows = useMemo(() => {
    if (!report) return [];
    return report.rows.map((r) => {
      const e = edits[r.index] || {};
      const daily = e.daily ?? r.daily_yield ?? 0;
      const annual = e.annual ?? r.annual_yield ?? 0;
      const m = matches[r.index];
      const acceptedFund = e.acceptedFundId ? existing.find((f) => f.id === e.acceptedFundId) : undefined;
      const effectiveMatch: MatchInfo | undefined = acceptedFund
        ? { kind: "matched", fund: acceptedFund, prevAnnual: acceptedFund.annual_yield }
        : m;
      return { row: r, edit: e, daily, annual, match: effectiveMatch };
    });
  }, [report, edits, matches, existing]);

  /** For the "is this a misspelling?" warning shown in the new-fund setup dialog. */
  const similarManagersForRow = (rowIdx: number): string[] => {
    const r = report?.rows[rowIdx];
    if (!r) return [];
    return Array.from(new Set(
      existing
        .filter((f) => similarity(f.manager, r.manager) >= 0.6 && f.manager.toLowerCase() !== r.manager.toLowerCase())
        .map((f) => f.manager),
    )).slice(0, 5);
  };

  /** Unknown headers in the parsed input that the user hasn't mapped yet. */
  const unmappedHeaders = useMemo(() => {
    if (!report) return [];
    return report.unknownHeaders.filter((h) => !headerMap[h]);
  }, [report, headerMap]);

  const counts = useMemo(() => {
    const c = { ok: 0, unparsed: 0, matched: 0, review: 0, new: 0, ready: 0, skipped: 0, blocked: 0, mismatch: 0 };
    for (const er of effectiveRows) {
      if (er.edit.skipped) { c.skipped++; continue; }
      if (er.row.status !== "ok") { c.unparsed++; c.blocked++; continue; }
      c.ok++;
      if (er.match?.kind === "type-mismatch") { c.mismatch++; c.blocked++; }
      else if (er.match?.kind === "matched") c.matched++;
      else if (er.match?.kind === "review") { c.review++; c.blocked++; }
      else {
        c.new++;
        if (er.edit.newSetup && er.edit.confirmedNew) c.ready++;
        else c.blocked++;
      }
    }
    return c;
  }, [effectiveRows]);

  const canSync = report && counts.blocked === 0 && unmappedHeaders.length === 0 && (counts.matched + counts.ready) > 0 && !syncing;

  const setEdit = (idx: number, patch: Partial<RowEdit>) => {
    setEdits((prev) => ({ ...prev, [idx]: { ...prev[idx], ...patch } }));
  };

  const performSync = async () => {
    if (!report || !user) return;
    setSyncing(true);
    setConfirmOpen(false);
    try {
      const payload = effectiveRows
        .filter((er) => !er.edit.skipped && er.row.status === "ok" && er.match?.kind !== "type-mismatch")
        .filter((er) => er.match?.kind === "matched" || (er.edit.newSetup && er.edit.confirmedNew))
        .map((er) => {
          const m = er.match;
          if (m?.kind === "matched" && m.fund) {
            return {
              action: "update",
              id: m.fund.id,
              annual_yield: er.annual,
              daily_yield: er.daily,
              yield_unit: er.row.yield_unit,
              fund_type: er.row.fund_type,
            };
          }
          // new
          const setup = er.edit.newSetup!;
          const slug = generateSlug(er.row.manager, er.row.fund_type!, er.row.yield_unit!);
          return {
            action: "create",
            slug,
            name: er.row.manager,
            manager: er.row.manager,
            fund_type: er.row.fund_type,
            yield_unit: er.row.yield_unit,
            annual_yield: er.annual,
            daily_yield: er.daily,
            minimum_investment: setup.minimum_investment,
            management_fee: setup.management_fee,
            withdrawal_time: setup.withdrawal_time,
          };
        });

      const { data, error } = await supabase.rpc("bulk_sync_funds", { payload });
      if (error) throw error;
      const result = data as { updated: string[]; created: string[] };
      setSyncResult({ updated: result.updated || [], created: result.created || [] });
      toast.success(`Synced: ${result.updated?.length || 0} updated, ${result.created?.length || 0} created`);
      // Refresh existing for any subsequent runs
      await loadExisting();
    } catch (err: any) {
      toast.error(err.message || "Sync failed", { description: "Nothing was saved — the entire batch was rolled back." });
    } finally {
      setSyncing(false);
    }
  };

  const setupDialogRow = setupDialogIdx !== null ? report?.rows[setupDialogIdx] ?? null : null;
  const setupDialogEdit = setupDialogIdx !== null ? edits[setupDialogIdx] ?? null : null;

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Bulk Paste — Sync Funds</h3>
            <p className="text-xs text-muted-foreground">
              Paste raw data, verify the green lights, set up any new funds, and hit Sync. All-or-nothing — if any row fails, nothing saves.
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setRaw(SAMPLE)}>Load sample</Button>
        </div>
        <Textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste raw fund data (no delimiters needed)..."
          className="min-h-[140px] font-mono text-xs"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleParse} disabled={running || !raw.trim()} className="gap-2">
            <Search className="h-4 w-4" /> Parse &amp; verify
          </Button>
          <span className="text-[11px] text-muted-foreground">
            {loadedDb ? `${existing.length} existing funds loaded` : "DB will load on parse"}
          </span>
        </div>
      </Card>

      {report && !syncResult && (
        <>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-border px-2 py-0.5">Total: <b>{report.rows.length}</b></span>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5">Matched: {counts.matched}</span>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5">Ready: {counts.ready}</span>
            {counts.review > 0 && <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5">Review: {counts.review}</span>}
            {counts.new > 0 && <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5">New (needs setup): {counts.new}</span>}
            {counts.skipped > 0 && <span className="rounded-full border border-border px-2 py-0.5">Skipped: {counts.skipped}</span>}
            {counts.unparsed > 0 && <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5">Unparsed: {counts.unparsed}</span>}
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="grid grid-cols-12 bg-muted px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Raw</div>
              <div className="col-span-2">Category / Manager</div>
              <div className="col-span-1 text-right">Daily</div>
              <div className="col-span-1 text-right">Annual</div>
              <div className="col-span-2 text-right">Match</div>
              <div className="col-span-1 text-center">Skip</div>
              <div className="col-span-1 text-right">Status</div>
            </div>
            <div className="max-h-[480px] overflow-y-auto divide-y divide-border/50">
              {effectiveRows.map(({ row: r, edit, daily, annual, match }) => {
                const drift = match?.prevAnnual && match.prevAnnual > 0
                  ? Math.abs((annual - match.prevAnnual) / match.prevAnnual) * 100
                  : 0;
                const driftWarn = drift > 20 && match?.kind === "matched";
                const isNew = match?.kind === "new" || !match;
                const isReview = match?.kind === "review";
                const dimmed = edit.skipped ? "opacity-40" : "";
                return (
                  <div key={r.index} className={`grid grid-cols-12 items-center px-3 py-2 text-xs hover:bg-muted/30 ${dimmed}`}>
                    <div className="col-span-1 text-muted-foreground tabular-nums">{r.index + 1}</div>
                    <div className="col-span-3 font-mono text-[10px] text-muted-foreground break-words pr-2 leading-tight">
                      {r.raw}
                    </div>
                    <div className="col-span-2">
                      <div className="font-medium">{r.manager || <span className="text-destructive">empty</span>}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {r.fund_type ? FUND_TYPE_LABELS[r.fund_type as FundType] : "—"} · {r.yield_unit ?? "?"}
                      </div>
                    </div>
                    <div className="col-span-1 text-right">
                      <EditableNumber value={daily} onChange={(v) => setEdit(r.index, { daily: v })} />
                    </div>
                    <div className="col-span-1 text-right">
                      <EditableNumber value={annual} onChange={(v) => setEdit(r.index, { annual: v })} warn={driftWarn} />
                      {match?.prevAnnual !== undefined && (
                        <div className="text-[10px] text-muted-foreground font-normal leading-tight">
                          was {match.prevAnnual}{driftWarn ? ` (Δ${drift.toFixed(0)}%)` : ""}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 text-right">
                      {isReview && match?.fund && (
                        <div className="space-y-1">
                          <div className="text-[10px] text-yellow-500 truncate">≈ {match.fund.manager}</div>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => setEdit(r.index, { acceptedFundId: match.fund!.id })}>Accept</Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setEdit(r.index, { acceptedFundId: undefined })}>Treat as new</Button>
                          </div>
                        </div>
                      )}
                      {isNew && r.status === "ok" && (
                        <Button
                          size="sm"
                          variant={edit.newSetup ? "outline" : "default"}
                          className="h-6 px-2 gap-1 text-[10px]"
                          onClick={() => setSetupDialogIdx(r.index)}
                        >
                          <Settings2 className="h-3 w-3" />
                          {edit.newSetup ? "Edit setup" : "Setup"}
                        </Button>
                      )}
                      {match?.kind === "matched" && !isReview && (
                        <span className="text-[10px] text-muted-foreground">existing fund</span>
                      )}
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Switch checked={!!edit.skipped} onCheckedChange={(v) => setEdit(r.index, { skipped: v })} />
                    </div>
                    <div className="col-span-1 text-right">
                      <StatusBadge row={r} match={match} edit={edit} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Sync action */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">
              {counts.blocked > 0 ? (
                <span className="text-orange-500">
                  {counts.blocked} row{counts.blocked === 1 ? "" : "s"} need attention before you can sync (set up new funds, accept reviews, or skip).
                </span>
              ) : (
                <span>Ready to sync {counts.matched + counts.ready} row{counts.matched + counts.ready === 1 ? "" : "s"}.</span>
              )}
            </div>
            <Button
              size="lg"
              disabled={!canSync}
              onClick={() => setConfirmOpen(true)}
              className="gap-2"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Sync All Funds to Database
            </Button>
          </div>

          {/* Parse log */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center gap-2 bg-muted px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3 w-3" /> Parser log
            </div>
            <pre className="max-h-[200px] overflow-y-auto px-3 py-2 text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
              {report.rows.map((r) => r.log).join("\n")}
              {report.unparsedSegments.length > 0 && "\n\n--- UNPARSED TAIL ---\n" + report.unparsedSegments.join("\n")}
            </pre>
          </Card>
        </>
      )}

      {/* Success state */}
      {syncResult && (
        <Card className="p-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">All funds synced</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {syncResult.updated.length} updated · {syncResult.created.length} created.
              Previous yields are saved automatically to history.
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => { setSyncResult(null); setReport(null); setRaw(""); setEdits({}); }}>
              Paste another batch
            </Button>
            <Button variant="ghost" asChild>
              <a href="#log" onClick={(e) => {
                e.preventDefault();
                // Switch to Log tab in AdminPage
                const logTab = document.querySelector('[data-state] [value="log"], [role="tab"][data-state]') as HTMLElement | null;
                const tabs = document.querySelectorAll('[role="tab"]');
                tabs.forEach((t) => { if ((t as HTMLElement).innerText.toLowerCase().includes("log")) (t as HTMLElement).click(); });
              }} className="gap-2">
                View Change Log <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </Card>
      )}

      <NewFundSetupDialog
        open={setupDialogIdx !== null}
        onOpenChange={(v) => { if (!v) setSetupDialogIdx(null); }}
        row={setupDialogRow}
        edit={setupDialogEdit}
        similarManagers={setupDialogIdx !== null ? similarManagersForRow(setupDialogIdx) : []}
        onSave={(setup, confirmed) => { if (setupDialogIdx !== null) setEdit(setupDialogIdx, { newSetup: setup, confirmedNew: confirmed }); }}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync to database?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div>You are about to:</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li><b className="text-emerald-500">Update {counts.matched}</b> existing fund{counts.matched === 1 ? "" : "s"} (previous yields auto-saved to history)</li>
                  <li><b className="text-red-500">Create {counts.ready}</b> new fund{counts.ready === 1 ? "" : "s"}</li>
                  {counts.skipped > 0 && <li className="text-muted-foreground">Skip {counts.skipped} row{counts.skipped === 1 ? "" : "s"}</li>}
                </ul>
                <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground mt-2">
                  This is atomic — if any single row fails, the whole batch is rolled back and nothing changes.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performSync}>
              Yes, sync {counts.matched + counts.ready} fund{counts.matched + counts.ready === 1 ? "" : "s"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BulkFundPasteVerify;
