import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import AiLabChat, { type CompareState } from "@/components/ai-lab/AiLabChat";
import {
  AI_LAB_LABEL,
  AI_LAB_PAGE,
  AI_LAB_PAGE_INNER,
  AI_LAB_SAFETY_LINE,
} from "@/components/ai-lab/aiLabTheme";
import { routePrompt } from "@/lib/aiLab/router";
import { applyLiveContext, useMarketContext } from "@/lib/aiLab/marketContext";
import { useNewsContext } from "@/lib/aiLab/newsContext";
import {
  getAiLabAccessDeniedMessage,
  resolveAiLabAccess,
} from "@/lib/aiLab/accessGate";
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
  type AiLabChatMessage,
} from "@/lib/aiLab/chat";
import { resolveWebsiteLookup } from "@/lib/aiLab/websiteLookup";
import {
  composeAssistantResponse,
  composeCapabilitiesGuide,
  composeFilterUnsupportedResponse,
  isCapabilitiesPrompt,
} from "@/lib/aiLab/responseComposer";
import { isUnsupportedFilterLookupPrompt } from "@/lib/aiLab/websiteLookup";


function AiLabMobileBack() {
  return (
    <Link
      to="/"
      className="md:hidden inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0 mr-1"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Overview
    </Link>
  );
}

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

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  // Keep AI Lab shell aligned with the visible viewport when the mobile keyboard opens.
  useEffect(() => {
    const root = document.documentElement;
    const syncVisualViewport = () => {
      const vv = window.visualViewport;
      if (!vv) {
        root.style.removeProperty("--ai-lab-vvh");
        root.style.removeProperty("--ai-lab-vv-top");
        return;
      }
      root.style.setProperty("--ai-lab-vvh", `${vv.height}px`);
      root.style.setProperty("--ai-lab-vv-top", `${vv.offsetTop}px`);
    };

    syncVisualViewport();
    window.visualViewport?.addEventListener("resize", syncVisualViewport);
    window.visualViewport?.addEventListener("scroll", syncVisualViewport);
    return () => {
      window.visualViewport?.removeEventListener("resize", syncVisualViewport);
      window.visualViewport?.removeEventListener("scroll", syncVisualViewport);
      root.style.removeProperty("--ai-lab-vvh");
      root.style.removeProperty("--ai-lab-vv-top");
    };
  }, []);

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

      if (isCapabilitiesPrompt(prompt)) {
        const { text, followUps } = composeCapabilitiesGuide();
        const assistantMessage = createAssistantMessage({
          text,
          status: "answered",
          followUps,
        });
        setMessages((prev) => [...prev, assistantMessage]);
        return;
      }

      if (isUnsupportedFilterLookupPrompt(prompt)) {
        const { text, followUps } = composeFilterUnsupportedResponse();
        const assistantMessage = createAssistantMessage({
          text,
          status: "answered",
          followUps,
        });
        setMessages((prev) => [...prev, assistantMessage]);
        return;
      }

      const clarifying = buildClarifyingResponse(prompt, sessionContext);

      if (clarifying) {
        const assistantMessage = createAssistantMessage({
          text: clarifying.text,
          status: "clarifying",
          followUps: clarifying.followUps,
        });
        setMessages((prev) => [...prev, assistantMessage]);
        return;
      }

      void (async () => {
        const lookup = await resolveWebsiteLookup(prompt, market.data);
        if (lookup) {
          const { text, followUps } = composeAssistantResponse({
            prompt,
            result: lookup,
            sessionContext,
          });
          const assistantMessage = createAssistantMessage({
            text,
            result: lookup,
            followUps,
          });
          setMessages((prev) => [...prev, assistantMessage]);
          return;
        }

        const { prompt: enriched, note } = applyLiveContext(prompt, market.data);
        const result = routePrompt(enriched, market.data, news.data);
        const { text, followUps } = composeAssistantResponse({
          prompt,
          result,
          sessionContext,
        });
        const assistantMessage = createAssistantMessage({
          text,
          result: result.kind === "refusal" || result.kind === "unknown" ? undefined : result,
          followUps,
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
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const access = resolveAiLabAccess({ user, isAdmin });

  if (!access.allowed) {
    if (access.reason === "logged-out") {
      return <Navigate to={access.loginPath} replace />;
    }
    return (
      <div className={`${AI_LAB_PAGE} container py-6 md:py-20`}>
        <div className="mb-6">
          <AiLabMobileBack />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2 text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">{getAiLabAccessDeniedMessage(access.reason)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={AI_LAB_PAGE}>
      <div className={AI_LAB_PAGE_INNER}>
        <header className="flex shrink-0 items-center gap-2">
          <AiLabMobileBack />
          <div className="hidden md:flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center h-9 w-9 rounded-full bg-accent text-accent-foreground shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className={AI_LAB_LABEL}>AI Scenario Assistant</p>
              <p className="text-[10px] text-muted-foreground">{AI_LAB_SAFETY_LINE}</p>
            </div>
          </div>
        </header>

        <main className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <AiLabChat
            messages={messages}
            onSubmit={handleSubmit}
            compareStateByMessageId={compareStateByMessageId}
            onLookbackChange={handleLookbackChange}
          />
        </main>
      </div>
    </div>
  );
};

export default AiLabPage;
