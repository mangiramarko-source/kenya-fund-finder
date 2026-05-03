import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, FileDown, TrendingUp, TrendingDown, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

type Risk = "low" | "medium" | "high";
type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How should I invest KES 10,000 this month?",
  "Compare MMFs vs NSE stocks for a 1-year horizon",
  "Best low-risk options for KES 50,000",
  "Build a portfolio for retirement in 20 years",
];

const MARKET_SNAPSHOT = {
  gainers: [
    { sym: "SGL", chg: 26.42 },
    { sym: "KCB", chg: 4.18 },
    { sym: "EQTY", chg: 2.95 },
  ],
  losers: [
    { sym: "BAT", chg: -1.84 },
    { sym: "SCOM", chg: -0.72 },
  ],
  mmfs: [
    { name: "ICEA Lion MMF", yield: 16.7 },
    { name: "Cytonn MMF", yield: 16.2 },
    { name: "Etica MMF", yield: 15.8 },
  ],
  fx: { pair: "USD/KES", rate: 129.13, chg: -0.08 },
};

const RISK_COPY: Record<Risk, string> = {
  low: "Capital preservation. MMFs and short-term bonds.",
  medium: "Balanced. Mix of MMFs, bonds and blue-chip equities.",
  high: "Growth-focused. NSE equities and aggressive funds.",
};

const AIAnalystPage = () => {
  useDocumentTitle("AI Investment Analyst — KenyaFundFinder");

  const [risk, setRisk] = useState<Risk>("medium");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    let acc = "";
    const upsert = (chunk: string) => {
      acc += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m));
        }
        return [...prev, { role: "assistant", content: acc }];
      });
    };

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analyst`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next, riskProfile: risk }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) upsert("⚠️ Too many requests. Please wait a moment and try again.");
        else if (resp.status === 402) upsert("⚠️ AI credits exhausted. Please add credits in workspace settings.");
        else upsert("⚠️ Something went wrong. Please try again.");
        setStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || !line.trim()) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      upsert("⚠️ Connection error. Please try again.");
    } finally {
      setStreaming(false);
    }
  };

  const exportPDF = (content: string) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("KenyaFundFinder — AI Analyst Report", 40, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Risk profile: ${risk.toUpperCase()}   ·   ${new Date().toLocaleString("en-KE")}`, 40, 68);
    doc.setDrawColor(220);
    doc.line(40, 78, 555, 78);
    doc.setFontSize(11);
    // Strip markdown table pipes and stars for clean PDF text
    const clean = content.replace(/\*\*/g, "").replace(/\|/g, "  ").replace(/^#+\s/gm, "");
    const lines = doc.splitTextToSize(clean, 515);
    doc.text(lines, 40, 100);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("AI-generated. Verify on KenyaFundFinder Compare Funds page.", 40, 820);
    doc.save(`kff-analyst-${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] dark:bg-background">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
        {/* Header */}
        <header className="mb-6 lg:mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-accent" />
              AI Investment Analyst
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Personalized, Kenya-focused portfolio guidance powered by AI.
            </p>
          </div>

          {/* Risk toggle */}
          <div className="inline-flex items-center gap-1 bg-white dark:bg-card border border-border rounded-full p-1 shadow-sm">
            {(["low", "medium", "high"] as Risk[]).map((r) => (
              <button
                key={r}
                onClick={() => setRisk(r)}
                className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-full transition-all ${
                  risk === r
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </header>

        {/* Layout: chat + snapshot */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* Chat */}
          <Card className="bg-white dark:bg-card border-border/60 rounded-3xl shadow-[0_2px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[560px]">
            <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-muted-foreground">
                  Risk profile: <span className="text-foreground font-semibold capitalize">{risk}</span> · {RISK_COPY[risk]}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 lg:px-8 py-6 space-y-6">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                  <div className="h-14 w-14 rounded-2xl bg-foreground text-background flex items-center justify-center mb-4">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    How would you like to grow your money today?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Ask anything about Kenyan investments — MMFs, NSE stocks, T-Bills, or building a portfolio from scratch.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-left text-xs px-4 py-3 rounded-2xl bg-[#F7F7F7] dark:bg-muted/30 hover:bg-muted border border-border/40 transition-colors text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                  {m.role === "assistant" && (
                    <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div className={`max-w-[85%] ${m.role === "user" ? "order-1" : ""}`}>
                    {m.role === "user" ? (
                      <div className="bg-foreground text-background rounded-3xl rounded-tr-md px-4 py-3 text-sm">
                        {m.content}
                      </div>
                    ) : (
                      <div className="bg-[#F7F7F7] dark:bg-muted/30 border border-border/40 rounded-3xl rounded-tl-md px-5 py-4 text-sm">
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-table:text-xs prose-th:bg-muted/40 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-table:border prose-th:border prose-td:border prose-th:border-border prose-td:border-border">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {m.content || "..."}
                          </ReactMarkdown>
                        </div>
                        {m.content && !streaming && i === messages.length - 1 && (
                          <div className="mt-3 pt-3 border-t border-border/40 flex justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => exportPDF(m.content)}
                              className="h-7 text-xs gap-1.5"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              Export to PDF
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {m.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0 order-2">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-border/60 p-4 lg:px-6">
              <form
                onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="flex items-center gap-2 bg-[#F7F7F7] dark:bg-muted/30 border border-border/60 rounded-full pl-5 pr-2 py-1.5 focus-within:border-foreground/40 transition-colors"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="How would you like to grow your money today?"
                  className="flex-1 bg-transparent outline-none text-[16px] md:text-sm text-foreground placeholder:text-muted-foreground"
                  disabled={streaming}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || streaming}
                  className="h-9 w-9 rounded-full bg-foreground text-background hover:bg-foreground/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                AI-generated. Verify with the <a href="/compare" className="underline hover:text-foreground">Compare Funds</a> page for live data.
              </p>
            </div>
          </Card>

          {/* Market snapshot */}
          <aside className="space-y-4">
            <Card className="bg-white dark:bg-card border-border/60 rounded-3xl shadow-[0_2px_24px_-8px_rgba(0,0,0,0.08)] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground">Market Snapshot</h3>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Live</span>
              </div>

              {/* FX */}
              <div className="mb-5 pb-5 border-b border-border/40">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Currency</div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-foreground">{MARKET_SNAPSHOT.fx.pair}</span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-foreground tabular-nums">{MARKET_SNAPSHOT.fx.rate.toFixed(2)}</div>
                    <div className={`text-xs tabular-nums ${MARKET_SNAPSHOT.fx.chg >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {MARKET_SNAPSHOT.fx.chg >= 0 ? "+" : ""}{MARKET_SNAPSHOT.fx.chg}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Top gainers */}
              <div className="mb-5 pb-5 border-b border-border/40">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-600" /> Top Gainers (NSE)
                </div>
                <ul className="space-y-2">
                  {MARKET_SNAPSHOT.gainers.map((g) => (
                    <li key={g.sym} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">{g.sym}</span>
                      <span className="text-sm font-semibold text-emerald-600 tabular-nums">+{g.chg.toFixed(2)}%</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* MMFs */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Best MMF Yields</div>
                <ul className="space-y-2">
                  {MARKET_SNAPSHOT.mmfs.map((m) => (
                    <li key={m.name} className="flex justify-between items-center">
                      <span className="text-sm text-foreground truncate">{m.name}</span>
                      <span className="text-sm font-semibold text-foreground tabular-nums">{m.yield}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card className="bg-foreground text-background rounded-3xl p-5">
              <h4 className="text-sm font-bold mb-2">Need live numbers?</h4>
              <p className="text-xs opacity-80 mb-3">
                Browse real-time funds and compare side-by-side on KenyaFundFinder.
              </p>
              <Button asChild variant="secondary" size="sm" className="w-full rounded-full">
                <a href="/compare">Compare Funds</a>
              </Button>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AIAnalystPage;
