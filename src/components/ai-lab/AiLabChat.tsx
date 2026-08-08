import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUp, Plus, Search, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "@/lib/remarkGfmSafe";
import ScenarioResult from "@/components/ai-lab/ScenarioResult";
import {
  AI_LAB_ASSISTANT_TEXT,
  AI_LAB_CHAT_SHELL,
  AI_LAB_CHIP,
  AI_LAB_COLLAPSIBLE,
  AI_LAB_COMPARE_ACTIVE,
  AI_LAB_COMPARE_INACTIVE,
  AI_LAB_HEADLINE,
  AI_LAB_HERO_HEADLINE,
  AI_LAB_HERO_SUBTEXT,
  AI_LAB_HERO_SUBTEXT_CLASS,
  AI_LAB_INPUT_DOCK,
  AI_LAB_INPUT_WRAP,
  AI_LAB_INPUT_FIELD,
  AI_LAB_INPUT_PLACEHOLDER,
  AI_LAB_DOCK_DISCLAIMER,
  AI_LAB_DOCK_DISCLAIMER_TEXT,
  AI_LAB_DOCK_INNER,
  AI_LAB_RUN_BTN,
  AI_LAB_SAFE_PROMPT_CHIPS,
  AI_LAB_THREAD,
  AI_LAB_USER_BUBBLE,
} from "@/components/ai-lab/aiLabTheme";
import type { AiLabChatMessage } from "@/lib/aiLab/chat";
import type { AssetHistory, LookbackDays } from "@/lib/aiLab/history";
import { LOOKBACK_OPTIONS } from "@/lib/aiLab/history";
import { capFollowUps } from "@/lib/aiLab/responseComposer";

export interface CompareState {
  lookbackDays: LookbackDays;
  history: Record<string, AssetHistory> | null;
  historyLoading: boolean;
}

interface Props {
  messages: AiLabChatMessage[];
  onSubmit: (prompt: string) => void;
  compareStateByMessageId: Record<string, CompareState>;
  onLookbackChange: (messageId: string, days: LookbackDays) => void;
}

const PromptChip = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button type="button" onClick={onClick} className={AI_LAB_CHIP}>
    {label}
  </button>
);

const PromptInput = ({
  value,
  onChange,
  onSubmit,
  autoFocus = false,
  onInputFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  autoFocus?: boolean;
  onInputFocus?: (input: HTMLInputElement) => void;
}) => (
  <div className={AI_LAB_INPUT_WRAP}>
    <button
      type="button"
      className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0 hover:bg-muted transition-colors"
      aria-label="Action options"
    >
      <Plus className="h-4 w-4 text-muted-foreground" />
    </button>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={AI_LAB_INPUT_PLACEHOLDER}
      className={AI_LAB_INPUT_FIELD}
      autoFocus={autoFocus}
      onFocus={(e) => onInputFocus?.(e.currentTarget)}
    />
    <button type="button" onClick={onSubmit} disabled={!value.trim()} className={AI_LAB_RUN_BTN} aria-label="Send prompt">
      <ArrowUp className="h-4 w-4" />
    </button>
  </div>
);

const shouldShowResultCard = (msg: AiLabChatMessage): boolean => {
  if (!msg.result) return false;
  if (msg.result.kind === "refusal" || msg.result.kind === "unknown") return false;
  return true;
};

const AiLabChat = ({
  messages,
  onSubmit,
  compareStateByMessageId,
  onLookbackChange,
}: Props) => {
  const [input, setInput] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const turnRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const setTurnRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) turnRefs.current.set(id, el);
    else turnRefs.current.delete(id);
  }, []);

  const scrollInputIntoThread = useCallback((inputEl: HTMLInputElement) => {
    const thread = threadRef.current;
    if (!thread) return;
    if (!thread.contains(inputEl)) return;
    const inputRect = inputEl.getBoundingClientRect();
    const threadRect = thread.getBoundingClientRect();
    if (inputRect.bottom > threadRect.bottom || inputRect.top < threadRect.top) {
      inputEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;

    const last = messages[messages.length - 1];
    let anchorId = last.id;

    if (last.role === "assistant" && messages.length >= 2) {
      const prev = messages[messages.length - 2];
      if (prev.role === "user") anchorId = prev.id;
    }

    const scrollToTurn = () => {
      const container = threadRef.current;
      const target = turnRefs.current.get(anchorId);
      if (!container || !target) return;
      const top = target.offsetTop - container.offsetTop - 8;
      container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    };

    scrollToTurn();
    requestAnimationFrame(scrollToTurn);
  }, [messages]);

  const submitPrompt = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput("");
    if (typeof document !== "undefined") {
      const active = document.activeElement as HTMLElement | null;
      if (active && typeof active.blur === "function") active.blur();
    }
    onSubmit(trimmed);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitPrompt(input);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className={AI_LAB_CHAT_SHELL}>
      <div ref={threadRef} className={AI_LAB_THREAD}>
        {!hasMessages ? (
          <div className="max-w-2xl mx-auto space-y-8 pt-4 md:pt-12 pb-6">
            <div className="space-y-3">
              <h2 className={AI_LAB_HEADLINE}>{AI_LAB_HERO_HEADLINE}</h2>
              <p className={AI_LAB_HERO_SUBTEXT_CLASS}>{AI_LAB_HERO_SUBTEXT}</p>
            </div>
            <form onSubmit={handleSubmit}>
              <PromptInput
                value={input}
                onChange={setInput}
                onSubmit={() => submitPrompt(input)}
                autoFocus
                onInputFocus={scrollInputIntoThread}
              />
            </form>
            <div className="flex flex-wrap gap-2 justify-start">
              {AI_LAB_SAFE_PROMPT_CHIPS.map((chip) => (
                <PromptChip key={chip} label={chip} onClick={() => submitPrompt(chip)} />
              ))}
            </div>
            <p className={AI_LAB_DOCK_DISCLAIMER}>{AI_LAB_DOCK_DISCLAIMER_TEXT}</p>
          </div>
        ) : (
          <div className="max-w-3xl w-full mx-auto space-y-6">
            {messages.map((msg) => {
              if (msg.role === "user") {
                return (
                  <div key={msg.id} ref={setTurnRef(msg.id)} className="scroll-mt-4">
                    <div className="flex justify-end">
                      <div className={AI_LAB_USER_BUBBLE}>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  </div>
                );
              }

              const compareState = compareStateByMessageId[msg.id];
              const followUps = capFollowUps(msg.followUps ?? []);
              const showResult = shouldShowResultCard(msg);
              const isPending = msg.status === "pending";

              return (
                <div key={msg.id} ref={setTurnRef(msg.id)} className="scroll-mt-4 space-y-3">
                  <div>
                    {isPending ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="inline-flex gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                        </span>
                        <span className="italic">Thinking…</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs tracking-wider">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>AI SCENARIO</span>
                        </div>
                        <div className="text-sm md:text-[15px] text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1.5 prose-strong:text-foreground prose-strong:font-bold prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-muted prose-code:text-foreground prose-code:before:hidden prose-code:after:hidden prose-a:text-accent">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                    {msg.contextNote && !isPending && (
                      <p className="text-xs text-muted-foreground mt-2">{msg.contextNote}</p>
                    )}
                  </div>

                  {showResult && msg.result && msg.result.kind === "compare" && compareState && (
                    <details className={AI_LAB_COLLAPSIBLE}>
                      <summary className="cursor-pointer font-medium text-foreground">
                        Compare lookback ({compareState.lookbackDays}D)
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {LOOKBACK_OPTIONS.map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => onLookbackChange(msg.id, days)}
                            className={`h-7 px-2.5 rounded-full text-[11px] font-semibold tabular-nums transition-colors ${
                              compareState.lookbackDays === days
                                ? AI_LAB_COMPARE_ACTIVE
                                : AI_LAB_COMPARE_INACTIVE
                            }`}
                          >
                            {days}D
                          </button>
                        ))}
                      </div>
                    </details>
                  )}

                  {showResult && msg.result && (
                    <ScenarioResult
                      result={msg.result}
                      history={compareState?.history}
                      historyLoading={compareState?.historyLoading}
                      lookbackDays={compareState?.lookbackDays}
                    />
                  )}

                  {followUps.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {followUps.map((s) => (
                        <PromptChip key={s} label={s} onClick={() => submitPrompt(s)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {hasMessages && (
        <div className={AI_LAB_INPUT_DOCK}>
          <div className={AI_LAB_DOCK_INNER}>
            {/* Horizontal suggestion chips scroll above composer on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-0.5 max-w-full">
              {AI_LAB_SAFE_PROMPT_CHIPS.map((chip) => (
                <PromptChip key={chip} label={chip} onClick={() => submitPrompt(chip)} />
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <PromptInput
                value={input}
                onChange={setInput}
                onSubmit={() => submitPrompt(input)}
                onInputFocus={scrollInputIntoThread}
              />
            </form>
            <p className={`${AI_LAB_DOCK_DISCLAIMER} mt-1.5`}>{AI_LAB_DOCK_DISCLAIMER_TEXT}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiLabChat;
