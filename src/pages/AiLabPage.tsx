import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Sparkles, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import PromptCard from "@/components/ai-lab/PromptCard";
import ScenarioResult from "@/components/ai-lab/ScenarioResult";
import CapabilitiesCard from "@/components/ai-lab/CapabilitiesCard";
import MarketContextCard from "@/components/ai-lab/MarketContextCard";
import { routePrompt, type RouterResult } from "@/lib/aiLab/router";
import { applyLiveContext, useMarketContext } from "@/lib/aiLab/marketContext";
import { fetchAssetHistory, type AssetHistory } from "@/lib/aiLab/history";

const MAIN_DISCLAIMER =
  "Data only. Not personal financial advice. Yields, prices, fees, taxes, and market conditions can change. Speak to a licensed adviser before making investment decisions.";

const AiLabPage = () => {
  const { user, isAdmin, loading } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<RouterResult | null>(null);
  const [contextNote, setContextNote] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, AssetHistory> | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const market = useMarketContext();

  useEffect(() => {
    if (!result || result.kind !== "compare") {
      setHistory(null);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    Promise.all(result.assets.map((a) => fetchAssetHistory(a, 30)))
      .then((rows) => {
        if (cancelled) return;
        const map: Record<string, AssetHistory> = {};
        result.assets.forEach((a, i) => { map[a.symbol] = rows[i]; });
        setHistory(map);
      })
      .finally(() => !cancelled && setHistoryLoading(false));
    return () => { cancelled = true; };
  }, [result]);

  useDocumentTitle(
    "AI Scenario Assistant – KenyaFundFinder",
    "Ask data questions about funds, stocks, and outcomes. Scenarios from available data — not personal financial advice."
  );

  if (loading) {
    return (
      <div className="container py-20 text-center text-muted-foreground">Loading…</div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">
          AI Lab is currently available to admins only.
        </p>
      </div>
    );
  }

  const handleRun = (p: string) => {
    const { prompt: enriched, note } = applyLiveContext(p, market.data);
    setPrompt(p);
    setContextNote(note ?? null);
    setResult(routePrompt(enriched, market.data));
  };

  return (
    <div className="container py-6 space-y-6 max-w-6xl">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent/15 text-accent">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-accent font-semibold">
            Admin preview · Phase 4 · 30-day history
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold font-heading">AI Scenario Assistant</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Ask data questions about funds, stocks, and possible outcomes. The assistant shows
          scenarios using available data. It does not give personal financial advice.
        </p>
      </header>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/90 leading-relaxed">{MAIN_DISCLAIMER}</p>
      </div>

      <MarketContextCard data={market.data} loading={market.loading} error={market.error} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="space-y-4">
          <PromptCard value={prompt} onChange={setPrompt} onSubmit={handleRun} />
          {contextNote && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-accent">
              {contextNote}
            </div>
          )}
          <ScenarioResult result={result} history={history} historyLoading={historyLoading} />
        </div>
        <aside className="hidden lg:block">
          <CapabilitiesCard />
        </aside>
      </div>
    </div>
  );
};

export default AiLabPage;
