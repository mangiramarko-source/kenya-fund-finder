import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
const STORAGE_KEY = "ai-lab-messages-v1";

function loadPersistedMessages(): AiLabChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop any leftover pending placeholders from a previous session.
    return parsed.filter(
      (m): m is AiLabChatMessage =>
        m && typeof m === "object" && m.status !== "pending",
    );
  } catch {
    return [];
  }
}

const AiLabPage = () => {
  const { loading } = useAuth();
  const [messages, setMessages] = useState<AiLabChatMessage[]>(loadPersistedMessages);
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
    if (typeof window === "undefined") return;
    try {
      // Cap stored messages to keep localStorage bounded.
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(messages.slice(-50)),
      );
    } catch {
      // Ignore quota / serialization errors.
    }
  }, [messages]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlPosition = html.style.position;
    const prevBodyPosition = body.style.position;
    const prevHtmlHeight = html.style.height;
    const prevBodyHeight = body.style.height;
    const prevHtmlWidth = html.style.width;
    const prevBodyWidth = body.style.width;
    const prevBodyTop = body.style.top;
    const prevBodyLeft = body.style.left;
    const prevBodyRight = body.style.right;
    const prevBodyBottom = body.style.bottom;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    const resetWindowScroll = () => {
      window.scrollTo(0, 0);
      html.scrollTop = 0;
      body.scrollTop = 0;
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.position = "fixed";
    body.style.position = "fixed";
    html.style.height = "100%";
    body.style.height = "100%";
    html.style.width = "100%";
    body.style.width = "100%";
    body.style.top = "0";
    body.style.left = "0";
    body.style.right = "0";
    body.style.bottom = "0";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    resetWindowScroll();

    const scheduleReset = () => requestAnimationFrame(resetWindowScroll);
    window.addEventListener("scroll", scheduleReset, { passive: true });
    window.addEventListener("orientationchange", scheduleReset);
    window.visualViewport?.addEventListener("resize", scheduleReset);
    window.visualViewport?.addEventListener("scroll", scheduleReset);
    return () => {
      window.removeEventListener("scroll", scheduleReset);
      window.removeEventListener("orientationchange", scheduleReset);
      window.visualViewport?.removeEventListener("resize", scheduleReset);
      window.visualViewport?.removeEventListener("scroll", scheduleReset);
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.position = prevHtmlPosition;
      body.style.position = prevBodyPosition;
      html.style.height = prevHtmlHeight;
      body.style.height = prevBodyHeight;
      html.style.width = prevHtmlWidth;
      body.style.width = prevBodyWidth;
      body.style.top = prevBodyTop;
      body.style.left = prevBodyLeft;
      body.style.right = prevBodyRight;
      body.style.bottom = prevBodyBottom;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, []);

  // Note: we intentionally do NOT translate the page by visualViewport.offsetTop.
  // On iOS Safari / Chrome, that value can stay non-zero after the keyboard
  // dismisses, leaving the page shifted and clipping the top back button while
  // pushing the bottom dock out of place. 100dvh handles the viewport correctly
  // on its own across modern mobile browsers.

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

      const pendingMessage = createAssistantMessage({
        text: "",
        status: "pending",
      });
      setMessages((prev) => [...prev, pendingMessage]);

      const replacePending = (next: AiLabChatMessage) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === pendingMessage.id ? { ...next, id: pendingMessage.id } : m)),
        );
      };

      void (async () => {
        try {
          const lookup = await resolveWebsiteLookup(prompt, market.data);
          if (lookup) {
            const { text, followUps } = composeAssistantResponse({
              prompt,
              result: lookup,
              sessionContext,
            });
            replacePending(
              createAssistantMessage({ text, result: lookup, followUps }),
            );
            return;
          }

          const { prompt: enriched, note } = applyLiveContext(prompt, market.data);
          const result = routePrompt(enriched, market.data, news.data);
          const { text, followUps } = composeAssistantResponse({
            prompt,
            result,
            sessionContext,
          });
          replacePending(
            createAssistantMessage({
              text,
              result:
                result.kind === "refusal" || result.kind === "unknown" ? undefined : result,
              followUps,
              contextNote: note ?? undefined,
            }),
          );
        } catch (err) {
          console.error("[AiLab] handleSubmit failed", err);
          replacePending(
            createAssistantMessage({
              text:
                "Something went wrong while generating that scenario. Please try again, or try one of the examples below.",
              status: "error",
              followUps: ["KES 10,000 in SCOM", "Model KES 100k in an MMF at 11%", "What can I ask?"],
            }),
          );
        }
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
