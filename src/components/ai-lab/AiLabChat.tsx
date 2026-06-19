import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ScenarioResult from "@/components/ai-lab/ScenarioResult";
import {
  WELCOME_EXAMPLE_CATEGORIES,
  buildFollowUpSuggestions,
  type AiLabChatMessage,
} from "@/lib/aiLab/chat";
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

const PromptChip = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="text-[12px] px-2.5 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-left"
  >
    {label}
  </button>
);

const AiLabChat = ({
  messages,
  onSubmit,
  compareStateByMessageId,
  onLookbackChange,
}: Props) => {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    onSubmit(trimmed);
  };

  const runChip = (text: string) => {
    onSubmit(text);
  };

  return (
    <div className="flex flex-col min-h-[420px] lg:min-h-[520px] rounded-xl border border-border bg-card overflow-hidden">
      <div ref={threadRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2 max-w-lg mx-auto">
              <h2 className="text-lg font-semibold font-heading">
                Ask a financial scenario question
              </h2>
              <p className="text-sm text-muted-foreground">
                AI Lab uses available KenyaFundFinder data and stated assumptions. It does not
                give personal financial advice.
              </p>
            </div>
            <div className="space-y-3 max-w-xl mx-auto">
              {WELCOME_EXAMPLE_CATEGORIES.map(({ label, prompt }) => (
                <div key={label} className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    {label}
                  </p>
                  <PromptChip label={prompt} onClick={() => runChip(prompt)} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.role === "user") {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl bg-accent/15 border border-accent/25 px-3 py-2">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              );
            }

            const compareState = compareStateByMessageId[msg.id];
            const followUps = buildFollowUpSuggestions(msg.result);

            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-full w-full space-y-2">
                  <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 space-y-2">
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{msg.text}</p>
                    {msg.contextNote && (
                      <p className="text-xs text-accent border-t border-border/40 pt-2">
                        {msg.contextNote}
                      </p>
                    )}
                    {msg.status === "clarifying" && (
                      <p className="text-[11px] text-muted-foreground italic">
                        Data only. Not personal financial advice.
                      </p>
                    )}
                  </div>

                  {msg.result && msg.result.kind === "compare" && compareState && (
                    <div className="rounded-xl border border-border bg-card/60 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-foreground">Compare lookback</p>
                        <p className="text-[11px] text-muted-foreground">
                          Used for historical return and trend rows.
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        {LOOKBACK_OPTIONS.map((days) => (
                          <Button
                            key={days}
                            type="button"
                            size="sm"
                            variant={
                              compareState.lookbackDays === days ? "default" : "outline"
                            }
                            className="h-7 px-2.5 text-[11px] font-semibold tabular-nums"
                            onClick={() => onLookbackChange(msg.id, days)}
                          >
                            {days}D
                          </Button>
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
                    <div className="flex flex-wrap gap-1.5 pl-1">
                      {followUps.map((s) => (
                        <PromptChip key={s} label={s} onClick={() => runChip(s)} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border p-3 bg-card/80 sticky bottom-0">
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Ask a scenario question…"
            rows={2}
            className={`text-base resize-none transition-shadow ${focused ? "ring-2 ring-accent/40" : ""}`}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!input.trim()} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AiLabChat;
