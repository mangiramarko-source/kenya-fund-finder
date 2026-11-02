import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clipboard, Copy, Loader2, RefreshCw, Sparkles, XCircle } from "lucide-react";
import {
  parseSimplePaste,
  type SimpleFundLookup,
  type SimpleParsedRow,
} from "@/lib/simpleUnitTrustPaste";
import {
  SERRARI_MMF_SNAPSHOT_2026_11_02,
  fetchLiveSerrariMmfRows,
  formatSerrariForSimplePaste,
  hasSerrariMmfChanged,
} from "@/lib/serrariMmfSync";

/**
 * Strict, going-forward-only paste tool for unit-trust yield updates.
 * Update-only. Never creates funds. See src/lib/simpleUnitTrustPaste.ts.
 */
const SimpleUnitTrustPaste = () => {
  const [funds, setFunds] = useState<SimpleFundLookup[]>([]);
  const [raw, setRaw] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [acknowledgedDrift, setAcknowledgedDrift] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [fetchingSerrari, setFetchingSerrari] = useState(false);
  const [runningEdgeSync, setRunningEdgeSync] = useState(false);

  // Load unit trusts (all fund types are unit trusts in this app).
  useEffect(() => {
    supabase
      .from("funds")
      .select("id, slug, manager, name, fund_type, yield_unit, annual_yield, daily_yield")
      .order("manager")
      .then(({ data, error }) => {
        if (error) { toast.error("Failed to load funds: " + error.message); return; }
        setFunds((data || []).map((f) => ({
          ...f,
          annual_yield: Number(f.annual_yield ?? 0),
          daily_yield: Number(f.daily_yield ?? 0),
        })) as SimpleFundLookup[]);
      });
  }, []);

  const result = useMemo(() => parseSimplePaste(raw, funds), [raw, funds]);

  const copyTemplate = async () => {
    const lines = ["# fund_slug\tdaily\tannual"];
    funds.forEach((f) => {
      lines.push(`${f.slug}\t${f.daily_yield}\t${f.annual_yield}`);
    });
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success(`Copied template for ${funds.length} funds`);
    } catch {
      toast.error("Clipboard copy failed");
    }
  };

  const loadFromSerrari = async () => {
    setFetchingSerrari(true);
    const bySlug = new Map(funds.map((f) => [f.slug.toLowerCase(), f]));
    try {
      const live = await fetchLiveSerrariMmfRows();
      const changedRows = live.allRows.filter((r) => {
        const existing = bySlug.get(r.slug.toLowerCase());
        if (!existing) return false;
        return hasSerrariMmfChanged(existing, r);
      });
      setDate(live.asOfDate);
      if (changedRows.length === 0) {
        setRaw("");
        toast.info(
          `All ${live.allRows.length} Serrari MMFs match your current database — 0 rate changes as of ${live.asOfDate}`,
        );
      } else {
        setRaw(formatSerrariForSimplePaste(changedRows));
        toast.success(
          `Loaded ${changedRows.length} changed MMF${changedRows.length === 1 ? "" : "s"} (${live.allRows.length - changedRows.length} unchanged skipped) for ${live.asOfDate}`,
        );
      }
    } catch {
      // Fallback to verified snapshot if live fetch is blocked
      const changedFallback = SERRARI_MMF_SNAPSHOT_2026_11_02.filter((s) => {
        const existing = bySlug.get(s.slug.toLowerCase());
        if (!existing) return bySlug.size === 0;
        return hasSerrariMmfChanged(existing, s);
      });
      setDate("2026-11-02");
      if (changedFallback.length === 0) {
        setRaw("");
        toast.info("All Serrari MMFs match your current database — 0 rate changes to apply");
      } else {
        const fallbackLines = changedFallback.map(
          (s) => `${s.slug}\t${s.daily_yield.toFixed(2)}\t${s.annual_yield.toFixed(2)}`,
        );
        setRaw(`# Serrari Group MMF Snapshot (2026-11-02)\n# fund_slug\tdaily\tannual\n${fallbackLines.join("\n")}`);
        toast.info(`Loaded ${changedFallback.length} changed MMFs from verified Serrari snapshot`);
      }
    } finally {
      setFetchingSerrari(false);
    }
  };

  const runServerSerrariSync = async () => {
    setRunningEdgeSync(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-market-data", {
        body: { fetch_type: "mmf" },
      });
      if (error) {
        toast.error("Serrari Edge sync failed: " + error.message);
        return;
      }
      const summary = Array.isArray((data as { results?: string[] })?.results)
        ? (data as { results: string[] }).results.find((line) => line.startsWith("MMF (Serrari"))
        : undefined;
      toast.success(summary || "Checked Serrari Group MMF rates (only changed funds updated)");
      const { data: refreshed } = await supabase
        .from("funds")
        .select("id, slug, manager, name, fund_type, yield_unit, annual_yield, daily_yield")
        .order("manager");
      if (refreshed) {
        setFunds(
          refreshed.map((f) => ({
            ...f,
            annual_yield: Number(f.annual_yield ?? 0),
            daily_yield: Number(f.daily_yield ?? 0),
          })) as SimpleFundLookup[],
        );
      }
      if (data && Array.isArray((data as { results?: string[] }).results)) {
        console.info("[Serrari Edge Sync]", (data as { results: string[] }).results);
      }
    } finally {
      setRunningEdgeSync(false);
    }
  };

  const canSync =
    result.rows.length > 0 &&
    result.blockedCount === 0 &&
    result.okCount > 0 &&
    (result.highDriftCount === 0 || acknowledgedDrift) &&
    !syncing;

  const sync = async () => {
    if (!canSync) return;
    setSyncing(true);
    const payload = result.rows
      .filter(
        (r) =>
          r.status === "OK" &&
          r.fund &&
          (Math.abs((r.daily ?? 0) - r.fund.daily_yield) > 0.0001 ||
            Math.abs((r.annual ?? 0) - r.fund.annual_yield) > 0.0001),
      )
      .map((r) => ({
        action: "update",
        id: r.fund!.id,
        annual_yield: r.annual,
        daily_yield: r.daily,
        yield_unit: r.fund!.yield_unit,
        fund_type: r.fund!.fund_type,
      }));

    if (payload.length === 0) {
      setSyncing(false);
      toast.info("No yield changes detected — skipped updating unchanged funds");
      return;
    }

    const { data, error } = await supabase.rpc("bulk_sync_funds", {
      payload: payload as any,
      dry_run: false,
      p_effective_date: date,
    });
    setSyncing(false);
    if (error) {
      toast.error("Sync failed: " + error.message);
      return;
    }
    const updated = Array.isArray((data as any)?.updated) ? (data as any).updated.length : payload.length;
    toast.success(`Updated ${updated} funds for ${date}`);
    setRaw("");
    setAcknowledgedDrift(false);
    // refresh local snapshot of yields
    const { data: refreshed } = await supabase
      .from("funds")
      .select("id, slug, manager, name, fund_type, yield_unit, annual_yield, daily_yield")
      .order("manager");
    if (refreshed) {
      setFunds(refreshed.map((f) => ({
        ...f,
        annual_yield: Number(f.annual_yield ?? 0),
        daily_yield: Number(f.daily_yield ?? 0),
      })) as SimpleFundLookup[]);
    }
  };

  const statusBadge = (r: SimpleParsedRow) => {
    if (r.status === "OK") {
      return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500"><CheckCircle2 className="h-3 w-3" /> OK</span>;
    }
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500"><XCircle className="h-3 w-3" /> {r.status}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-2">
        <p className="font-semibold text-sm">Simple Paste — update existing unit trusts only</p>
        <p className="text-muted-foreground">
          One row per fund, tab- or comma-separated, exactly 3 columns:
          <code className="ml-1 px-1 py-0.5 rounded bg-card border border-border">fund_slug&nbsp;&nbsp;daily&nbsp;&nbsp;annual</code>.
          Blank lines and lines starting with <code>#</code> are ignored. Never creates funds — use the Advanced Paste tool for new ones.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="default"
            onClick={loadFromSerrari}
            disabled={fetchingSerrari}
            className="gap-1.5 h-8 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {fetchingSerrari ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Fetch from Serrari (Preview)
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={runServerSerrariSync}
            disabled={runningEdgeSync}
            className="gap-1.5 h-8"
          >
            {runningEdgeSync ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            1-Click Sync Serrari (KES + USD)
          </Button>
          <Button size="sm" variant="outline" onClick={copyTemplate} className="gap-1.5 h-8">
            <Copy className="h-3.5 w-3.5" /> Copy fund-ID template
          </Button>
          <span className="text-[11px] text-muted-foreground">Pull live KES + USD MMFs from serrarigroup.com/ke/mmf or paste rows manually.</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <div>
          <Label className="text-xs">Paste rows</Label>
          <Textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="britam-money-market	9.26	9.71&#10;icea-money-market	7.75	8.06"
            className="mt-1 min-h-[180px] font-mono text-xs"
            style={{ fontSize: "16px" }}
          />
        </div>
        <div>
          <Label className="text-xs">Effective date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1"
          />
          <div className="mt-3 space-y-1 text-[11px]">
            <div>Rows parsed: <b>{result.rows.length}</b></div>
            <div className="text-emerald-500">OK: <b>{result.okCount}</b></div>
            <div className="text-red-500">Blocked: <b>{result.blockedCount}</b></div>
            <div className="text-yellow-500">High drift: <b>{result.highDriftCount}</b></div>
          </div>
        </div>
      </div>

      {result.rows.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-2 py-1.5 text-left">#</th>
                <th className="px-2 py-1.5 text-left">Fund</th>
                <th className="px-2 py-1.5 text-right">Daily (new)</th>
                <th className="px-2 py-1.5 text-right">Annual (new)</th>
                <th className="px-2 py-1.5 text-right">Prev annual</th>
                <th className="px-2 py-1.5 text-right">Drift</th>
                <th className="px-2 py-1.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.index} className="border-t border-border align-top">
                  <td className="px-2 py-1.5 text-muted-foreground">{r.index}</td>
                  <td className="px-2 py-1.5">
                    {r.fund ? (
                      <div>
                        <div className="font-medium">{r.fund.manager}</div>
                        <div className="text-[10px] text-muted-foreground">{r.fund.fund_type} · {r.fund.yield_unit} · <code>{r.fund.slug}</code></div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-mono text-[10px]">{r.key || "—"}</div>
                        {r.errorMessage && <div className="text-[10px] text-red-500">{r.errorMessage}</div>}
                      </div>
                    )}
                    {r.warnings.length > 0 && (
                      <div className="mt-1 text-[10px] text-yellow-500 flex items-start gap-1">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{r.warnings.join(" · ")}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.daily ?? "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.annual ?? "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{r.prevAnnual ?? "—"}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${r.drift !== undefined && r.drift > 25 ? "text-yellow-500 font-medium" : "text-muted-foreground"}`}>
                    {r.drift !== undefined ? r.drift.toFixed(1) + "%" : "—"}
                  </td>
                  <td className="px-2 py-1.5">{statusBadge(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.highDriftCount > 0 && (
        <label className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs cursor-pointer">
          <Checkbox checked={acknowledgedDrift} onCheckedChange={(v) => setAcknowledgedDrift(!!v)} className="mt-0.5" />
          <span>I reviewed all <b>{result.highDriftCount}</b> high-drift row{result.highDriftCount === 1 ? "" : "s"} (&gt; 25% change vs previous annual).</span>
        </label>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground">
          {result.blockedCount > 0 && `Fix or remove ${result.blockedCount} blocked row(s) before syncing.`}
        </div>
        <Button onClick={sync} disabled={!canSync} className="gap-1.5">
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clipboard className="h-3.5 w-3.5" />}
          Sync {result.okCount} fund{result.okCount === 1 ? "" : "s"} for {date}
        </Button>
      </div>
    </div>
  );
};

export default SimpleUnitTrustPaste;
