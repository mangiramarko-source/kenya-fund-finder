import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AiLabChat, { type CompareState } from "./AiLabChat";
import { useMarketContext } from "@/lib/aiLab/marketContext";
import { useNewsContext } from "@/lib/aiLab/newsContext";
import { fetchAssetHistory, type AssetHistory, type LookbackDays } from "@/lib/aiLab/history";
import { createAssistantMessage, createUserMessage, deriveSessionContext, processAiLabUserPrompt, type AiLabChatMessage } from "@/lib/aiLab/chat";
import { canUseGeminiEducationalAssist } from "@/lib/aiLab/geminiEligibility";
import { generateGeminiEducationalAnswer, isGeminiEducationalEnabled } from "@/lib/aiLab/generateGeminiEducationalAnswer";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "ai-lab-messages-v1";
const DEFAULT_LOOKBACK: LookbackDays = 30;

function loadMessages(): AiLabChatMessage[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((m) => m && m.status !== "pending") : [];
  } catch { return []; }
}

export default function DesktopAiLabChat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const market = useMarketContext();
  const news = useNewsContext();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AiLabChatMessage[]>(loadMessages);
  const [lookbacks, setLookbacks] = useState<Record<string, LookbackDays>>({});
  const [history, setHistory] = useState<Record<string, Record<string, AssetHistory> | null>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({});

  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50))); }, [messages]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const compareIds = useMemo(() => messages.filter((m) => m.role === "assistant" && (m.result?.kind === "compare" || (m.result?.kind === "website-lookup" && m.result.historyAsset))).map((m) => m.id), [messages]);
  useEffect(() => {
    const cancelled = new Set<string>();
    compareIds.forEach((id) => {
      const message = messages.find((m) => m.id === id);
      if (!message?.result || (message.result.kind !== "compare" && message.result.kind !== "website-lookup")) return;
      const assets = message.result.kind === "compare" ? message.result.assets : message.result.historyAsset ? [message.result.historyAsset] : [];
      if (!assets.length) return;
      const days = lookbacks[id] ?? (message.result.kind === "website-lookup" ? message.result.requestedLookbackDays : undefined) ?? DEFAULT_LOOKBACK;
      setHistoryLoading((prev) => ({ ...prev, [id]: true }));
      Promise.all(assets.map((asset) => fetchAssetHistory(asset, days))).then((rows) => {
        if (cancelled.has(id)) return;
        const map: Record<string, AssetHistory> = {};
        assets.forEach((asset, index) => { map[asset.symbol] = rows[index]; });
        setHistory((prev) => ({ ...prev, [id]: map }));
      }).finally(() => { if (!cancelled.has(id)) setHistoryLoading((prev) => ({ ...prev, [id]: false })); });
    });
    return () => { compareIds.forEach((id) => cancelled.add(id)); };
  }, [compareIds, messages, lookbacks]);

  const compareStateByMessageId = useMemo<Record<string, CompareState>>(() => Object.fromEntries(compareIds.map((id) => {
    const result = messages.find((m) => m.id === id)?.result;
    return [id, { lookbackDays: lookbacks[id] ?? (result?.kind === "website-lookup" ? result.requestedLookbackDays : undefined) ?? DEFAULT_LOOKBACK, history: history[id] ?? null, historyLoading: historyLoading[id] ?? false }];
  })), [compareIds, messages, lookbacks, history, historyLoading]);

  const submit = useCallback((prompt: string) => {
    const userMessage = createUserMessage(prompt);
    const pending = createAssistantMessage({ text: "", status: "pending" });
    setMessages((prev) => [...prev, userMessage, pending]);
    void (async () => {
      try {
        const output = await processAiLabUserPrompt(prompt, market.data, news.data, { sessionContext: deriveSessionContext(messages), naturalLanguage: true });
        if (!output.clarification && canUseGeminiEducationalAssist({ user, prompt, resultKind: output.result?.kind ?? "unknown", flagEnabled: isGeminiEducationalEnabled() })) {
          const answer = await generateGeminiEducationalAnswer(prompt);
          if (answer.ok && answer.markdown) {
            setMessages((prev) => prev.map((m) => m.id === pending.id ? { ...createAssistantMessage({ text: `${answer.markdown}\n\n<sub>AI-assisted educational explanation</sub>`, status: "answered", followUps: output.followUps, contextNote: output.contextNote }), id: pending.id } : m));
            return;
          }
        }
        setMessages((prev) => prev.map((m) => m.id === pending.id ? { ...createAssistantMessage({ text: output.text, result: output.result?.kind === "refusal" || output.result?.kind === "unknown" ? undefined : output.result, followUps: output.followUps, contextNote: output.contextNote, clarification: output.clarification }), id: pending.id } : m));
      } catch {
        setMessages((prev) => prev.map((m) => m.id === pending.id ? { ...createAssistantMessage({ text: "Something went wrong while generating that scenario. Please try again.", status: "error" }), id: pending.id } : m));
      }
    })();
  }, [market.data, news.data, messages, user]);

  const selectClarification = useCallback((_messageId: string, _entityId: string) => {
    // Clarification actions remain available in the full AI Lab; the popup hands off for advanced flows.
    navigate("/ai-lab");
  }, [navigate]);

  if (!open) return <button type="button" onClick={() => setOpen(true)} aria-label="Open AI Lab chat" className="fixed bottom-5 right-5 z-50 hidden items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/25 transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 md:flex"><Sparkles className="h-4 w-4" aria-hidden="true" />Ask AI Lab</button>;

  return <>
    <div className="fixed inset-0 z-50 hidden bg-black/5 md:block" onClick={() => setOpen(false)} aria-hidden="true" />
    <section role="dialog" aria-modal="false" aria-label="AI Lab chat" className="fixed bottom-5 right-5 z-[51] hidden h-[min(620px,calc(100vh-2.5rem))] w-[min(410px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-[24px] border border-border/80 bg-background shadow-2xl md:flex">
      <header className="flex shrink-0 items-center justify-between border-b border-border/70 bg-card/80 px-4 py-3.5"><div className="flex min-w-0 items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500"><Sparkles className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-bold">AI Lab</p><p className="text-[11px] text-muted-foreground">Ask about Kenyan markets</p></div></div><div className="flex items-center gap-1"><button type="button" onClick={() => navigate("/ai-lab")} aria-label="Open full AI Lab" className="rounded-full p-2 text-muted-foreground hover:bg-muted"><ExternalLink className="h-4 w-4" /></button><button type="button" onClick={() => setOpen(false)} aria-label="Close AI Lab chat" className="rounded-full p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button></div></header>
      <div className="ai-lab-compact min-h-0 flex-1"><AiLabChat messages={messages} onSubmit={submit} compareStateByMessageId={compareStateByMessageId} onLookbackChange={(id, days) => setLookbacks((prev) => ({ ...prev, [id]: days }))} onFeedback={(id, value) => setMessages((prev) => prev.map((m) => m.id === id ? { ...m, feedback: value } : m))} onClarificationSelect={selectClarification} /></div>
    </section>
  </>;
}
