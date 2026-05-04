import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Sparkles, FileDown, TrendingUp, TrendingDown, Bot, ArrowUpRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { supabase } from "@/integrations/supabase/client";

type Risk = "low" | "medium" | "high";
type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Best MMF for KES 50,000 right now",
  "Top 3 NSE stocks for growth",
  "Hedge KES against USD — what should I do?",
  "Build a balanced KES 200k portfolio",
];

const RISK_COPY: Record<Risk, string> = {
  low: "Capital preservation — MMFs & short bonds.",
  medium: "Balanced — MMFs, bonds & blue-chips.",
  high: "Growth — NSE equities & aggressive funds.",
};

const fmt = (n: number | null | undefined, d = 2) =>
  n == null ? "—" : Number(n).toLocaleString("en-KE", { maximumFractionDigits: d, minimumFractionDigits: d });

const AIAnalystPage = () => {
  useDocumentTitle("AI Investment Analyst — KenyaFundFinder");

  const [risk, setRisk] = useState<Risk>("medium");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Live market data
  const [funds, setFunds] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingData(true);
      const [f, s, r, c] = await Promise.all([
        supabase.from("funds").select("id,name,manager,fund_type,annual_yield,daily_yield,minimum_investment,management_fee,yield_unit").eq("is_published", true).order("annual_yield", { ascending: false, nullsFirst: false }).limit(8),
        supabase.from("stocks").select("symbol,name,price,day_change_percent,sector").eq("is_active", true).order("day_change_percent", { ascending: false, nullsFirst: false }).limit(8),
        supabase.from("exchange_rates").select("currency_code,currency_name,rate,previous_rate").eq("is_active", true).order("sort_order", { ascending: true }).limit(8),
        supabase.from("commodities").select("name,symbol,price,previous_price,unit").eq("is_active", true).order("sort_order", { ascending: true }).limit(8),
      ]);
      if (!alive) return;
      setFunds(f.data || []);
      setStocks(s.data || []);
      setRates(r.data || []);
      setCommodities(c.data || []);
      setLoadingData(false);
    })();
    return () => { alive = false; };
  }, []);

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
    setExpanded(true);

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
    const clean = content.replace(/\*\*/g, "").replace(/\|/g, "  ").replace(/^#+\s/gm, "");
    const lines = doc.splitTextToSize(clean, 515);
    doc.text(lines, 40, 100);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("AI-generated. Verify on KenyaFundFinder Compare Funds page.", 40, 820);
    doc.save(`kff-analyst-${Date.now()}.pdf`);
  };

  const lastAssistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === "assistant"),
    [messages]
  );

  return (
    <div className="min-h-screen bg-[#F7F7F7] dark:bg-background">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <header className="mb-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-accent" />
              AI Investment Analyst
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live Kenyan market data · grounded AI guidance.
            </p>
          </div>

          <div className="inline-flex items-center gap-1 bg-white dark:bg-card border border-border rounded-full p-1 shadow-sm">
            {(["low", "medium", "high"] as Risk[]).map((r) => (
              <button
                key={r}
                onClick={() => setRisk(r)}
                className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-full transition-all ${
                  risk === r ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </header>

        {/* Live Market Data Panel — tabbed tables */}
        <Card className="bg-white dark:bg-card border-border/60 rounded-2xl shadow-[0_2px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden mb-5">
          <Tabs defaultValue="funds" className="w-full">
            <div className="px-5 pt-4 pb-0 flex items-center justify-between flex-wrap gap-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] uppercase tracking-widest font-semibold text-foreground">Live Market Data</span>
              </div>
              <TabsList className="bg-muted/40">
                <TabsTrigger value="funds" className="text-xs">Unit Trusts</TabsTrigger>
                <TabsTrigger value="stocks" className="text-xs">NSE Stocks</TabsTrigger>
                <TabsTrigger value="fx" className="text-xs">FX Rates</TabsTrigger>
                <TabsTrigger value="commodities" className="text-xs">Commodities</TabsTrigger>
              </TabsList>
            </div>

            {/* Unit Trusts */}
            <TabsContent value="funds" className="m-0 p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-5 py-2.5 font-semibold">Fund</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Manager</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Type</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Annual Yield</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Min. Inv.</th>
                      <th className="text-right px-5 py-2.5 font-semibold">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingData && Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-t border-border/40">
                        <td colSpan={6} className="px-5 py-3"><div className="h-4 bg-muted/40 rounded animate-pulse" /></td>
                      </tr>
                    ))}
                    {!loadingData && funds.map((f) => (
                      <tr key={f.id} className="border-t border-border/40 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-2.5 font-medium text-foreground">{f.name}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{f.manager}</td>
                        <td className="px-3 py-2.5 text-muted-foreground capitalize">{f.fund_type}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-emerald-600 tabular-nums">{fmt(f.annual_yield)}{f.yield_unit || "%"}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{fmt(f.minimum_investment, 0)}</td>
                        <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(f.management_fee)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Stocks */}
            <TabsContent value="stocks" className="m-0 p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-5 py-2.5 font-semibold">Symbol</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Name</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Sector</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Price (KES)</th>
                      <th className="text-right px-5 py-2.5 font-semibold">Day %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingData && Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-t border-border/40">
                        <td colSpan={5} className="px-5 py-3"><div className="h-4 bg-muted/40 rounded animate-pulse" /></td>
                      </tr>
                    ))}
                    {!loadingData && stocks.map((s) => {
                      const up = (s.day_change_percent ?? 0) >= 0;
                      return (
                        <tr key={s.symbol} className="border-t border-border/40 hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-2.5 font-bold text-foreground">{s.symbol}</td>
                          <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[200px]">{s.name}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{s.sector}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{fmt(s.price)}</td>
                          <td className={`px-5 py-2.5 text-right tabular-nums font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}>
                            <span className="inline-flex items-center gap-1">
                              {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {up ? "+" : ""}{fmt(s.day_change_percent)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* FX */}
            <TabsContent value="fx" className="m-0 p-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/40">
                {loadingData && Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-card p-4"><div className="h-12 bg-muted/40 rounded animate-pulse" /></div>
                ))}
                {!loadingData && rates.map((r) => {
                  const chg = r.previous_rate ? ((r.rate - r.previous_rate) / r.previous_rate * 100) : 0;
                  const up = chg >= 0;
                  return (
                    <div key={r.currency_code} className="bg-card hover:bg-muted/20 p-4 transition-colors">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{r.currency_code}/KES</div>
                      <div className="text-lg font-bold text-foreground tabular-nums">{fmt(r.rate)}</div>
                      <div className={`text-xs tabular-nums font-medium ${up ? "text-emerald-600" : "text-red-500"}`}>
                        {up ? "+" : ""}{chg.toFixed(2)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Commodities */}
            <TabsContent value="commodities" className="m-0 p-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/40">
                {loadingData && Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-card p-4"><div className="h-12 bg-muted/40 rounded animate-pulse" /></div>
                ))}
                {!loadingData && commodities.map((c) => {
                  const chg = c.previous_price ? ((c.price - c.previous_price) / c.previous_price * 100) : 0;
                  const up = chg >= 0;
                  return (
                    <div key={c.symbol} className="bg-card hover:bg-muted/20 p-4 transition-colors">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 truncate">{c.name}</div>
                      <div className="text-lg font-bold text-foreground tabular-nums">{fmt(c.price)}</div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] text-muted-foreground">{c.unit}</span>
                        <span className={`text-xs tabular-nums font-medium ${up ? "text-emerald-600" : "text-red-500"}`}>
                          {up ? "+" : ""}{chg.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* AI Response Panel — only shows once a message is sent */}
        {messages.length > 0 && (
          <Card className="bg-white dark:bg-card border-border/60 rounded-2xl shadow-[0_2px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden mb-5">
            <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-foreground text-background flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">AI Analyst</div>
                  <div className="text-[10px] text-muted-foreground">Risk: <span className="capitalize">{risk}</span> · {RISK_COPY[risk]}</div>
                </div>
              </div>
              {lastAssistant?.content && !streaming && (
                <Button size="sm" variant="ghost" onClick={() => exportPDF(lastAssistant.content)} className="h-7 text-xs gap-1.5">
                  <FileDown className="h-3.5 w-3.5" /> Export PDF
                </Button>
              )}
            </div>

            <div ref={scrollRef} className={`overflow-y-auto px-5 lg:px-8 py-5 space-y-5 transition-all ${expanded ? "max-h-[600px]" : "max-h-[300px]"}`}>
              {messages.map((m, i) => (
                <div key={i}>
                  {m.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="bg-foreground text-background rounded-2xl rounded-tr-md px-4 py-2 text-sm max-w-[80%]">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div className="ai-response text-sm text-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || "…"}</ReactMarkdown>
                      {streaming && i === messages.length - 1 && (
                        <span className="inline-block w-1.5 h-4 bg-foreground animate-pulse ml-0.5 align-middle" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Compact Prompt Bar */}
        <Card className="bg-white dark:bg-card border-border/60 rounded-full shadow-[0_2px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 pl-5 pr-2 py-1.5"
          >
            <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the AI Analyst about funds, stocks, FX or commodities…"
              className="flex-1 bg-transparent outline-none text-[16px] md:text-sm text-foreground placeholder:text-muted-foreground py-2"
              disabled={streaming}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || streaming}
              className="h-9 w-9 rounded-full bg-foreground text-background hover:bg-foreground/90 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>

        {/* Suggestion chips */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-4 py-2 rounded-full bg-white dark:bg-card border border-border/60 hover:border-foreground/40 hover:bg-muted/30 transition-colors text-foreground inline-flex items-center gap-1.5"
              >
                {s}
                <ArrowUpRight className="h-3 w-3 opacity-60" />
              </button>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-4 text-center">
          AI-generated. Verify with the <a href="/compare" className="underline hover:text-foreground">Compare Funds</a> page for live data.
        </p>
      </div>

      {/* Scoped styles for AI markdown response — ensures tables render with borders & spacing */}
      <style>{`
        .ai-response { line-height: 1.6; }
        .ai-response h2 { font-size: 0.95rem; font-weight: 700; margin: 1.25rem 0 0.5rem; color: hsl(var(--foreground)); border-bottom: 1px solid hsl(var(--border) / 0.6); padding-bottom: 0.35rem; }
        .ai-response h3 { font-size: 0.85rem; font-weight: 600; margin: 1rem 0 0.4rem; color: hsl(var(--foreground)); }
        .ai-response h2:first-child, .ai-response h3:first-child { margin-top: 0; }
        .ai-response p { margin: 0.5rem 0; }
        .ai-response strong { font-weight: 600; color: hsl(var(--foreground)); }
        .ai-response ul, .ai-response ol { margin: 0.5rem 0; padding-left: 1.25rem; }
        .ai-response li { margin: 0.2rem 0; }
        .ai-response em { color: hsl(var(--muted-foreground)); font-style: italic; font-size: 0.8rem; }
        .ai-response > *:has(table), .ai-response p:has(> table) { overflow-x: auto; }
        .ai-response table { width: 100%; border-collapse: collapse; margin: 0.5rem 0 1rem; font-size: 0.78rem; display: table; }
        .ai-response thead { background: hsl(var(--muted) / 0.4); }
        .ai-response th { text-align: left; font-weight: 600; padding: 0.5rem 0.6rem; border: 1px solid hsl(var(--border) / 0.6); color: hsl(var(--foreground)); white-space: nowrap; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; }
        .ai-response td { padding: 0.45rem 0.6rem; border: 1px solid hsl(var(--border) / 0.5); vertical-align: top; }
        .ai-response tbody tr:hover { background: hsl(var(--muted) / 0.2); }
        .ai-response code { background: hsl(var(--muted) / 0.5); padding: 0.1rem 0.35rem; border-radius: 0.25rem; font-size: 0.78rem; }
      `}</style>
    </div>
  );
};

export default AIAnalystPage;
