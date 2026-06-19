import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const SUGGESTED_PROMPTS = [
  "If I invest KES 100,000 at the current average yield for 12 months",
  "KES 10,000 in SCOM",
  "What happens if I put KES 10,000 in Safaricom?",
  "Compare SCOM vs EQTY",
  "Explain treasury bills",
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (prompt: string) => void;
}

const PromptCard = ({ value, onChange, onSubmit }: Props) => {
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSubmit(value.trim());
  };

  const runChip = (text: string) => {
    onChange(text);
    onSubmit(text);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ask a scenario question…"
          rows={3}
          className={`text-base resize-none transition-shadow ${focused ? "ring-2 ring-accent/40" : ""}`}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!value.trim()} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Run scenario
          </Button>
        </div>
      </form>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Try a prompt
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => runChip(p)}
              className="text-[12px] px-2.5 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromptCard;
