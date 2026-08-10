import React, { useState } from "react";
import { Sparkles, Bot, Send, ArrowUpRight, TrendingUp, Cpu, Lightbulb, CheckCircle2 } from "lucide-react";
import { StockTickerItem } from "./StockTickerTape";

interface StockAiCopilotPanelProps {
  stocks: StockTickerItem[];
  selectedSymbol?: string | null;
  onSelectStock?: (symbol: string) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export const StockAiCopilotPanel: React.FC<StockAiCopilotPanelProps> = ({
  stocks,
  selectedSymbol,
  onSelectStock,
}) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "ai",
      text: "👋 Jambo! I am your **NSE Market Copilot**. Ask me to analyze any Kenyan stock, sector trends, or dividend yields.",
      timestamp: "Just now",
    },
  ]);

  const quickPrompts = [
    "Analyze EQTY performance",
    "Top NSE Dividend Yields",
    "Safaricom Q3 Outlook",
    "Banking vs Telecom Sector",
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || query;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setQuery("");
    setLoading(true);

    // Simulate AI response with domain intelligence
    setTimeout(() => {
      let aiResponseText = "";
      const lower = text.toLowerCase();

      if (lower.includes("eqty") || lower.includes("equity")) {
        aiResponseText =
          "**Equity Group Holdings (EQTY)** is currently trading strong. Dividend yield is ~8.2%, with a 52-week range of KSh 35.00 to 52.00. Asset growth across East Africa continues to support earnings.";
      } else if (lower.includes("scom") || lower.includes("safaricom")) {
        aiResponseText =
          "**Safaricom Plc (SCOM)** is exhibiting heavy trading volume. M-Pesa revenue growth is offsetting Ethiopian expansion CAPEX costs. Resistance level is at KSh 16.50.";
      } else if (lower.includes("dividend")) {
        aiResponseText =
          "Top NSE Dividend Payers right now:\n1. **BAT Kenya**: ~11.5% yield\n2. **Stanchart (SCBK)**: ~10.2% yield\n3. **NCBA Group**: ~9.4% yield\n4. **Equity Group**: ~8.2% yield";
      } else if (lower.includes("banking") || lower.includes("sector")) {
        aiResponseText =
          "The **Banking Sector** represents over 40% of total NSE market capitalization (KSh 1.61 Trillion). Average sector day change is +0.06% with solid ROE ratios across major lenders.";
      } else {
        aiResponseText = `Based on live NSE market feeds, overall sentiment remains **Bullish (+68%)**. Trading volumes are centered around **Banking** and **Telecommunications** equities.`;
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-1.5">
              AI Market Copilot
              <Sparkles className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
            </h2>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          Live v2.4
        </span>
      </div>

      {/* AI Market Sentiment Card */}
      <div className="rounded-xl border border-border bg-card p-3.5 space-y-2 shadow-sm">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-emerald-500" /> NSE Sentiment Index
          </span>
          <span className="text-emerald-500 font-bold text-[11px]">68% Bullish</span>
        </div>

        {/* Multi-segmented Sentiment Bar */}
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
          <div className="h-full bg-emerald-500" style={{ width: "68%" }} title="Bullish 68%" />
          <div className="h-full bg-yellow-500" style={{ width: "17%" }} title="Neutral 17%" />
          <div className="h-full bg-destructive" style={{ width: "15%" }} title="Bearish 15%" />
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          AI sentiment detects positive accumulation in **Banking** and **Insurance** counters today.
        </p>
      </div>

      {/* Quick AI Prompts */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
          Quick AI Insights
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              className="text-left text-[11px] p-2 rounded-lg bg-card hover:bg-muted/60 border border-border text-foreground transition-all duration-150 flex items-center justify-between group"
            >
              <span className="truncate pr-1">{p}</span>
              <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-emerald-500 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Box */}
      <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col h-[280px]">
        <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs scrollbar-hide">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`p-2.5 rounded-xl max-w-[90%] space-y-1 leading-relaxed ${
                  m.sender === "user"
                    ? "bg-emerald-500 text-white rounded-br-none"
                    : "bg-muted/80 text-foreground border border-border rounded-bl-none"
                }`}
              >
                <p className="whitespace-pre-line">{m.text}</p>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 px-1">{m.timestamp}</span>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse p-2">
              <Bot className="h-4 w-4 text-emerald-500" />
              <span>Analyzing market signals...</span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="p-2 border-t border-border bg-muted/30">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              placeholder="Ask AI about stocks or news..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StockAiCopilotPanel;
