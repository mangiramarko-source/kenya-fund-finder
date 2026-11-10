import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Search, PlayCircle, FlaskConical, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * MMF Inspector — answers "are money market funds auto-updating?"
 *
 * Shows: sync heartbeat (section_live_status), recent sync runs (change_log),
 * per-fund freshness (funds + fund_yield_snapshots), and lets an admin run a
 * dry-run diff against Serrari or trigger a real sync.
 */

interface FundRow {
  id: string;
  slug: string;
  name: string;
  yield_unit: string;
  annual_yield: number;
  daily_yield: number;
  fact_sheet_date: string | null;
  updated_at: string;
  is_published: boolean;
}

interface LiveStatus {
  is_live: boolean;
  last_verified_at: string;
  updated_at: string;
}

interface SyncLog {
  id: string;
  changed_at: string;
  new_values: {
    as_of_date?: string;
    updated_count?: number;
    created_count?: number;
    unchanged_count?: number;
  } | null;
}

interface InspectionRow {
  slug: string;
  name: string;
  fund_type: string;
  currency: string;
  status: "unchanged" | "date_only" | "would_update" | "would_create" | "drift_blocked";
  source_annual: number;
  source_as_of?: string | null;
  db_annual: number | null;
  db_fact_sheet_date: string | null;
  drift_pct: number | null;
}

interface FundInspection {
  source_as_of: string;
  notes: string[];
  rows: InspectionRow[];
  missing_from_source: Array<{ slug: string; db_annual: number; db_fact_sheet_date: string | null }>;
}

// Cron runs Mon–Fri at 06:30 and 11:00 UTC (see 20261104110000_automate_daily_fund_sync.sql).
const CRON_SCHEDULE_LABEL = "Mon–Fri 09:30 & 14:00 EAT";

const DAY_MS = 86_400_000;

/** Number of weekdays strictly between `from` and today (UTC). */
function businessDaysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const from = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(from.getTime())) return null;
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  let count = 0;
  for (let t = from.getTime() + DAY_MS; t <= todayUtc; t += DAY_MS) {
    const dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

function relative(iso: string | null | undefined): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
}

function freshnessBadge(days: number | null) {
  if (days === null) return <Badge variant="outline">No date</Badge>;
  if (days <= 1) return <Badge className="bg-emerald-600 hover:bg-emerald-600">Fresh</Badge>;
  if (days <= 3) return <Badge className="bg-amber-500 hover:bg-amber-500">{days} biz days</Badge>;
  return <Badge variant="destructive">Stale · {days} biz days</Badge>;
}

const STATUS_STYLES: Record<InspectionRow["status"], string> = {
  unchanged: "bg-muted text-muted-foreground",
  date_only: "bg-amber-600 text-white",
  would_update: "bg-blue-600 text-white",
  would_create: "bg-violet-600 text-white",
  drift_blocked: "bg-destructive text-destructive-foreground",
};

const AdminMmfInspector = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [funds, setFunds] = useState<FundRow[]>([]);
  const [latestSnapshot, setLatestSnapshot] = useState<Record<string, string>>({});
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [search, setSearch] = useState("");
  const [onlyStale, setOnlyStale] = useState(false);
  const [showUnpublished, setShowUnpublished] = useState(false);

  const [running, setRunning] = useState<null | "dry" | "live">(null);
  const [runResults, setRunResults] = useState<string[] | null>(null);
  const [inspection, setInspection] = useState<FundInspection | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [fundsRes, statusRes, logRes] = await Promise.all([
      supabase
        .from("funds")
        .select("id, slug, name, yield_unit, annual_yield, daily_yield, fact_sheet_date, updated_at, is_published")
        .eq("fund_type", "money_market")
        .order("annual_yield", { ascending: false }),
      supabase.from("section_live_status").select("is_live, last_verified_at, updated_at").eq("section_key", "funds").maybeSingle(),
      supabase
        .from("change_log")
        .select("id, changed_at, new_values")
        .eq("action", "serrari_funds_sync")
        .order("changed_at", { ascending: false })
        .limit(15),
    ]);

    const fundRows = (fundsRes.data as FundRow[] | null) ?? [];
    setFunds(fundRows);
    setLiveStatus((statusRes.data as LiveStatus | null) ?? null);
    setLogs((logRes.data as SyncLog[] | null) ?? []);

    if (fundRows.length) {
      const { data: snaps } = await supabase
        .from("fund_yield_snapshots")
        .select("fund_id, snapshot_date")
        .in("fund_id", fundRows.map((f) => f.id))
        .order("snapshot_date", { ascending: false })
        .limit(2000);
      const latest: Record<string, string> = {};
      for (const s of snaps ?? []) {
        if (!latest[s.fund_id]) latest[s.fund_id] = s.snapshot_date;
      }
      setLatestSnapshot(latest);
    }

    if (fundsRes.error) toast({ title: "Failed to load funds", description: fundsRes.error.message, variant: "destructive" });
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const runSync = async (mode: "dry" | "live") => {
    setRunning(mode);
    setRunResults(null);
    if (mode === "dry") setInspection(null);
    const { data, error } = await supabase.functions.invoke("fetch-market-data", {
      body: { fetch_type: "funds", ...(mode === "dry" ? { dry_run: true } : {}) },
    });
    setRunning(null);
    if (error) {
      toast({ title: mode === "dry" ? "Dry run failed" : "Sync failed", description: error.message, variant: "destructive" });
      return;
    }
    setRunResults((data?.results as string[]) ?? []);
    if (mode === "dry") {
      setInspection((data?.fund_inspection as FundInspection) ?? null);
    } else {
      toast({ title: "Sync finished", description: "Reloading data…" });
      load();
    }
  };

  const enriched = useMemo(
    () =>
      funds.map((f) => ({
        ...f,
        staleDays: businessDaysSince(f.fact_sheet_date),
        snapshot: latestSnapshot[f.id] ?? null,
      })),
    [funds, latestSnapshot],
  );

  const publishedEnriched = useMemo(
    () => enriched.filter((f) => f.is_published !== false),
    [enriched],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = showUnpublished ? enriched : publishedEnriched;
    return base.filter((f) => {
      if (onlyStale && (f.staleDays ?? 99) <= 1) return false;
      if (!q) return true;
      return f.name.toLowerCase().includes(q) || f.slug.toLowerCase().includes(q);
    });
  }, [enriched, publishedEnriched, search, onlyStale, showUnpublished]);

  const staleCount = publishedEnriched.filter((f) => (f.staleDays ?? 99) > 1).length;
  const newestFactSheet = publishedEnriched.reduce<string | null>(
    (max, f) => (f.fact_sheet_date && (!max || f.fact_sheet_date > max) ? f.fact_sheet_date : max),
    null,
  );
  const heartbeatAgeHrs = liveStatus ? (Date.now() - new Date(liveStatus.last_verified_at).getTime()) / 3_600_000 : null;
  // Weekend gap is ~3 days, so anything older than ~74h means the cron isn't firing.
  const heartbeatHealthy = heartbeatAgeHrs !== null && heartbeatAgeHrs < 74;

  const inspectionSummary = useMemo(() => {
    if (!inspection) return null;
    const mmf = inspection.rows.filter((r) => r.fund_type === "money_market");
    const count = (s: InspectionRow["status"]) => mmf.filter((r) => r.status === s).length;
    const priority: Record<InspectionRow["status"], number> = {
      would_update: 0,
      would_create: 1,
      drift_blocked: 2,
      date_only: 3,
      unchanged: 4,
    };
    return {
      total: mmf.length,
      unchanged: count("unchanged"),
      date_only: count("date_only"),
      would_update: count("would_update"),
      would_create: count("would_create"),
      drift_blocked: count("drift_blocked"),
      rows: [...mmf].sort((a, b) => priority[a.status] - priority[b.status]),
    };
  }, [inspection]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">MMF Update Inspector</h2>
          <p className="text-sm text-muted-foreground">Source: Serrari Group · Cron: {CRON_SCHEDULE_LABEL}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Reload
          </Button>
          <Button variant="secondary" size="sm" onClick={() => runSync("dry")} disabled={running !== null}>
            {running === "dry" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-1.5" />}
            Dry run vs source
          </Button>
          <Button size="sm" onClick={() => runSync("live")} disabled={running !== null}>
            {running === "live" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-1.5" />}
            Run sync now
          </Button>
        </div>
      </div>

      {/* Health summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Cron heartbeat</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-lg font-semibold">
              {heartbeatHealthy ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
              {relative(liveStatus?.last_verified_at)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Last time cron checked Serrari · {fmtDateTime(liveStatus?.last_verified_at)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Last yield change</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-lg font-semibold"><Clock className="h-5 w-5" />{relative(liveStatus?.updated_at)}</div>
            <p className="text-xs text-muted-foreground mt-1">Last time any fund rate changed · {fmtDateTime(liveStatus?.updated_at)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Newest fact-sheet date</CardTitle></CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{newestFactSheet ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">{businessDaysSince(newestFactSheet) ?? "?"} business days behind today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Stale MMFs</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-lg font-semibold ${staleCount ? "text-destructive" : ""}`}>{staleCount} / {publishedEnriched.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Published MMFs with fact sheet &gt; 1 business day old</p>
          </CardContent>
        </Card>
      </div>

      {!heartbeatHealthy && liveStatus && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
          <strong>The scheduled sync hasn't reached the database in {Math.round(heartbeatAgeHrs ?? 0)}h.</strong> Check that the
          <code className="mx-1">fetch-market-data-funds</code> pg_cron job exists and that the vault secrets
          <code className="mx-1">kff_project_url</code>/<code className="mx-1">kff_automations_secret_key</code> are valid
          (<code>select * from cron.job_run_details order by start_time desc</code>).
        </div>
      )}

      {/* Run output */}
      {runResults && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Function output</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 font-mono text-xs">
              {runResults.length === 0 && <li className="text-muted-foreground">No results returned</li>}
              {runResults.map((r, i) => (
                <li key={i} className={/fail|skipped|HTTP/i.test(r) ? "text-destructive" : ""}>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Dry run diff */}
      {inspection && inspectionSummary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Source vs DB (Serrari as of {inspection.source_as_of})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{inspectionSummary.total} MMFs in source</Badge>
              <Badge className={STATUS_STYLES.unchanged}>{inspectionSummary.unchanged} unchanged</Badge>
              {inspectionSummary.date_only > 0 && (
                <Badge className={STATUS_STYLES.date_only}>{inspectionSummary.date_only} date-only advance</Badge>
              )}
              <Badge className={STATUS_STYLES.would_update}>{inspectionSummary.would_update} would update</Badge>
              <Badge className={STATUS_STYLES.would_create}>{inspectionSummary.would_create} would create</Badge>
              <Badge className={STATUS_STYLES.drift_blocked}>{inspectionSummary.drift_blocked} blocked by &gt;25% drift guard</Badge>
            </div>
            {inspectionSummary.unchanged === inspectionSummary.total && inspectionSummary.total > 0 && (
              <p className="text-sm text-muted-foreground">
                Every source value already matches the DB — the source itself hasn't published new numbers since {inspection.source_as_of}.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="py-1 pr-3">Fund</th><th className="pr-3">Status</th><th className="pr-3 text-right">Source</th><th className="pr-3 text-right">DB</th><th className="pr-3 text-right">Delta</th><th className="pr-3">Source date</th><th>DB fact sheet</th></tr>
                </thead>
                <tbody>
                  {inspectionSummary.rows.map((r) => {
                    const delta = r.db_annual != null ? r.source_annual - r.db_annual : null;
                    return (
                      <tr key={r.slug} className="border-t">
                        <td className="py-1 pr-3">{r.name} <span className="text-xs text-muted-foreground">{r.currency}</span></td>
                        <td className="pr-3"><Badge className={STATUS_STYLES[r.status]}>{r.status.replace("_", " ")}</Badge></td>
                        <td className="pr-3 text-right tabular-nums">{r.source_annual.toFixed(2)}%</td>
                        <td className="pr-3 text-right tabular-nums">{r.db_annual != null ? `${r.db_annual.toFixed(2)}%` : "—"}</td>
                        <td className={`pr-3 text-right tabular-nums ${delta && Math.abs(delta) > 0.0001 ? (delta > 0 ? "text-emerald-600 font-medium" : "text-amber-600 font-medium") : "text-muted-foreground"}`}>
                          {delta != null ? `${delta > 0 ? "+" : ""}${delta.toFixed(2)}%` : "—"}
                        </td>
                        <td className="pr-3 text-xs">{r.source_as_of ?? inspection.source_as_of ?? "—"}</td>
                        <td className="text-xs">{r.db_fact_sheet_date ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {inspection.missing_from_source.length > 0 && (
              <div className="text-sm">
                <p className="font-medium text-destructive">
                  {inspection.missing_from_source.length} MMFs in the DB were not matched in the source (they will never auto-update):
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {inspection.missing_from_source.map((m) => `${m.slug} (${m.db_fact_sheet_date ?? "no date"})`).join(", ")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync history */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent syncs that changed data</CardTitle></CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No <code>serrari_funds_sync</code> entries in the change log yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="py-1 pr-3">Ran</th><th className="pr-3">Source date</th><th className="pr-3 text-right">Updated</th><th className="pr-3 text-right">Created</th><th className="text-right">Unchanged</th></tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="py-1 pr-3">{fmtDateTime(l.changed_at)} <span className="text-xs text-muted-foreground">({relative(l.changed_at)})</span></td>
                    <td className="pr-3">{l.new_values?.as_of_date ?? "—"}</td>
                    <td className="pr-3 text-right tabular-nums">{l.new_values?.updated_count ?? 0}</td>
                    <td className="pr-3 text-right tabular-nums">{l.new_values?.created_count ?? 0}</td>
                    <td className="text-right tabular-nums">{l.new_values?.unchanged_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Per-fund freshness */}
      <Card>
        <CardHeader className="pb-2 flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Per-fund freshness ({visible.length})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search fund…" className="pl-8 h-9 w-48" />
            </div>
            <Button variant={onlyStale ? "default" : "outline"} size="sm" onClick={() => setOnlyStale((v) => !v)}>Stale only</Button>
            {enriched.length > publishedEnriched.length && (
              <Button variant={showUnpublished ? "default" : "outline"} size="sm" onClick={() => setShowUnpublished((v) => !v)}>
                {showUnpublished ? "Hide unpublished" : `Show unpublished (${enriched.length - publishedEnriched.length})`}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3">Fund</th>
                  <th className="pr-3 text-right">Annual</th>
                  <th className="pr-3">Fact sheet</th>
                  <th className="pr-3">Latest snapshot</th>
                  <th className="pr-3">Row updated</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((f) => (
                  <tr key={f.id} className="border-t">
                    <td className="py-1.5 pr-3">
                      <div className="font-medium">{f.name}{!f.is_published && <span className="ml-1 text-xs text-muted-foreground">(unpublished)</span>}</div>
                      <div className="text-xs text-muted-foreground">{f.slug}</div>
                    </td>
                    <td className="pr-3 text-right tabular-nums">{Number(f.annual_yield).toFixed(2)}{f.yield_unit === "%" ? "%" : ` ${f.yield_unit}`}</td>
                    <td className="pr-3">{f.fact_sheet_date ?? "—"}</td>
                    <td className="pr-3">{f.snapshot ?? "—"}</td>
                    <td className="pr-3 text-xs">{relative(f.updated_at)}</td>
                    <td>{freshnessBadge(f.staleDays)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMmfInspector;
