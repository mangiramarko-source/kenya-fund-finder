import { useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface StockOption { id: string; symbol: string; name: string; }
interface Source { id: string; stock_id: string; source_url: string; source_domain: string; source_type: string; is_enabled: boolean; last_checked_at: string | null; last_error: string | null; stocks: StockOption; }

export default function AdminStockDisclosures() {
  const [stocks, setStocks] = useState<StockOption[]>([]); const [sources, setSources] = useState<Source[]>([]);
  const [stockId, setStockId] = useState(""); const [url, setUrl] = useState(""); const [type, setType] = useState("html"); const [busy, setBusy] = useState(false);
  const db = supabase as any;

  const load = async () => {
    const [{ data: stockRows }, { data: sourceRows }] = await Promise.all([
      db.from("stocks").select("id,symbol,name").eq("is_active", true).order("symbol"),
      db.from("stock_disclosure_sources").select("*, stocks!inner(id,symbol,name)").order("source_domain"),
    ]);
    setStocks(stockRows || []); setSources(sourceRows || []);
  };
  useEffect(() => { load(); }, []);

  const addSource = async () => {
    try {
      const parsed = new URL(url); if (parsed.protocol !== "https:") throw new Error("Source must use HTTPS");
      const { error } = await db.from("stock_disclosure_sources").insert({ stock_id: stockId, source_url: parsed.toString(), source_domain: parsed.hostname, source_type: type }); if (error) throw error;
      setUrl(""); toast.success("Issuer source added"); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not add source"); }
  };
  const run = async (sourceId?: string) => {
    setBusy(true); const { error } = await supabase.functions.invoke("fetch-stock-disclosures", { body: { source_id: sourceId, mode: "backfill" } }); setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Disclosure ingestion completed"); await load(); }
  };

  return <div className="space-y-5">
    <div><h2 className="text-xl font-bold">Stock Disclosures</h2><p className="text-sm text-muted-foreground">Manage approved issuer-owned sources. NSE pages must not be added.</p></div>
    <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-[180px_1fr_130px_auto]">
      <Select value={stockId} onValueChange={setStockId}><SelectTrigger><SelectValue placeholder="Stock" /></SelectTrigger><SelectContent>{stocks.map((stock) => <SelectItem key={stock.id} value={stock.id}>{stock.symbol} · {stock.name}</SelectItem>)}</SelectContent></Select>
      <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://issuer.com/investor-relations" />
      <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="html">HTML</SelectItem><SelectItem value="rss">RSS</SelectItem><SelectItem value="sitemap">Sitemap</SelectItem></SelectContent></Select>
      <Button onClick={addSource} disabled={!stockId || !url}><Plus className="mr-1 h-4 w-4" /> Add</Button>
    </div>
    <div className="flex justify-end"><Button variant="outline" onClick={() => run()} disabled={busy}><RefreshCw className={`mr-1 h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Run all</Button></div>
    <div className="space-y-2">{sources.map((source) => <div key={source.id} className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center">
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{source.stocks.symbol} · {source.stocks.name}</p><p className="truncate text-xs text-muted-foreground">{source.source_url}</p><p className={`mt-1 text-[11px] ${source.last_error ? "text-destructive" : "text-muted-foreground"}`}>{source.last_error || (source.last_checked_at ? `Checked ${new Date(source.last_checked_at).toLocaleString()}` : "Not checked yet")}</p></div>
      <Switch checked={source.is_enabled} onCheckedChange={async (checked) => { await db.from("stock_disclosure_sources").update({ is_enabled: checked }).eq("id", source.id); await load(); }} />
      <Button size="sm" variant="outline" onClick={() => run(source.id)} disabled={busy}>Run</Button>
      <Button size="icon" variant="ghost" onClick={async () => { await db.from("stock_disclosure_sources").delete().eq("id", source.id); await load(); }}><Trash2 className="h-4 w-4" /></Button>
    </div>)}</div>
  </div>;
}
