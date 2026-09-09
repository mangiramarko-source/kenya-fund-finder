import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import AiLabChat, { type CompareState } from "@/components/ai-lab/AiLabChat";
import {
  AI_LAB_LABEL,
  AI_LAB_PAGE,
  AI_LAB_PAGE_INNER,
  AI_LAB_SAFETY_LINE,
} from "@/components/ai-lab/aiLabTheme";
import { useMarketContext } from "@/lib/aiLab/marketContext";
import { useNewsContext } from "@/lib/aiLab/newsContext";
import MarketPageLoader from "@/components/MarketPageLoader";
import { useMinimumLoadingDuration } from "@/hooks/useMinimumLoadingDuration";
import {
  fetchAssetHistory,
  type AssetHistory,
  type LookbackDays,
} from "@/lib/aiLab/history";
import {
  createAssistantMessage,
  createUserMessage,
  deriveSessionContext,
  processAiLabClarificationSelection,
  processAiLabUserPrompt,
  type AiLabChatMessage,
} from "@/lib/aiLab/chat";
import {
  generateGeminiEducationalAnswer,
  isGeminiEducationalEnabled,
} from "@/lib/aiLab/generateGeminiEducationalAnswer";
import { canUseGeminiEducationalAssist } from "@/lib/aiLab/geminiEligibility";
import { trackEvent } from "@/lib/analytics";
import { useAiLabConversationStorage } from "@/hooks/useAiLabConversationStorage";


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
  const { user, loading } = useAuth();
  const { messages, setMessages, clearMessages } = useAiLabConversationStorage();
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

    // Drive the AI Lab height from visualViewport instead of translating the
    // dock. On iOS Safari/Chrome, a translated/fixed dock can remain floating
    // after the keyboard closes; resizing the flex shell lets the bottom bar
    // naturally sit above the keyboard and return to its original position.
    const updateViewportHeight = () => {
      const vv = window.visualViewport;
      const height = vv?.height ?? window.innerHeight;
      html.style.setProperty("--ai-lab-vvh", `${Math.round(height)}px`);
    };
    const scheduleReset = () => {
      requestAnimationFrame(() => {
        updateViewportHeight();
        resetWindowScroll();
      });
    };
    updateViewportHeight();
    window.addEventListener("scroll", scheduleReset, { passive: true });
    window.addEventListener("resize", scheduleReset, { passive: true });
    window.addEventListener("focusin", scheduleReset);
    window.addEventListener("focusout", scheduleReset);
    window.addEventListener("orientationchange", scheduleReset);
    window.visualViewport?.addEventListener("resize", scheduleReset);
    window.visualViewport?.addEventListener("scroll", scheduleReset);
    return () => {
      window.removeEventListener("scroll", scheduleReset);
      window.removeEventListener("resize", scheduleReset);
      window.removeEventListener("focusin", scheduleReset);
      window.removeEventListener("focusout", scheduleReset);
      window.removeEventListener("orientationchange", scheduleReset);
      window.visualViewport?.removeEventListener("resize", scheduleReset);
      window.visualViewport?.removeEventListener("scroll", scheduleReset);
      html.style.removeProperty("--ai-lab-vvh");
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

  // Note: we intentionally do NOT translate the page or the dock by keyboard
  // height. iOS Safari/Chrome can leave translated/fixed elements floating
  // after the keyboard closes. Instead, the locked page height follows the
  // visual viewport, so the header stays pinned and the dock naturally returns.

  const compareMessageIds = useMemo(
    () =>
      messages
        .filter((m) =>
          m.role === "assistant" &&
          (m.result?.kind === "compare" ||
            (m.result?.kind === "website-lookup" && Boolean(m.result.historyAsset))),
        )
        .map((m) => m.id),
    [messages],
  );

  useEffect(() => {
    const cancelled = new Map<string, boolean>();

    for (const messageId of compareMessageIds) {
      cancelled.set(messageId, false);
      const msg = messages.find((m) => m.id === messageId);
      if (!msg?.result || (msg.result.kind !== "compare" && msg.result.kind !== "website-lookup")) continue;

      const assets = msg.result.kind === "compare"
        ? msg.result.assets
        : msg.result.historyAsset ? [msg.result.historyAsset] : [];
      if (!assets.length) continue;
      const requestedDays = msg.result.kind === "website-lookup"
        ? msg.result.requestedLookbackDays
        : undefined;
      const lookbackDays = compareLookback[messageId] ?? requestedDays ?? DEFAULT_LOOKBACK;

      setCompareHistoryLoading((prev) => ({ ...prev, [messageId]: true }));
      Promise.all(assets.map((a) => fetchAssetHistory(a, lookbackDays)))
        .then((rows) => {
          if (cancelled.get(messageId)) return;
          const map: Record<string, AssetHistory> = {};
          assets.forEach((a, i) => {
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
      const result = messages.find((message) => message.id === messageId)?.result;
      const requestedDays = result?.kind === "website-lookup" ? result.requestedLookbackDays : undefined;
      state[messageId] = {
        lookbackDays: compareLookback[messageId] ?? requestedDays ?? DEFAULT_LOOKBACK,
        history: compareHistory[messageId] ?? null,
        historyLoading: compareHistoryLoading[messageId] ?? false,
      };
    }
    return state;
  }, [compareMessageIds, compareLookback, compareHistory, compareHistoryLoading, messages]);

  useDocumentTitle(
    "AI Scenario Assistant – KenyaFundFinder",
    "Ask data questions about funds, stocks, and outcomes. Scenarios from available data — not personal financial advice."
  );

  const handleLookbackChange = useCallback((messageId: string, days: LookbackDays) => {
    setCompareLookback((prev) => ({ ...prev, [messageId]: days }));
  }, []);

  const handleFeedback = useCallback((messageId: string, value: "helpful" | "not-helpful") => {
    setMessages((prev) => prev.map((message) =>
      message.id === messageId ? { ...message, feedback: value } : message,
    ));
    trackEvent("ai_lab_answer_feedback", { rating: value });
  }, []);

  const handleSubmit = useCallback(
    (prompt: string) => {
      const userMessage = createUserMessage(prompt);
      setMessages((prev) => [...prev, userMessage]);

      const sessionContext = deriveSessionContext(messages);

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
          const output = await processAiLabUserPrompt(prompt, market.data, news.data, {
            sessionContext,
            naturalLanguage: true,
          });
          const result = output.result;
          trackEvent("ai_lab_route_completed", {
            route: output.route,
            result_kind: result?.kind ?? "none",
          });

          // Phase-1 Gemini educational assist. Public but flag-gated,
          // educational-only, and only when the deterministic router returned
          // unknown. Deterministic scenario/refusal/comparison/news/website/
          // capabilities/clarifying results are never rewritten. Any failure or
          // validation rejection silently falls back to deterministic text.
          const geminiEligible = canUseGeminiEducationalAssist({
            user,
            prompt,
            resultKind: result?.kind ?? "unknown",
            flagEnabled: isGeminiEducationalEnabled(),
          });

          if (!output.clarification && geminiEligible) {
            const gemini = await generateGeminiEducationalAnswer(prompt);
            if (gemini.ok && gemini.markdown) {
              const labeled = `${gemini.markdown}\n\n<sub>AI-assisted educational explanation</sub>`;
              replacePending(
                createAssistantMessage({
                  text: labeled,
                  status: "answered",
                  followUps: output.followUps,
                  contextNote: output.contextNote,
                }),
              );
              return;
            }
          }

          replacePending(
            createAssistantMessage({
              text: output.text,
              result:
                result?.kind === "refusal" || result?.kind === "unknown" ? undefined : result,
              followUps: output.followUps,
              contextNote: output.contextNote,
              clarification: output.clarification,
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
    [messages, market.data, news.data, user],
  );

  const handleClarificationSelect = useCallback((messageId: string, entityId: string) => {
    const sourceMessage = messages.find((message) => message.id === messageId);
    const clarification = sourceMessage?.clarification;
    const choice = clarification?.choices.find((candidate) => candidate.id === entityId);
    if (!clarification || !choice) return;

    const userMessage = createUserMessage(choice.label);
    const pendingMessage = createAssistantMessage({ text: "", status: "pending" });
    setMessages((prev) => [
      ...prev.map((message) => message.id === messageId ? { ...message, clarification: undefined } : message),
      userMessage,
      pendingMessage,
    ]);

    void (async () => {
      try {
        const output = await processAiLabClarificationSelection(
          clarification,
          entityId,
          market.data,
          news.data,
          deriveSessionContext(messages),
        );
        const result = output.result;
        setMessages((prev) => prev.map((message) => message.id === pendingMessage.id
          ? {
              ...createAssistantMessage({
                text: output.text,
                result: result?.kind === "refusal" || result?.kind === "unknown" ? undefined : result,
                followUps: output.followUps,
                contextNote: output.contextNote,
                clarification: output.clarification,
              }),
              id: pendingMessage.id,
            }
          : message));
        trackEvent("ai_lab_clarification_selected", {
          entity_kind: choice.kind,
          entity_subtype: choice.subtype ?? "none",
        });
      } catch (error) {
        console.error("[AiLab] clarification selection failed", error);
        setMessages((prev) => prev.map((message) => message.id === pendingMessage.id
          ? {
              ...createAssistantMessage({
                text: "I couldn't continue that comparison. Please enter the full product name and try again.",
                status: "error",
              }),
              id: pendingMessage.id,
            }
          : message));
      }
    })();
  }, [messages, market.data, news.data]);

  const showPageLoading = useMinimumLoadingDuration(loading);

  if (showPageLoading) {
    return (
      <MarketPageLoader message="Loading AI Lab…" className={AI_LAB_PAGE} />
    );
  }

  return (
    <div className={AI_LAB_PAGE}>
      <aside className="pointer-events-none fixed left-3 top-24 z-30 hidden space-y-2 lg:block" aria-label="AI Lab information">
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/90 p-2 shadow-sm backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold leading-none text-foreground">AI Lab</span>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-600">BETA</span>
            </div>
            <p className="mt-0.5 max-w-[150px] text-[9px] leading-snug text-muted-foreground">{AI_LAB_SAFETY_LINE}</p>
          </div>
        </div>
        <button type="button" onClick={clearMessages} disabled={messages.length === 0} aria-label="Clear AI Lab conversation" className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/90 px-2.5 py-2 text-[10px] font-semibold text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Clear conversation</button>
      </aside>
      <div className={AI_LAB_PAGE_INNER}>
        <header className="relative flex shrink-0 items-center justify-between gap-2 border-b border-border/40 py-1 pb-2 md:hidden md:py-2 md:pb-3">
          <div className="flex w-full items-center justify-between">
              <Link
                to="/"
                className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-full bg-muted/60 text-foreground hover:bg-muted transition-colors shrink-0"
                aria-label="Back to overview"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>

              <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap">
                <span className="text-base font-bold leading-none text-foreground">AI Lab</span>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                  BETA
                </span>
              </div>

              <button type="button" onClick={clearMessages} disabled={messages.length === 0} aria-label="Clear AI Lab conversation" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Clear</button>
          </div>
        </header>

        <main className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <AiLabChat
            messages={messages}
            onSubmit={handleSubmit}
            compareStateByMessageId={compareStateByMessageId}
            onLookbackChange={handleLookbackChange}
            onFeedback={handleFeedback}
            onClarificationSelect={handleClarificationSelect}
          />
        </main>
      </div>
    </div>
  );
};

export default AiLabPage;
