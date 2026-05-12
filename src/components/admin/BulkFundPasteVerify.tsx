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
import { CheckCircle2, AlertTriangle, XCircle, Search, FileText, Settings2, Loader2, ExternalLink, Sparkles, ShieldAlert, HelpCircle, Download, FlaskConical, Clipboard, Calendar as CalendarIcon, Lock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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

const PERMA_SKIP_KEY = "kff_admin_perma_skip_v1";

function loadPermaSkips(): Set<string> {
  try {
    const raw = localStorage.getItem(PERMA_SKIP_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch { return new Set(); }
}
function savePermaSkips(set: Set<string>) {
  try { localStorage.setItem(PERMA_SKIP_KEY, JSON.stringify([...set])); } catch { /* noop */ }
}

function compositeKey(manager: string, fund_type: string, yield_unit: string) {
  return `${manager.trim().toLowerCase()}|${fund_type}|${yield_unit}`;
}

function generateSlug(manager: string, fund_type: string, yield_unit: string) {
  const base = manager.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "-");
  const ftShort = fund_type.replace("_", "-");
  const cur = yield_unit === "%" ? "" : `-${yield_unit.toLowerCase()}`;
  return `${base}-${ftShort}${cur}`;
}

/**
 * Try to detect a date in the pasted blob. Supports DD.MM.YYYY, DD/MM/YYYY,
 * DD-MM-YYYY, and "8 May 2026" / "May 8, 2026". Returns ISO YYYY-MM-DD or null.
 */
function detectDate(text: string): string | null {
  // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  const m1 = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/.exec(text);
  if (m1) {
    const d = +m1[1], mo = +m1[2], y = +m1[3];
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  // YYYY-MM-DD
  const m2 = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  // "8 May 2026" / "May 8, 2026"
  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const m3 = /\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b/.exec(text);
  if (m3) {
    const mi = months.indexOf(m3[2].slice(0, 3).toLowerCase());
    if (mi >= 0) return `${m3[3]}-${String(mi + 1).padStart(2, "0")}-${String(+m3[1]).padStart(2, "0")}`;
  }
  const m4 = /\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/.exec(text);
  if (m4) {
    const mi = months.indexOf(m4[1].slice(0, 3).toLowerCase());
    if (mi >= 0) return `${m4[3]}-${String(mi + 1).padStart(2, "0")}-${String(+m4[2]).padStart(2, "0")}`;
  }
  return null;
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
  const [syncResult, setSyncResult] = useState<{ updated: string[]; created: string[]; dryRun?: boolean } | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [failedRowIdx, setFailedRowIdx] = useState<number | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  /** Mapping for unknown headers detected in the input → fund_type */
  const [headerMap, setHeaderMap] = useState<Record<string, FundType>>({});
  const [permaSkips, setPermaSkips] = useState<Set<string>>(() => loadPermaSkips());
  const [effectiveDate, setEffectiveDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [detectedDate, setDetectedDate] = useState<string | null>(null);
  const [weekHealth, setWeekHealth] = useState<{ date: string; label: string; present: boolean }[]>([]);
  /** True when the user explicitly picked a date (calendar or health pill). Blocks auto-detect override. */
  const [dateLocked, setDateLocked] = useState(false);

  /** Compute Monday→Friday of the ISO week containing `ref` (local time). */
  const getCurrentBusinessWeek = (ref: Date = new Date()) => {
    const d = new Date(ref);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=Sun..6=Sat
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMon);
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    return labels.map((label, i) => {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      return { date: iso, label, dayNum: dt.getDate(), monthShort: dt.toLocaleString("en-US", { month: "short" }) };
    });
  };

  const loadWeekHealth = async () => {
    const week = getCurrentBusinessWeek();
    const start = week[0].date;
    const end = week[week.length - 1].date;
    const { data, error } = await supabase.rpc("fund_snapshot_days_in_range", { p_start: start, p_end: end });
    const present = new Set<string>();
    if (!error && Array.isArray(data)) {
      for (const r of data as Array<{ snapshot_date: string }>) present.add(r.snapshot_date);
    }
    setWeekHealth(week.map((d) => ({
      date: d.date,
      label: `${d.label} ${d.monthShort} ${d.dayNum}`,
      present: present.has(d.date),
    })));
  };

  useEffect(() => { loadWeekHealth(); }, []);

  const firstMissingDay = useMemo(() => weekHealth.find((d) => !d.present && d.date <= new Date().toISOString().slice(0, 10)), [weekHealth]);

  const loadExisting = async () => {
    const { data, error } = await supabase
      .from("funds")
      .select("id, manager, fund_type, yield_unit, annual_yield");
    if (!error && data) {
      setExisting(data as ExistingFund[]);
      setLoadedDb(true);
    }
  };

  const handleParse = async (textOverride?: string) => {
    setRunning(true);
    const text = textOverride ?? raw;
    if (!loadedDb) await loadExisting();
    const extras: Array<[string, FundType]> = Object.entries(headerMap).map(([label, ft]) => [label, ft]);
    const rep = parseBulkFundText(text, extras);
    setReport(rep);
    // Auto-skip rows whose composite key is in the permanent-skip set
    const initialEdits: Record<number, RowEdit> = {};
    for (const r of rep.rows) {
      if (r.status === "ok" && r.fund_type && r.yield_unit) {
        const key = compositeKey(r.manager, r.fund_type, r.yield_unit);
        if (permaSkips.has(key)) initialEdits[r.index] = { skipped: true };
      }
    }
    setEdits(initialEdits);
    // Date detection
    const found = detectDate(text);
    setDetectedDate(found);
    // Respect a user-locked date — never let auto-detect override a manual pick
    if (!dateLocked) setEffectiveDate(found ?? new Date().toISOString().slice(0, 10));
    setSyncResult(null);
    setFailedRowIdx(null);
    setFailedMessage(null);
    setRunning(false);
  };

  const togglePermaSkip = (manager: string, fund_type: string, yield_unit: string, on: boolean) => {
    const key = compositeKey(manager, fund_type, yield_unit);
    setPermaSkips((prev) => {
      const next = new Set(prev);
      if (on) next.add(key); else next.delete(key);
      savePermaSkips(next);
      return next;
    });
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.error("Clipboard is empty");
        return;
      }
      setRaw(text);
      await handleParse(text);
      toast.success("Pasted and parsed");
    } catch {
      toast.error("Couldn't read clipboard", { description: "Grant permission or paste manually." });
    }
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
    setFailedRowIdx(null);
    setFailedMessage(null);
    try {
      const eligible = effectiveRows
        .filter((er) => !er.edit.skipped && er.row.status === "ok" && er.match?.kind !== "type-mismatch")
        .filter((er) => er.match?.kind === "matched" || (er.edit.newSetup && er.edit.confirmedNew));

      const payload = eligible.map((er) => {
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

      const { data, error } = await supabase.rpc("bulk_sync_funds", { payload, dry_run: dryRun, p_effective_date: effectiveDate });
      if (error) throw error;
      const result = data as { updated: string[]; created: string[]; dry_run?: boolean };
      setSyncResult({ updated: result.updated || [], created: result.created || [], dryRun });
      if (dryRun) {
        toast.success(`Dry-run OK for ${effectiveDate}: would update ${result.updated?.length || 0}, create ${result.created?.length || 0}`, {
          description: "Triggers fired and rolled back. No changes saved.",
        });
      } else {
        toast.success(`Synced for ${effectiveDate}: ${result.updated?.length || 0} updated, ${result.created?.length || 0} created`);
        await loadExisting();
        await loadWeekHealth();
      }
    } catch (err: any) {
      const msg: string = err?.message || "Sync failed";
      // Parse "Row N:" out of the SQL error to highlight the offender
      const m = /Row\s+(\d+)\s*:/i.exec(msg);
      if (m) {
        const payloadRowOneBased = parseInt(m[1], 10);
        const eligibleNow = effectiveRows
          .filter((er) => !er.edit.skipped && er.row.status === "ok" && er.match?.kind !== "type-mismatch")
          .filter((er) => er.match?.kind === "matched" || (er.edit.newSetup && er.edit.confirmedNew));
        const offender = eligibleNow[payloadRowOneBased - 1];
        if (offender) {
          setFailedRowIdx(offender.row.index);
          setFailedMessage(msg);
          // Scroll into view + retrigger animation
          setTimeout(() => {
            const el = document.getElementById(`bulk-row-${offender.row.index}`);
            if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
          }, 50);
        }
      }
      toast.error(msg, { description: "Nothing was saved — the entire batch was rolled back." });
    } finally {
      setSyncing(false);
    }
  };

  const exportCsv = () => {
    if (!report) return;
    const headers = [
      "effective_date", "row", "status", "category", "fund_type", "manager", "currency",
      "yield_unit", "daily_yield", "annual_yield", "match_kind",
      "matched_manager", "similarity_pct", "skipped", "warnings", "raw",
    ];
    const escape = (v: any) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const er of effectiveRows) {
      lines.push([
        effectiveDate,
        er.row.index + 1,
        er.row.status,
        er.row.category ?? "",
        er.row.fund_type ?? "",
        er.row.manager,
        er.row.currency ?? "",
        er.row.yield_unit ?? "",
        er.daily,
        er.annual,
        er.match?.kind ?? "new",
        er.match?.fund?.manager ?? "",
        er.match?.similarity != null ? Math.round(er.match.similarity * 100) : "",
        er.edit.skipped ? "yes" : "no",
        er.row.warnings.join("; "),
        er.row.raw,
      ].map(escape).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const datePart = effectiveDate || new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `parsed-funds-${datePart}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const setupDialogRow = setupDialogIdx !== null ? report?.rows[setupDialogIdx] ?? null : null;
  const setupDialogEdit = setupDialogIdx !== null ? edits[setupDialogIdx] ?? null : null;

  return (
    <div className="space-y-4">
      {/* Data Health Strip — current business week (Mon-Fri) */}
      {weekHealth.length > 0 && (
        <Card className="p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">This week's data</span>
              <button
                type="button"
                onClick={loadWeekHealth}
                className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                title="Refresh"
              >
                refresh
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              {weekHealth.map((d) => {
                const isToday = d.date === new Date().toISOString().slice(0, 10);
                const isFuture = d.date > new Date().toISOString().slice(0, 10);
                return (
                  <button
                    key={d.date}
                    type="button"
                    disabled={isFuture}
                    onClick={() => { setEffectiveDate(d.date); setDateLocked(true); }}
                    className={`flex flex-col items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-all
                      ${isFuture ? "opacity-30 cursor-not-allowed" : "hover:scale-105 cursor-pointer"}
                      ${effectiveDate === d.date ? "ring-2 ring-primary" : ""}
                      ${d.present ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : isFuture ? "bg-muted text-muted-foreground" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}
                    title={d.present ? `Data present for ${d.label}` : isFuture ? "Future date" : `No data for ${d.label} — click to backfill`}
                  >
                    <span>{d.label}</span>
                    <span className="text-[12px] leading-none">{d.present ? "🟢" : isFuture ? "⚪" : "🔴"}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {firstMissingDay && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
              <span>
                💡 Missing data for <b>{firstMissingDay.label}</b>. Want to upload it now?
              </span>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => { setEffectiveDate(firstMissingDay.date); setDateLocked(true); }}>
                Use {firstMissingDay.label}
              </Button>
            </div>
          )}
        </Card>
      )}

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
        <div className="flex flex-wrap items-end gap-2">
          <Button size="sm" onClick={() => handleParse()} disabled={running || !raw.trim()} className="gap-2">
            <Search className="h-4 w-4" /> Parse &amp; verify
          </Button>
          <Button size="sm" variant="outline" onClick={handlePasteFromClipboard} disabled={running} className="gap-2">
            <Clipboard className="h-4 w-4" /> Paste &amp; auto-parse
          </Button>
          {(() => {
            const today = new Date();
            const todayIso = today.toISOString().slice(0, 10);
            const dateObj = effectiveDate ? new Date(effectiveDate + "T00:00:00") : undefined;
            const isWeekend = !!dateObj && (dateObj.getDay() === 0 || dateObj.getDay() === 6);
            const isAuto = !!detectedDate && detectedDate === effectiveDate && !dateLocked;
            const borderCls = dateLocked
              ? "border-blue-600 ring-2 ring-blue-600/40 bg-blue-500/5"
              : isAuto
                ? "border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/5"
                : isWeekend
                  ? "border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/5"
                  : "border-border bg-background";
            return (
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CalendarIcon className="h-3 w-3" /> Effective Date
                  {dateLocked && <span className="text-blue-600 normal-case font-medium tracking-normal inline-flex items-center gap-0.5"><Lock className="h-2.5 w-2.5" /> locked</span>}
                  {!dateLocked && isAuto && <span className="text-blue-500 normal-case font-medium tracking-normal">· auto-filled</span>}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn("h-9 min-w-[180px] justify-start gap-2 text-xs font-medium transition-colors", borderCls)}
                    >
                      <CalendarIcon className={cn("h-3.5 w-3.5", dateLocked ? "text-blue-600" : isAuto ? "text-blue-500" : isWeekend ? "text-amber-500" : "text-muted-foreground")} />
                      <span>{dateObj ? format(dateObj, "MMM d, yyyy") : "Pick a date"}</span>
                      {dateLocked && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDateLocked(false); setEffectiveDate(detectedDate ?? todayIso); }}
                          className="ml-auto text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                          title="Unlock — let auto-detect manage this"
                        >
                          unlock
                        </button>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateObj}
                      onSelect={(d) => {
                        if (!d) return;
                        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                        setEffectiveDate(iso);
                        setDateLocked(true);
                      }}
                      disabled={(d) => d > today}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {isWeekend && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">⚠️ Weekend selected — markets usually closed.</span>
                )}
              </div>
            );
          })()}
          <span className="text-[11px] text-muted-foreground ml-auto">
            {loadedDb ? `${existing.length} existing funds loaded` : "DB will load on parse"}
            {permaSkips.size > 0 && (
              <> · <button type="button" className="underline hover:text-foreground" onClick={() => { setPermaSkips(new Set()); savePermaSkips(new Set()); toast.success("Permanent skips cleared"); }}>
                {permaSkips.size} permanent skip{permaSkips.size === 1 ? "" : "s"} (clear)
              </button></>
            )}
          </span>
        </div>
      </Card>

      {report && !syncResult && (
        <>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-border px-2 py-0.5">Total: <b>{report.rows.length}</b></span>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5">Matched: {counts.matched}</span>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5">Ready: {counts.ready}</span>
            {counts.review > 0 && <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5">Potential match: {counts.review}</span>}
            {counts.new > 0 && <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5">New (quarantined): {counts.new}</span>}
            {counts.mismatch > 0 && <span className="rounded-full border border-red-600/40 bg-red-600/10 px-2 py-0.5 text-red-600">Type mismatch: {counts.mismatch}</span>}
            {counts.skipped > 0 && <span className="rounded-full border border-border px-2 py-0.5">Skipped: {counts.skipped}</span>}
            {counts.unparsed > 0 && <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5">Unparsed: {counts.unparsed}</span>}
          </div>

          {/* Unknown categories panel */}
          {report.unknownHeaders.length > 0 && (
            <Card className="p-3 border-zinc-700 bg-zinc-900/40">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="h-4 w-4 text-zinc-400" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Unknown categories detected</h4>
                <span className="text-[10px] text-muted-foreground">({report.unknownHeaders.length})</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">
                These header-like phrases aren't recognized. Map each to an existing fund type then re-run "Parse &amp; verify".
                Sync is blocked until every unknown header is mapped or removed from the input.
              </p>
              <div className="space-y-2">
                {report.unknownHeaders.map((h) => (
                  <div key={h} className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-zinc-300 flex-1 truncate">⚫ {h}</span>
                    <Select
                      value={headerMap[h] ?? ""}
                      onValueChange={(v) => setHeaderMap((prev) => ({ ...prev, [h]: v as FundType }))}
                    >
                      <SelectTrigger className="h-7 w-44 text-xs"><SelectValue placeholder="Map to fund type…" /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(FUND_TYPE_LABELS) as FundType[]).map((ft) => (
                          <SelectItem key={ft} value={ft}>{FUND_TYPE_LABELS[ft]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {headerMap[h] && (
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setHeaderMap((p) => { const n = { ...p }; delete n[h]; return n; })}>
                        Clear
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {Object.keys(headerMap).length > 0 && unmappedHeaders.length === 0 && (
                <Button size="sm" className="mt-3 h-7 text-xs" onClick={() => handleParse()}>
                  Re-parse with mappings
                </Button>
              )}
            </Card>
          )}

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
                const isMismatch = match?.kind === "type-mismatch";
                const isNew = (match?.kind === "new" || !match) && !isMismatch;
                const isReview = match?.kind === "review";
                const dimmed = edit.skipped ? "opacity-40" : "";
                const rowBg = isMismatch ? "bg-red-500/5 border-l-2 border-red-500" : "";
                const isFailed = failedRowIdx === r.index;
                const failedCls = isFailed ? "bg-destructive/10 border-l-2 border-destructive animate-shake" : "";
                return (
                  <TooltipProvider key={r.index}>
                    <Tooltip open={isFailed ? true : undefined}>
                      <TooltipTrigger asChild>
                  <div id={`bulk-row-${r.index}`} className={`grid grid-cols-12 items-center px-3 py-2 text-xs hover:bg-muted/30 ${dimmed} ${rowBg} ${failedCls}`}>
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
                      {isMismatch && match?.conflictingFund && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex items-center gap-1 text-[10px] text-red-600 cursor-help">
                                <ShieldAlert className="h-3 w-3" />
                                <span className="truncate">unit conflict</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <b>Data format mismatch:</b> "{match.conflictingFund.manager}" usually tracks{" "}
                              {unitClass(match.conflictingFund.yield_unit) === "percent" ? "percentages" : "a unit price"},
                              but this paste shows {unitClass(r.yield_unit ?? "%") === "percent" ? "a percentage" : "a unit price"}.
                              Fix the source or skip this row.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {isReview && match?.fund && (
                        <div className="space-y-1">
                          <div className="text-[10px] text-yellow-500 truncate">
                            ≈ {match.fund.manager} ({((match.similarity ?? 0) * 100).toFixed(0)}%)
                          </div>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => setEdit(r.index, { acceptedFundId: match.fund!.id })}>
                              Link to {match.fund.manager.split(" ")[0]}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setSetupDialogIdx(r.index)}>
                              Create as new
                            </Button>
                          </div>
                        </div>
                      )}
                      {isNew && r.status === "ok" && (
                        <Button
                          size="sm"
                          variant={edit.newSetup && edit.confirmedNew ? "outline" : "default"}
                          className="h-6 px-2 gap-1 text-[10px]"
                          onClick={() => setSetupDialogIdx(r.index)}
                        >
                          <Settings2 className="h-3 w-3" />
                          {edit.newSetup && edit.confirmedNew ? "Edit setup" : edit.newSetup ? "Confirm" : "Setup"}
                        </Button>
                      )}
                      {match?.kind === "matched" && !isReview && (
                        <span className="text-[10px] text-muted-foreground">existing fund</span>
                      )}
                    </div>
                    <div className="col-span-1 flex flex-col items-center gap-1">
                      <Switch checked={!!edit.skipped} onCheckedChange={(v) => setEdit(r.index, { skipped: v })} />
                      {r.status === "ok" && r.fund_type && r.yield_unit && (
                        <label className="flex items-center gap-1 text-[9px] text-muted-foreground cursor-pointer leading-none" title="Skip this fund permanently in all future sessions">
                          <Checkbox
                            className="h-3 w-3"
                            checked={permaSkips.has(compositeKey(r.manager, r.fund_type, r.yield_unit))}
                            onCheckedChange={(v) => {
                              togglePermaSkip(r.manager, r.fund_type!, r.yield_unit!, !!v);
                              if (v) setEdit(r.index, { skipped: true });
                            }}
                          />
                          forever
                        </label>
                      )}
                    </div>
                    <div className="col-span-1 text-right">
                      <StatusBadge row={r} match={match} edit={edit} />
                    </div>
                  </div>
                      </TooltipTrigger>
                      {isFailed && failedMessage && (
                        <TooltipContent side="top" className="max-w-md bg-destructive text-destructive-foreground">
                          <div className="text-[11px] font-semibold mb-0.5">Sync failed on this row</div>
                          <div className="text-[11px] font-mono break-words">{failedMessage}</div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </Card>

          {/* Sync action */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">
              {unmappedHeaders.length > 0 ? (
                <span className="text-red-600">
                  {unmappedHeaders.length} unknown categor{unmappedHeaders.length === 1 ? "y" : "ies"} must be mapped first.
                </span>
              ) : counts.blocked > 0 ? (
                <span className="text-orange-500">
                  {counts.blocked} row{counts.blocked === 1 ? "" : "s"} need attention before you can sync (resolve type mismatches, confirm new funds, accept potential matches, or skip).
                </span>
              ) : (
                <span>Ready to sync {counts.matched + counts.ready} row{counts.matched + counts.ready === 1 ? "" : "s"}.</span>
              )}
            </div>
          <div className="flex items-end gap-3 flex-wrap">
              {(() => {
                const isAuto = !!detectedDate && detectedDate === effectiveDate && !dateLocked;
                const today = new Date();
                const todayIso = today.toISOString().slice(0, 10);
                const dateObj = effectiveDate ? new Date(effectiveDate + "T00:00:00") : undefined;
                const isWeekend = !!dateObj && (dateObj.getDay() === 0 || dateObj.getDay() === 6);
                const borderCls = dateLocked
                  ? "border-blue-600 ring-2 ring-blue-600/40 bg-blue-500/5"
                  : isAuto
                    ? "border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/5"
                    : isWeekend
                      ? "border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/5"
                      : "border-border bg-background";
                return (
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <CalendarIcon className="h-3 w-3" /> Effective Date
                      {dateLocked && <span className="text-blue-600 normal-case font-medium tracking-normal inline-flex items-center gap-0.5"><Lock className="h-2.5 w-2.5" /> locked</span>}
                      {!dateLocked && isAuto && <span className="text-blue-500 normal-case font-medium tracking-normal">· auto-filled</span>}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-9 min-w-[180px] justify-start gap-2 text-xs font-medium transition-colors",
                            borderCls,
                          )}
                        >
                          <CalendarIcon className={cn("h-3.5 w-3.5", dateLocked ? "text-blue-600" : isAuto ? "text-blue-500" : isWeekend ? "text-amber-500" : "text-muted-foreground")} />
                          <span>{dateObj ? format(dateObj, "MMM d, yyyy") : "Pick a date"}</span>
                          {dateLocked && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDateLocked(false); setEffectiveDate(detectedDate ?? todayIso); }}
                              className="ml-auto text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                              title="Unlock — let auto-detect manage this"
                            >
                              unlock
                            </button>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateObj}
                          onSelect={(d) => {
                            if (!d) return;
                            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                            setEffectiveDate(iso);
                            setDateLocked(true);
                          }}
                          disabled={(d) => d > today}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    {isWeekend && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">
                        ⚠️ You have selected a weekend.
                      </span>
                    )}
                  </div>
                );
              })()}
              <Button size="sm" variant="outline" onClick={exportCsv} className="gap-2">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none rounded-md border border-border bg-background px-3 py-1.5">
                <FlaskConical className={`h-3.5 w-3.5 ${dryRun ? "text-amber-500" : "text-muted-foreground"}`} />
                <span className={dryRun ? "font-medium" : "text-muted-foreground"}>Simulate</span>
                <Switch checked={dryRun} onCheckedChange={setDryRun} />
              </label>
              {(() => {
                const isPerfect = !!canSync && !dryRun && counts.review === 0 && counts.unparsed === 0 && counts.mismatch === 0 && counts.new === 0;
                return (
                  <Button
                    size="lg"
                    disabled={!canSync}
                    onClick={() => setConfirmOpen(true)}
                    className={`gap-2 transition-all ${isPerfect ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/40 animate-pulse-soft" : ""}`}
                  >
                    {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : isPerfect ? <Sparkles className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    {dryRun ? "Simulate Sync" : isPerfect ? "Perfect batch — Sync now" : "Sync All Funds"}
                  </Button>
                );
              })()}
            </div>
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
        <Card className={`p-6 text-center space-y-4 ${syncResult.dryRun ? "border-amber-500/40" : ""}`}>
          <div className={`inline-flex items-center justify-center h-12 w-12 rounded-full ${syncResult.dryRun ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
            {syncResult.dryRun
              ? <FlaskConical className="h-6 w-6 text-amber-500" />
              : <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {syncResult.dryRun ? "Dry-run completed" : "All funds synced"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {syncResult.dryRun
                ? <>Simulated {syncResult.updated.length} update{syncResult.updated.length === 1 ? "" : "s"} and {syncResult.created.length} create{syncResult.created.length === 1 ? "" : "s"}. Triggers fired and rolled back — <b>no changes saved</b>.</>
                : <>{syncResult.updated.length} updated · {syncResult.created.length} created. Previous yields are saved automatically to history.</>}
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => { setSyncResult(null); if (!syncResult.dryRun) { setReport(null); setRaw(""); setEdits({}); } }}>
              {syncResult.dryRun ? "Back to review" : "Paste another batch"}
            </Button>
            {!syncResult.dryRun && (
              <Button variant="ghost" asChild>
                <a href="#log" onClick={(e) => {
                  e.preventDefault();
                  const tabs = document.querySelectorAll('[role="tab"]');
                  tabs.forEach((t) => { if ((t as HTMLElement).innerText.toLowerCase().includes("log")) (t as HTMLElement).click(); });
                }} className="gap-2">
                  View Change Log <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
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
            <AlertDialogTitle>{dryRun ? "Simulate sync?" : "Sync to database?"}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div>You are about to:</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li><b className="text-emerald-500">Update {counts.matched}</b> existing fund{counts.matched === 1 ? "" : "s"} {dryRun ? "(simulated)" : "(previous yields auto-saved to history)"}</li>
                  <li><b className="text-red-500">Create {counts.ready}</b> new fund{counts.ready === 1 ? "" : "s"} {dryRun ? "(simulated)" : ""}</li>
                  {counts.skipped > 0 && <li className="text-muted-foreground">Skip {counts.skipped} row{counts.skipped === 1 ? "" : "s"}</li>}
                </ul>
                <div className="rounded-md px-3 py-2 text-xs mt-2 bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400">
                  📅 This data will be recorded for{" "}
                  <b>
                    {effectiveDate
                      ? new Date(effectiveDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                      : "—"}
                  </b>. Confirm?
                  {effectiveDate && (() => {
                    const d = new Date(effectiveDate + "T00:00:00");
                    return d.getDay() === 0 || d.getDay() === 6 ? (
                      <div className="mt-1 text-amber-600 dark:text-amber-400">⚠ Selected date is a weekend — Kenyan markets are closed.</div>
                    ) : null;
                  })()}
                </div>
                <div className={`rounded-md px-3 py-2 text-xs ${dryRun ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30" : "bg-muted text-muted-foreground"}`}>
                  {dryRun
                    ? "Simulation mode: every UPDATE and INSERT will execute (so triggers fire), then the entire transaction is rolled back. Nothing is saved."
                    : "This is atomic — if any single row fails, the whole batch is rolled back and nothing changes."}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performSync}>
              {dryRun ? `Simulate ${counts.matched + counts.ready}` : `Yes, sync ${counts.matched + counts.ready}`} fund{counts.matched + counts.ready === 1 ? "" : "s"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BulkFundPasteVerify;
