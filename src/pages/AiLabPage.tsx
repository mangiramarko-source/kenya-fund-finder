import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Sparkles, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import CapabilitiesCard from "@/components/ai-lab/CapabilitiesCard";
import MarketContextCard from "@/components/ai-lab/MarketContextCard";
import AiLabChat, { type CompareState } from "@/components/ai-lab/AiLabChat";
import { routePrompt } from "@/lib/aiLab/router";
import { applyLiveContext, useMarketContext } from "@/lib/aiLab/marketContext";
import { useNewsContext } from "@/lib/aiLab/newsContext";
import { AI_LAB_BETA_BADGE, AI_LAB_BETA_NOTE } from "@/lib/aiLab/readiness";
import {
  getAiLabAccessDeniedMessage,
  resolveAiLabAccess,
} from "@/lib/aiLab/accessGate";
import AiLabAccessCard from "@/components/ai-lab/AiLabAccessCard";
import {
  fetchAssetHistory,
  type AssetHistory,
  type LookbackDays,
} from "@/lib/aiLab/history";
import {
  buildClarifyingResponse,
  createAssistantMessage,
  createUserMessage,
  deriveSessionContext,
  getAssistantTextFromResult,
  type AiLabChatMessage,
} from "@/lib/aiLab/chat";

const MAIN_DISCLAIMER =
  "Data only. Not personal financial advice. Yields, prices, fees, taxes, and market conditions can change. Speak to a licensed adviser before making investment decisions.";

const DEFAULT_LOOKBACK: LookbackDays = 30;

const AiLabPage = () => {
  const { user, isAdmin, loading } = useAuth();
  const [messages, setMessages] = useState<AiLabChatMessage[]>([]);
  const [compareLookback, setCompareLookback] = useState<Record<string, LookbackDays>>({});
  const [compareHistory, setCompareHistory] = useState<
    Record<string, Record<string, AssetHistory> | null>
  >({});
  const [compareHistoryLoading, setCompareHistoryLoading] = useState<
    Record<string, boolean>
  >({});
  const market = useMarketContext();
  const news = useNewsContext();

  const compareMessageIds = useMemo(
    () =>
      messages
        .filter((m) => m.role === "assistant" && m.result?.kind === "compare")
        .map((m) => m.id),
    [messages],
  );

  useEffect(() => {
    const cancelled = new Map<string, boolean>();

    for (const messageId of compareMessageIds) {
      cancelled.set(messageId, false);
      const msg = messages.find((m) => m.id === messageId);
      if (!msg?.result || msg.result.kind !== "compare") continue;

      const compareResult = msg.result;
      const lookbackDays = compareLookback[messageId] ?? DEFAULT_LOOKBACK;

      setCompareHistoryLoading((prev) => ({ ...prev, [messageId]: true }));
      Promise.all(compareResult.assets.map((a) => fetchAssetHistory(a, lookbackDays)))
        .then((rows) => {
          if (cancelled.get(messageId)) return;
          const map: Record<string, AssetHistory> = {};
          compareResult.assets.forEach((a, i) => {
            map[a.symbol] = rows[i];
          });
          setCompareHistory((prev) => ({ ...prev, [messageId]: map }));
        })
        .finally(() => {
          if (!cancelled.get(messageId)) {
            setCompareHistoryLoading((prev) => ({ ...prev, [messageId]: false }));
          }
        });
    }

    return () => {
      for (const messageId of cancelled.keys()) {
        cancelled.set(messageId, true);
      }
    };
  }, [compareMessageIds, messages, compareLookback]);

  const compareStateByMessageId = useMemo(() => {
    const state: Record<string, CompareState> = {};
    for (const messageId of compareMessageIds) {
      state[messageId] = {
        lookbackDays: compareLookback[messageId] ?? DEFAULT_LOOKBACK,
        history: compareHistory[messageId] ?? null,
        historyLoading: compareHistoryLoading[messageId] ?? false,
      };
    }
    return state;
  }, [compareMessageIds, compareLookback, compareHistory, compareHistoryLoading]);

  useDocumentTitle(
    "AI Scenario Assistant – KenyaFundFinder",
    "Ask data questions about funds, stocks, and outcomes. Scenarios from available data — not personal financial advice."
  );

  const handleLookbackChange = useCallback((messageId: string, days: LookbackDays) => {
    setCompareLookback((prev) => ({ ...prev, [messageId]: days }));
  }, []);

  const handleSubmit = useCallback(
    (prompt: string) => {
      const userMessage = createUserMessage(prompt);
      setMessages((prev) => [...prev, userMessage]);

      const sessionContext = deriveSessionContext(messages);
      const clarifying = buildClarifyingResponse(prompt, sessionContext);

      if (clarifying) {
        const assistantMessage = createAssistantMessage({
          text: clarifying.text,
          status: "clarifying",
        });
        setMessages((prev) => [...prev, assistantMessage]);
        return;
      }

      const { prompt: enriched, note } = applyLiveContext(prompt, market.data);
      const result = routePrompt(enriched, market.data, news.data);
      const assistantMessage = createAssistantMessage({
        text: getAssistantTextFromResult(result),
        result,
        contextNote: note ?? undefined,
      });
      setMessages((prev) => [...prev, assistantMessage]);
    },
    [messages, market.data, news.data],
  );

  if (loading) {
    return (
      <div className="container py-20 text-center text-muted-foreground">Loading…</div>
    );
  }

  const access = resolveAiLabAccess({ user, isAdmin });

  if (!access.allowed) {
    if (access.reason === "logged-out") {
      return <Navigate to={access.loginPath} replace />;
    }
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">{getAiLabAccessDeniedMessage(access.reason)}</p>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6 max-w-6xl">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent/15 text-accent">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-accent font-semibold">
            {AI_LAB_BETA_BADGE}
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold font-heading">AI Scenario Assistant</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Ask data questions about funds, stocks, and possible outcomes. The assistant shows
          scenarios using available data. It does not give personal financial advice.
        </p>
      </header>

      <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/90 leading-relaxed">{AI_LAB_BETA_NOTE}</p>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/90 leading-relaxed">{MAIN_DISCLAIMER}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <AiLabChat
          messages={messages}
          onSubmit={handleSubmit}
          compareStateByMessageId={compareStateByMessageId}
          onLookbackChange={handleLookbackChange}
        />

        <aside className="space-y-4">
          {user ? <AiLabAccessCard user={user} isAdmin={isAdmin} /> : null}
          <CapabilitiesCard />
          <MarketContextCard
            data={market.data}
            loading={market.loading}
            error={market.error}
          />
          {news.loading && (
            <div className="rounded-lg border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
              Loading news context for news-summary prompts…
            </div>
          )}
          {news.error && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
              News context unavailable. News-summary prompts may return a safe unknown until
              data loads.
            </div>
          )}
        </aside>
      </div>

      <details className="lg:hidden rounded-xl border border-border bg-card/60 p-3">
        <summary className="text-sm font-medium cursor-pointer">Access & capabilities</summary>
        <div className="mt-3 space-y-4">
          {user ? <AiLabAccessCard user={user} isAdmin={isAdmin} /> : null}
          <CapabilitiesCard />
        </div>
      </details>
    </div>
  );
};

export default AiLabPage;
