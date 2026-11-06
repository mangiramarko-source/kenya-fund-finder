import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  RefreshCw,
  Search,
  PlayCircle,
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Stocks Inspector — answers "are NSE stock prices auto-updating correctly?"
 *
 * Shows:
 *  - Cron sync heartbeat (section_live_status for 'stocks')
 *  - Recent sync runs (change_log for 'stock_quotes_sync')
 *  - Per-stock freshness and active toggle (stocks + stock_price_history)
 *  - Dry-run diff against RapidAPI & official NSE fallback with >20% drift safety guard
 *  - Live manual sync trigger
 */

interface StockRow {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  price: number;
  previous_price: number | null;
  day_change: number;
  day_change_percent: number;
  volume: number;
  market_cap: number | null;
  pe_ratio: number | null;
  year_high: number | null;
  year_low: number | null;
  is_active: boolean;
  updated_at: string;
  provider_updated_at: string | null;
  quote_source: string | null;
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
    cached_count?: number;
    total_count?: number;
    drift_skipped_count?: number;
    provider_source?: string;
    write_errors?: number;
  } | null;
}

interface StockInspectionRow {
  id: string;
  symbol: string;
  name: string;
  is_active: boolean;
  status: "unchanged" | "would_update" | "drift_blocked" | "cached" | "missing" | "unpriced_or_new";
  quote_source: "rapidapi" | "nse" | "cache" | null;
  source_price: number | null;
  source_previous_price: number | null;
  source_day_change: number | null;
  source_day_change_percent: number | null;
  source_volume: number | null;
  db_price: number | null;
  db_day_change: number | null;
  db_day_change_percent: number | null;
  db_volume: number | null;
  drift_pct: number | null;
  provider_updated_at: string | null;
  db_updated_at: string;
}

interface StockInspection {
  source_as_of: string;
  provider_updated_at: string | null;
  source: string;
  notes: string[];
  summary: {
    total: number;
    unchanged: number;
    would_update: number;
    drift_blocked: number;
    cached: number;
    missing: number;
    unpriced_or_new: number;
  };
  rows: StockInspectionRow[];
  missing_from_source: Array<{
    symbol: string;
    name: string;
    is_active: boolean;
    db_price: number;
    db_updated_at: string;
  }>;
}

// Cron runs Mon–Fri hourly 09:00 to 17:00 EAT (06:00 to 14:00 UTC)
const CRON_SCHEDULE_LABEL = "Mon–Fri 09:00–17:00 EAT (hourly)";
const DAY_MS = 86_400_000;

/** Number of weekdays strictly between `from` and today (UTC). */
function businessDaysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const from = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00Z` : dateStr);
  if (Number.isNaN(from.getTime())) return null;
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  let count = 0;
  for (let t = fromUtc + DAY_MS; t <= todayUtc; t += DAY_MS) {
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

function freshnessBadge(days: number | null, isActive: boolean) {
  if (!isActive) return <Badge variant="outline" className="text-muted-foreground border-dashed">Inactive</Badge>;
  if (days === null) return <Badge variant="outline">No date</Badge>;
  if (days <= 1) return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Fresh</Badge>;
  if (days <= 3) return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">{days} biz days</Badge>;
  return <Badge variant="destructive">Stale · {days} biz days</Badge>;
}

const STATUS_STYLES: Record<StockInspectionRow["status"], string> = {
  unchanged: "bg-muted text-muted-foreground",
  would_update: "bg-blue-600 text-white",
  drift_blocked: "bg-destructive text-destructive-foreground",
  cached: "bg-amber-500 text-white",
  missing: "bg-rose-700 text-white",
  unpriced_or_new: "bg-violet-600 text-white",
};

function providerBadge(source: StockInspectionRow["quote_source"]) {
  if (source === "rapidapi") {
    return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">RapidAPI</Badge>;
  }
  if (source === "nse") {
    return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">NSE XHR</Badge>;
  }
  if (source === "cache") {
    return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">DB Cache</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground">—</Badge>;
}

const AdminStocksInspector = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [latestSnapshot, setLatestSnapshot] = useState<Record<string, string>>({});
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [search, setSearch] = useState("");
  const [onlyStale, setOnlyStale] = useState(false);
  const [onlyInactive, setOnlyInactive] = useState(false);
  const [allowHighDrift, setAllowHighDrift] = useState(false);

  const [running, setRunning] = useState<null | "dry" | "live">(null);
  const [runResults, setRunResults] = useState<string[] | null>(null);
  const [inspection, setInspection] = useState<StockInspection | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [stocksRes, statusRes, logRes] = await Promise.all([
      supabase
        .from("stocks")
        .select("id, symbol, name, sector, price, previous_price, day_change, day_change_percent, volume, market_cap, pe_ratio, year_high, year_low, is_active, updated_at, provider_updated_at, quote_source")
        .order("symbol", { ascending: true }),
      supabase
        .from("section_live_status")
        .select("is_live, last_verified_at, updated_at")
        .eq("section_key", "stocks")
        .maybeSingle(),
      supabase
        .from("change_log")
        .select("id, changed_at, new_values")
        .eq("action", "stock_quotes_sync")
        .order("changed_at", { ascending: false })
        .limit(15),
    ]);

    const stockRows = (stocksRes.data as StockRow[] | null) ?? [];
    setStocks(stockRows);
    setLiveStatus((statusRes.data as LiveStatus | null) ?? null);
    setLogs((logRes.data as SyncLog[] | null) ?? []);

    if (stockRows.length) {
      const { data: snaps } = await supabase
        .from("stock_price_history")
        .select("stock_id, snapshot_date")
        .in("stock_id", stockRows.map((s) => s.id))
        .order("snapshot_date", { ascending: false })
        .limit(2000);
      const latest: Record<string, string> = {};
      for (const s of snaps ?? []) {
        if (!latest[s.stock_id]) latest[s.stock_id] = s.snapshot_date;
      }
      setLatestSnapshot(latest);
    }

    if (stocksRes.error) {
      toast({ title: "Failed to load stocks", description: stocksRes.error.message, variant: "destructive" });
    }
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
      body: {
        fetch_type: "stocks",
        ...(mode === "dry" ? { dry_run: true } : {}),
        ...(allowHighDrift ? { allow_high_drift: true } : {}),
      },
    });

    setRunning(null);
    if (error) {
      toast({
        title: mode === "dry" ? "Dry run failed" : "Sync failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setRunResults((data?.results as string[]) ?? []);
    if (mode === "dry") {
      setInspection((data?.stock_inspection as StockInspection) ?? null);
    } else {
      toast({ title: "Stock sync finished", description: "Reloading stocks data…" });
      load();
    }
  };

  const toggleActive = async (stock: StockRow) => {
    const next = !stock.is_active;
    setStocks((prev) => prev.map((s) => (s.id === stock.id ? { ...s, is_active: next } : s)));
    const { error } = await supabase
      .from("stocks")
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq("id", stock.id);
    if (error) {
      setStocks((prev) => prev.map((s) => (s.id === stock.id ? { ...s, is_active: stock.is_active } : s)));
      toast({ title: "Failed to update stock", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${stock.symbol} ${next ? "activated" : "deactivated"}` });
    }
  };

  const enriched = useMemo(
    () =>
      stocks.map((s) => ({
        ...s,
        staleDays: businessDaysSince(s.provider_updated_at || s.updated_at),
        snapshot: latestSnapshot[s.id] ?? null,
      })),
    [stocks, latestSnapshot],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((s) => {
      if (onlyStale && (!s.is_active || (s.staleDays ?? 99) <= 1)) return false;
      if (onlyInactive && s.is_active) return false;
      if (!q) return true;
      return s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q);
    });
  }, [enriched, search, onlyStale, onlyInactive]);

  const activeCount = enriched.filter((s) => s.is_active).length;
  const inactiveCount = enriched.length - activeCount;
  const staleCount = enriched.filter((s) => s.is_active && (s.staleDays ?? 99) > 1).length;
  const newestUpdate = enriched.reduce<string | null>(
    (max, s) => {
      const ts = s.provider_updated_at || s.updated_at;
      return ts && (!max || ts > max) ? ts : max;
    },
    null,
  );

  const heartbeatAgeHrs = liveStatus
    ? (Date.now() - new Date(liveStatus.last_verified_at).getTime()) / 3_600_000
    : null;
  // Weekend gap is ~74h, weekdays >26h indicates cron issues.
  const heartbeatHealthy = heartbeatAgeHrs !== null && heartbeatAgeHrs < 74;

  const inspectionSummary = useMemo(() => {
    if (!inspection) return null;
    const rows = [...inspection.rows].sort((a, b) => {
      if (a.status === "drift_blocked" && b.status !== "drift_blocked") return -1;
      if (b.status === "drift_blocked" && a.status !== "drift_blocked") return 1;
      if (a.status === "would_update" && b.status !== "would_update") return -1;
      if (b.status === "would_update" && a.status !== "would_update") return 1;
      return a.symbol.localeCompare(b.symbol);
    });
    return {
      summary: inspection.summary,
      rows,
    };
  }, [inspection]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Stocks Update Inspector
          </h2>
          <p className="text-sm text-muted-foreground">
            Primary: RapidAPI · Fallback: Official NSE · Cron: {CRON_SCHEDULE_LABEL}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2 mr-2 bg-muted/50 px-2.5 py-1.5 rounded-md border text-xs">
            <Checkbox
              id="allow-high-drift"
              checked={allowHighDrift}
              onCheckedChange={(c) => setAllowHighDrift(Boolean(c))}
            />
            <Label htmlFor="allow-high-drift" className="cursor-pointer font-normal text-muted-foreground">
              Allow &gt;20% drift
            </Label>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Reload
          </Button>
          <Button variant="secondary" size="sm" onClick={() => runSync("dry")} disabled={running !== null}>
            {running === "dry" ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4 mr-1.5" />
            )}
            Dry run vs source
          </Button>
          <Button size="sm" onClick={() => runSync("live")} disabled={running !== null}>
            {running === "live" ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4 mr-1.5" />
            )}
            Run sync now
          </Button>
        </div>
      </div>

      {/* Health summary grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cron heartbeat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-lg font-semibold">
              {heartbeatHealthy ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              {relative(liveStatus?.last_verified_at)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last verification reached DB · {fmtDateTime(liveStatus?.last_verified_at)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last price change</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="h-5 w-5" />
              {relative(liveStatus?.updated_at || newestUpdate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {fmtDateTime(liveStatus?.updated_at || newestUpdate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stale active stocks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-semibold ${staleCount ? "text-destructive" : ""}`}>
              {staleCount} / {activeCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Quote older than 1 business day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tracked counters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {activeCount} active <span className="text-xs text-muted-foreground font-normal">({inactiveCount} inactive)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total {stocks.length} instruments in database
            </p>
          </CardContent>
        </Card>
      </div>

      {!heartbeatHealthy && liveStatus && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
          <strong>The scheduled stock sync hasn't reached the database in {Math.round(heartbeatAgeHrs ?? 0)}h.</strong> Check that the
          <code className="mx-1">fetch-market-data-stocks</code> pg_cron job exists and is scheduled Mon–Fri 06:00–14:00 UTC.
        </div>
      )}

      {/* Function output console */}
      {runResults && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Function output</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 font-mono text-xs">
              {runResults.length === 0 && <li className="text-muted-foreground">No results returned</li>}
              {runResults.map((r, i) => (
                <li key={i} className={/fail|skipped|blocked|HTTP|error/i.test(r) ? "text-destructive" : ""}>
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Dry run diff */}
      {inspection && inspectionSummary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Source vs DB (Source: {inspection.source.toUpperCase()} · As of {inspection.source_as_of})</span>
              {inspection.summary.drift_blocked > 0 && (
                <span className="flex items-center gap-1 text-xs text-destructive font-medium">
                  <ShieldAlert className="h-4 w-4" /> {inspection.summary.drift_blocked} counters blocked by &gt;20% drift guard
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{inspection.summary.total} stocks in inspection</Badge>
              <Badge className={STATUS_STYLES.unchanged}>{inspection.summary.unchanged} unchanged</Badge>
              <Badge className={STATUS_STYLES.would_update}>{inspection.summary.would_update} would update</Badge>
              {inspection.summary.drift_blocked > 0 && (
                <Badge className={STATUS_STYLES.drift_blocked}>
                  {inspection.summary.drift_blocked} blocked by &gt;20% drift
                </Badge>
              )}
              {inspection.summary.cached > 0 && (
                <Badge className={STATUS_STYLES.cached}>{inspection.summary.cached} cached fallback</Badge>
              )}
              {inspection.summary.missing > 0 && (
                <Badge className={STATUS_STYLES.missing}>{inspection.summary.missing} missing from source</Badge>
              )}
              {inspection.summary.unpriced_or_new > 0 && (
                <Badge className={STATUS_STYLES.unpriced_or_new}>
                  {inspection.summary.unpriced_or_new} new/unpriced
                </Badge>
              )}
            </div>

            {inspection.summary.unchanged === inspection.summary.total && inspection.summary.total > 0 && (
              <p className="text-sm text-muted-foreground">
                All source values match the database — no price, volume, or change differences detected since {inspection.source_as_of}.
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3">Stock</th>
                    <th className="pr-3">Source</th>
                    <th className="pr-3">Status</th>
                    <th className="pr-3 text-right">Source Price</th>
                    <th className="pr-3 text-right">DB Price</th>
                    <th className="pr-3 text-right">Drift</th>
                    <th className="pr-3 text-right">Day Chg</th>
                    <th className="pr-3 text-right">Volume</th>
                    <th>DB Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectionSummary.rows.map((r) => (
                    <tr key={r.symbol} className="border-t hover:bg-muted/30">
                      <td className="py-1.5 pr-3">
                        <div className="font-semibold">{r.symbol}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">{r.name}</div>
                      </td>
                      <td className="pr-3">{providerBadge(r.quote_source)}</td>
                      <td className="pr-3">
                        <Badge className={STATUS_STYLES[r.status]}>{r.status.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="pr-3 text-right tabular-nums font-mono">
                        {r.source_price != null ? `KES ${r.source_price.toFixed(2)}` : "—"}
                      </td>
                      <td className="pr-3 text-right tabular-nums font-mono text-muted-foreground">
                        {r.db_price != null ? `KES ${r.db_price.toFixed(2)}` : "—"}
                      </td>
                      <td className="pr-3 text-right tabular-nums">
                        {r.drift_pct != null ? (
                          <span className={r.drift_pct > 20 ? "text-destructive font-semibold" : ""}>
                            {r.drift_pct}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="pr-3 text-right tabular-nums text-xs">
                        {r.source_day_change != null ? (
                          <span className={r.source_day_change > 0 ? "text-emerald-600" : r.source_day_change < 0 ? "text-destructive" : ""}>
                            {r.source_day_change > 0 ? `+${r.source_day_change.toFixed(2)}` : r.source_day_change.toFixed(2)}
                            {r.source_day_change_percent != null ? ` (${r.source_day_change_percent}%)` : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="pr-3 text-right tabular-nums text-xs text-muted-foreground">
                        {r.source_volume != null ? r.source_volume.toLocaleString() : "—"}
                      </td>
                      <td className="text-xs text-muted-foreground">{relative(r.db_updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {inspection.missing_from_source.length > 0 && (
              <div className="text-sm rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="font-medium text-destructive">
                  {inspection.missing_from_source.length} active stocks were not returned by external providers:
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {inspection.missing_from_source.map((m) => `${m.symbol} (${relative(m.db_updated_at)})`).join(", ")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync history from change_log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent stock syncs that touched data</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No <code>stock_quotes_sync</code> entries recorded in the change log yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3">Ran</th>
                    <th className="pr-3">Provider</th>
                    <th className="pr-3 text-right">Updated</th>
                    <th className="pr-3 text-right">Cached</th>
                    <th className="pr-3 text-right">Total</th>
                    <th className="pr-3 text-right">Drift Skipped</th>
                    <th className="text-right">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="py-1 pr-3">
                        {fmtDateTime(l.changed_at)}{" "}
                        <span className="text-xs text-muted-foreground">({relative(l.changed_at)})</span>
                      </td>
                      <td className="pr-3 text-xs uppercase font-medium">{l.new_values?.provider_source ?? "—"}</td>
                      <td className="pr-3 text-right tabular-nums text-emerald-600 font-medium">
                        {l.new_values?.updated_count ?? 0}
                      </td>
                      <td className="pr-3 text-right tabular-nums text-muted-foreground">
                        {l.new_values?.cached_count ?? 0}
                      </td>
                      <td className="pr-3 text-right tabular-nums">{l.new_values?.total_count ?? 0}</td>
                      <td className="pr-3 text-right tabular-nums text-destructive">
                        {l.new_values?.drift_skipped_count ?? 0}
                      </td>
                      <td className="text-right tabular-nums">
                        {(l.new_values?.write_errors ?? 0) > 0 ? (
                          <span className="text-destructive font-semibold">{l.new_values?.write_errors}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-stock freshness and active inventory table */}
      <Card>
        <CardHeader className="pb-2 flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Tracked Stock Inventory ({visible.length})</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Toggle active state or inspect individual price freshness</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search symbol, name, sector…"
                className="pl-8 h-9 w-52 text-xs"
              />
            </div>
            <Button
              variant={onlyStale ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyStale((v) => !v)}
            >
              Stale only
            </Button>
            <Button
              variant={onlyInactive ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyInactive((v) => !v)}
            >
              Inactive only
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading stocks…
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3">Stock</th>
                  <th className="pr-3">Sector</th>
                  <th className="pr-3 text-right">Price</th>
                  <th className="pr-3 text-right">Day Chg</th>
                  <th className="pr-3">Provider Timestamp</th>
                  <th className="pr-3">Latest Snapshot</th>
                  <th className="pr-3">Row Updated</th>
                  <th className="pr-3">Freshness</th>
                  <th className="text-right">Active</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.id} className={`border-t hover:bg-muted/20 ${!s.is_active ? "opacity-60 bg-muted/10" : ""}`}>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Link to={`/stocks/${s.symbol}`} className="hover:underline flex items-center gap-1" target="_blank">
                          {s.symbol} <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </Link>
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{s.name}</div>
                    </td>
                    <td className="pr-3 text-xs text-muted-foreground">{s.sector}</td>
                    <td className="pr-3 text-right tabular-nums font-mono font-medium">
                      KES {Number(s.price).toFixed(2)}
                    </td>
                    <td className="pr-3 text-right tabular-nums text-xs">
                      <span className={s.day_change > 0 ? "text-emerald-600" : s.day_change < 0 ? "text-destructive" : "text-muted-foreground"}>
                        {s.day_change > 0 ? `+${s.day_change.toFixed(2)}` : s.day_change.toFixed(2)}
                        {s.day_change_percent != null ? ` (${s.day_change_percent}%)` : ""}
                      </span>
                    </td>
                    <td className="pr-3 text-xs">
                      {s.provider_updated_at ? (
                        <div>
                          <div>{relative(s.provider_updated_at)}</div>
                          <div className="text-[10px] text-muted-foreground">{s.quote_source ?? "unknown"}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="pr-3 text-xs font-mono">{s.snapshot ?? "—"}</td>
                    <td className="pr-3 text-xs text-muted-foreground">{relative(s.updated_at)}</td>
                    <td className="pr-3">{freshnessBadge(s.staleDays, s.is_active)}</td>
                    <td className="text-right">
                      <Switch
                        checked={s.is_active}
                        onCheckedChange={() => toggleActive(s)}
                        aria-label={`Toggle active state for ${s.symbol}`}
                      />
                    </td>
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

export default AdminStocksInspector;