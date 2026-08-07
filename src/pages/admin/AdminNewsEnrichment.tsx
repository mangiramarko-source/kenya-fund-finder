import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, ExternalLink, Sparkles, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ArticleRow = {
  id: string;
  title: string;
  summary: string;
  url: string | null;
  content: string | null;
  source: string;
  status: string;
  date_published: string;
  updated_at: string;
};

type FilterStatus = "all" | "missing" | "short" | "enriched" | "no_url";

const SHORT_THRESHOLD = 200;

const classifyArticle = (a: ArticleRow): FilterStatus => {
  if (!a.url) return "no_url";
  const len = (a.content ?? "").trim().length;
  if (len === 0) return "missing";
  if (len < SHORT_THRESHOLD) return "short";
  return "enriched";
};

const statusBadge = (s: FilterStatus) => {
  switch (s) {
    case "enriched":
      return <Badge variant="outline" className="gap-1 text-success border-success/40"><CheckCircle2 className="h-3 w-3" /> Enriched</Badge>;
    case "missing":
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Missing</Badge>;
    case "short":
      return <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" /> Short</Badge>;
    case "no_url":
      return <Badge variant="outline" className="gap-1 text-muted-foreground">No URL</Badge>;
    default:
      return null;
  }
};

const AdminNewsEnrichment = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("missing");
  const [search, setSearch] = useState("");
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [batchRunning, setBatchRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("news_articles")
      .select("id, title, summary, url, content, source, status, date_published, updated_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: "Failed to load articles", description: error.message, variant: "destructive" });
    } else {
      setRows((data as ArticleRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c = { all: rows.length, missing: 0, short: 0, enriched: 0, no_url: 0 } as Record<FilterStatus, number>;
    for (const r of rows) c[classifyArticle(r)]++;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const s = classifyArticle(r);
      if (filter !== "all" && s !== filter) return false;
      if (q && !(r.title.toLowerCase().includes(q) || r.source.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, filter, search]);

  const runOne = async (id: string): Promise<{ ok: boolean; error?: string }> => {
    setRunningIds((prev) => new Set(prev).add(id));
    try {
      const { data, error } = await supabase.functions.invoke("enrich-article", { body: { articleId: id } });
      if (error) {
        const msg = (data as { error?: string } | null)?.error || error.message;
        toast({ title: "Enrichment failed", description: msg, variant: "destructive" });
        return { ok: false, error: msg };
      }
      const content = (data as { content?: string } | null)?.content;
      if (content) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, content } : r)));
      }
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Enrichment failed", description: msg, variant: "destructive" });
      return { ok: false, error: msg };
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const runVisibleBatch = async () => {
    const targets = filtered.filter((r) => r.url && classifyArticle(r) !== "enriched").slice(0, 10);
    if (targets.length === 0) {
      toast({ title: "Nothing to run", description: "No eligible articles in current view." });
      return;
    }
    setBatchRunning(true);
    let ok = 0;
    let fail = 0;
    for (const t of targets) {
      const res = await runOne(t.id);
      res.ok ? ok++ : fail++;
      // small spacing to avoid hammering rate limits
      await new Promise((r) => setTimeout(r, 400));
    }
    setBatchRunning(false);
    toast({ title: "Batch complete", description: `Enriched ${ok}, failed ${fail}` });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">News Enrichment</h2>
          <p className="text-sm text-muted-foreground">Review and re-run AI summary enrichment for articles.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Reload
          </Button>
          <Button size="sm" onClick={runVisibleBatch} disabled={batchRunning || loading}>
            {batchRunning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Run batch (max 10)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {(["all", "missing", "short", "enriched", "no_url"] as FilterStatus[]).map((s) => (
          <Card
            key={s}
            className={`p-3 cursor-pointer transition-colors ${filter === s ? "border-accent" : "hover:border-muted-foreground/30"}`}
            onClick={() => setFilter(s)}
          >
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {s === "no_url" ? "No URL" : s}
            </div>
            <div className="text-2xl font-bold">{counts[s]}</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or source…"
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
          <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({counts.all})</SelectItem>
            <SelectItem value="missing">Missing ({counts.missing})</SelectItem>
            <SelectItem value="short">Short ({counts.short})</SelectItem>
            <SelectItem value="enriched">Enriched ({counts.enriched})</SelectItem>
            <SelectItem value="no_url">No URL ({counts.no_url})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Source</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Length</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No articles match the filter.</TableCell></TableRow>
            ) : (
              filtered.map((r) => {
                const s = classifyArticle(r);
                const len = (r.content ?? "").trim().length;
                const isRunning = runningIds.has(r.id);
                const canRun = !!r.url && s !== "enriched";
                return (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-md">
                      <div className="font-medium truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground truncate md:hidden">{r.source}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{r.source}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{r.date_published}</TableCell>
                    <TableCell>{statusBadge(s)}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{len}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.url && (
                          <Button asChild variant="ghost" size="icon" title="Open source">
                            <a href={r.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={s === "enriched" ? "outline" : "default"}
                          disabled={!canRun || isRunning || batchRunning}
                          onClick={() => runOne(r.id)}
                        >
                          {isRunning ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                          {s === "enriched" ? "Re-run" : "Enrich"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminNewsEnrichment;
