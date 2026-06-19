import { useEffect, useRef, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import ScenarioResult from "@/components/ai-lab/ScenarioResult";
import {
  AI_LAB_ASSISTANT_CARD,
  AI_LAB_CARD,
  AI_LAB_CHIP,
  AI_LAB_HEADLINE,
  AI_LAB_HERO_HEADLINE,
  AI_LAB_HERO_SUBTEXT,
  AI_LAB_INPUT,
  AI_LAB_INPUT_FIELD,
  AI_LAB_INPUT_PLACEHOLDER,
  AI_LAB_LABEL,
  AI_LAB_MUTED,
  AI_LAB_RUN_BTN,
  AI_LAB_SAFE_PROMPT_CHIPS,
  AI_LAB_SAFETY_LINE,
  AI_LAB_USER_BUBBLE,
} from "@/components/ai-lab/aiLabTheme";
import { buildFollowUpSuggestions, type AiLabChatMessage } from "@/lib/aiLab/chat";
import type { AssetHistory, LookbackDays } from "@/lib/aiLab/history";
import { LOOKBACK_OPTIONS } from "@/lib/aiLab/history";

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
  <div className={AI_LAB_INPUT}>
    <Search className="h-4 w-4 text-stone-400 shrink-0" />
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
    </button>
  </div>
);

const AiLabChat = ({
  messages,
  onSubmit,
  compareStateByMessageId,
  onLookbackChange,
}: Props) => {
  const [input, setInput] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

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

  return (
    <div className={`flex flex-col min-h-[480px] lg:min-h-[560px] ${AI_LAB_CARD} overflow-hidden`}>
      <div ref={threadRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-6">
        {!hasMessages ? (
          <div className="space-y-6 py-2 md:py-6 max-w-3xl">
            <div className="space-y-3">
              <h2 className={AI_LAB_HEADLINE}>{AI_LAB_HERO_HEADLINE}</h2>
              <p className={AI_LAB_MUTED}>{AI_LAB_HERO_SUBTEXT}</p>
              <p className="text-xs text-stone-500">{AI_LAB_SAFETY_LINE}</p>
            </div>
            <form onSubmit={handleSubmit}>
              <PromptInput
                value={input}
                onChange={setInput}
                onSubmit={() => submitPrompt(input)}
                autoFocus
              />
            </form>
            <div className="flex flex-wrap gap-2">
              {AI_LAB_SAFE_PROMPT_CHIPS.map((chip) => (
                <PromptChip key={chip} label={chip} onClick={() => submitPrompt(chip)} />
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.role === "user") {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className={AI_LAB_USER_BUBBLE}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              );
            }

            const compareState = compareStateByMessageId[msg.id];
            const followUps = buildFollowUpSuggestions(msg.result);

            return (
              <div key={msg.id} className="space-y-3 max-w-full">
                <div className={`${AI_LAB_ASSISTANT_CARD} space-y-2`}>
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">{msg.text}</p>
                  {msg.contextNote && (
                    <p className="text-xs text-stone-600 border-t border-[#D8D0C0]/60 pt-2">
                      {msg.contextNote}
                    </p>
                  )}
                  {msg.status === "clarifying" && (
                    <p className="text-[11px] text-stone-500 italic">{AI_LAB_SAFETY_LINE}</p>
                  )}
                </div>

                {msg.result && msg.result.kind === "compare" && compareState && (
                  <div className="rounded-2xl border border-[#D8D0C0] bg-[#FFFDF7] px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className={AI_LAB_LABEL}>Compare lookback</p>
                      <p className="text-[11px] text-stone-500 mt-1">
                        Used for historical return and trend rows.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {LOOKBACK_OPTIONS.map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => onLookbackChange(msg.id, days)}
                          className={`h-8 px-3 rounded-full text-[11px] font-semibold tabular-nums transition-colors ${
                            compareState.lookbackDays === days
                              ? "bg-[#EAB308] text-slate-950"
                              : "border border-[#D8D0C0] bg-[#FFFDF7] text-stone-700 hover:bg-[#F5EFE2]"
                          }`}
                        >
                          {days}D
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {msg.result && (
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
          })
        )}
      </div>

      {hasMessages && (
        <div className="border-t border-[#D8D0C0] p-3 md:p-4 bg-[#FFFDF7]/95 sticky bottom-0">
          <form onSubmit={handleSubmit}>
            <PromptInput value={input} onChange={setInput} onSubmit={() => submitPrompt(input)} />
          </form>
        </div>
      )}
    </div>
  );
};

export default AiLabChat;
