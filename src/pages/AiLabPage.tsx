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
import MarketPageLoader from "@/components/MarketPageLoader";
import { useMinimumLoadingDuration } from "@/hooks/useMinimumLoadingDuration";
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
import {
  generateGeminiEducationalAnswer,
  isGeminiEducationalEnabled,
} from "@/lib/aiLab/generateGeminiEducationalAnswer";
import { canUseGeminiEducationalAssist } from "@/lib/aiLab/geminiEligibility";


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
  const { user, loading } = useAuth();
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

          // Phase-1 Gemini educational assist. Public but flag-gated,
          // educational-only, and only when the deterministic router returned
          // unknown. Deterministic scenario/refusal/comparison/news/website/
          // capabilities/clarifying results are never rewritten. Any failure or
          // validation rejection silently falls back to deterministic text.
          const geminiEligible = canUseGeminiEducationalAssist({
            user,
            prompt,
            resultKind: result.kind,
            flagEnabled: isGeminiEducationalEnabled(),
          });

          if (geminiEligible) {
            const gemini = await generateGeminiEducationalAnswer(prompt);
            if (gemini.ok && gemini.markdown) {
              const labeled = `${gemini.markdown}\n\n<sub>AI-assisted educational explanation</sub>`;
              replacePending(
                createAssistantMessage({
                  text: labeled,
                  status: "answered",
                  followUps,
                  contextNote: note ?? undefined,
                }),
              );
              return;
            }
          }

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

  const showPageLoading = useMinimumLoadingDuration(loading);

  if (showPageLoading) {
    return (
      <MarketPageLoader message="Loading AI Lab…" className={AI_LAB_PAGE} />
    );
  }

  return (
    <div className={AI_LAB_PAGE}>
      <div className={AI_LAB_PAGE_INNER}>
        <header className="flex shrink-0 items-center justify-between gap-2 py-1 md:py-2 border-b border-border/40 pb-2 md:pb-3">
          {/* Unified header (Mobile & Desktop) */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-muted/60 text-foreground hover:bg-muted transition-colors shrink-0"
                aria-label="Back to overview"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>

              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base md:text-lg text-foreground leading-none">AI Lab</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] md:text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      BETA
                    </span>
                  </div>
                  <p className="hidden md:block text-[11px] text-muted-foreground mt-0.5">{AI_LAB_SAFETY_LINE}</p>
                </div>
              </div>
            </div>

            <div className="hidden md:block text-xs text-muted-foreground font-medium">
              Scenarios only — not financial advice.
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
