import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Search } from "lucide-react";
import ScenarioResult from "@/components/ai-lab/ScenarioResult";
import {
  AI_LAB_ACTIVE_SHELL,
  AI_LAB_ASSISTANT_TEXT,
  AI_LAB_CHIP,
  AI_LAB_COLLAPSIBLE,
  AI_LAB_COMPARE_ACTIVE,
  AI_LAB_COMPARE_INACTIVE,
  AI_LAB_EMPTY_SHELL,
  AI_LAB_HEADLINE,
  AI_LAB_HERO_HEADLINE,
  AI_LAB_HERO_SUBTEXT,
  AI_LAB_HERO_SUBTEXT_CLASS,
  AI_LAB_INPUT_DOCK,
  AI_LAB_INPUT_WRAP,
  AI_LAB_INPUT_FIELD,
  AI_LAB_INPUT_PLACEHOLDER,
  AI_LAB_MOBILE_DISCLAIMER,
  AI_LAB_RUN_BTN,
  AI_LAB_SAFE_PROMPT_CHIPS,
  AI_LAB_SAFETY_LINE,
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
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  autoFocus?: boolean;
}) => (
  <div className={AI_LAB_INPUT_WRAP}>
    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={AI_LAB_INPUT_PLACEHOLDER}
      className={AI_LAB_INPUT_FIELD}
      autoFocus={autoFocus}
    />
    <button type="button" onClick={onSubmit} disabled={!value.trim()} className={AI_LAB_RUN_BTN}>
      Run
      <ArrowRight className="h-4 w-4" />
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
      // Scroll within the chat container only — never the window.
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
    onSubmit(trimmed);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitPrompt(input);
  };

  const hasMessages = messages.length > 0;
  const shellClass = hasMessages ? AI_LAB_ACTIVE_SHELL : AI_LAB_EMPTY_SHELL;

  return (
    <div className={`${shellClass} h-full min-h-0 overflow-hidden`}>
      <div ref={threadRef} className={AI_LAB_THREAD}>
        {!hasMessages ? (
          <div className="max-w-2xl mx-auto space-y-10 pt-6 md:pt-12 pb-6">
            <div className="space-y-4">
              <h2 className={AI_LAB_HEADLINE}>{AI_LAB_HERO_HEADLINE}</h2>
              <p className={AI_LAB_HERO_SUBTEXT_CLASS}>{AI_LAB_HERO_SUBTEXT}</p>
            </div>
            <form onSubmit={handleSubmit}>
              <PromptInput
                value={input}
                onChange={setInput}
                onSubmit={() => submitPrompt(input)}
                autoFocus
              />
            </form>
            <div className="flex flex-wrap gap-2 justify-start">
              {AI_LAB_SAFE_PROMPT_CHIPS.map((chip) => (
                <PromptChip key={chip} label={chip} onClick={() => submitPrompt(chip)} />
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl w-full mx-auto space-y-5">
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

              return (
                <div key={msg.id} ref={setTurnRef(msg.id)} className="scroll-mt-4 space-y-3">
                  <div>
                    <p className={AI_LAB_ASSISTANT_TEXT}>{msg.text}</p>
                    {msg.contextNote && (
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
                    <div className="flex flex-wrap gap-2">
                      {followUps.map((s) => (
                        <PromptChip key={s} label={s} onClick={() => submitPrompt(s)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <p className={AI_LAB_MOBILE_DISCLAIMER}>{AI_LAB_SAFETY_LINE}</p>
          </div>
        )}
      </div>

      {hasMessages && (
        <div className={AI_LAB_INPUT_DOCK}>
          <form onSubmit={handleSubmit}>
            <PromptInput value={input} onChange={setInput} onSubmit={() => submitPrompt(input)} />
          </form>
        </div>
      )}
    </div>
  );
};

export default AiLabChat;
