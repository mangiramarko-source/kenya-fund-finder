import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clipboard, Copy, Loader2, XCircle } from "lucide-react";
import {
  parseSimplePaste,
  type SimpleFundLookup,
  type SimpleParsedRow,
} from "@/lib/simpleUnitTrustPaste";

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
      .filter((r) => r.status === "OK" && r.fund)
      .map((r) => ({
        action: "update",
        id: r.fund!.id,
        annual_yield: r.annual,
        daily_yield: r.daily,
        yield_unit: r.fund!.yield_unit,
        fund_type: r.fund!.fund_type,
      }));

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
          <Button size="sm" variant="outline" onClick={copyTemplate} className="gap-1.5 h-8">
            <Copy className="h-3.5 w-3.5" /> Copy fund-ID template
          </Button>
          <span className="text-[11px] text-muted-foreground">Paste into a spreadsheet, fill in daily &amp; annual, paste back here.</span>
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
