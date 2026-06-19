import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Info, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import CapabilitiesCard from "@/components/ai-lab/CapabilitiesCard";
import MarketContextCard from "@/components/ai-lab/MarketContextCard";
import AiLabChat, { type CompareState } from "@/components/ai-lab/AiLabChat";
import {
  AI_LAB_LABEL,
  AI_LAB_PAGE,
  AI_LAB_PAGE_INNER,
  AI_LAB_RAIL_CARD,
  AI_LAB_SAFETY_LINE,
} from "@/components/ai-lab/aiLabTheme";
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
import { resolveWebsiteLookup } from "@/lib/aiLab/websiteLookup";

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

      void (async () => {
        const lookup = await resolveWebsiteLookup(prompt, market.data);
        if (lookup) {
          const assistantMessage = createAssistantMessage({
            text: lookup.summary,
            result: lookup,
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
      })();
    },
    [messages, market.data, news.data],
  );

  if (loading) {
    return (
      <div className={`${AI_LAB_PAGE} flex items-center justify-center`}>
        <p className="text-stone-600">Loading…</p>
      </div>
    );
  }

  const access = resolveAiLabAccess({ user, isAdmin });

  if (!access.allowed) {
    if (access.reason === "logged-out") {
      return <Navigate to={access.loginPath} replace />;
    }
    return (
      <div className={`${AI_LAB_PAGE} container py-20 text-center`}>
        <h1 className="text-2xl font-bold mb-2 text-slate-950">Access Denied</h1>
        <p className="text-stone-600">{getAiLabAccessDeniedMessage(access.reason)}</p>
      </div>
    );
  }

  return (
    <div className={AI_LAB_PAGE}>
      <div className={`${AI_LAB_PAGE_INNER} space-y-6`}>
        <header className="flex items-center gap-2">
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-[#EAB308] text-slate-950">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className={AI_LAB_LABEL}>AI Scenario Assistant</p>
            <p className="text-xs text-stone-500">{AI_LAB_SAFETY_LINE}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
          <AiLabChat
            messages={messages}
            onSubmit={handleSubmit}
            compareStateByMessageId={compareStateByMessageId}
            onLookbackChange={handleLookbackChange}
          />

          <aside className="hidden lg:block space-y-3">
            <div className={`${AI_LAB_RAIL_CARD} space-y-2`}>
              <p className={AI_LAB_LABEL}>Preview status</p>
              <p className="text-xs font-medium text-slate-900">{AI_LAB_BETA_BADGE}</p>
              <p className="text-[11px] text-stone-600 leading-relaxed">{AI_LAB_BETA_NOTE}</p>
            </div>
            {user ? <AiLabAccessCard user={user} isAdmin={isAdmin} /> : null}
            <CapabilitiesCard />
            <MarketContextCard
              data={market.data}
              loading={market.loading}
              error={market.error}
            />
            {news.loading && (
              <div className={`${AI_LAB_RAIL_CARD} text-xs text-stone-600`}>
                Loading news context for news-summary prompts…
              </div>
            )}
            {news.error && (
              <div className={`${AI_LAB_RAIL_CARD} text-xs text-stone-600 border-amber-400/40`}>
                News context unavailable. News-summary prompts may return a safe unknown until
                data loads.
              </div>
            )}
            <div className={`${AI_LAB_RAIL_CARD} flex items-start gap-2`}>
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-stone-700 leading-relaxed">{MAIN_DISCLAIMER}</p>
            </div>
          </aside>
        </div>

        <details className="lg:hidden rounded-2xl border border-[#D8D0C0] bg-[#FFFDF7] p-3">
          <summary className="text-sm font-medium cursor-pointer text-slate-900">
            Access, capabilities & data status
          </summary>
          <div className="mt-3 space-y-3">
            <div className={`${AI_LAB_RAIL_CARD} space-y-2`}>
              <p className={AI_LAB_LABEL}>Preview status</p>
              <p className="text-xs font-medium text-slate-900">{AI_LAB_BETA_BADGE}</p>
              <p className="text-[11px] text-stone-600 leading-relaxed">{AI_LAB_BETA_NOTE}</p>
            </div>
            {user ? <AiLabAccessCard user={user} isAdmin={isAdmin} /> : null}
            <CapabilitiesCard />
            <MarketContextCard data={market.data} loading={market.loading} error={market.error} />
          </div>
        </details>
      </div>
    </div>
  );
};

export default AiLabPage;
