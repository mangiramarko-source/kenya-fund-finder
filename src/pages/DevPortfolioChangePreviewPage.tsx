import { useState } from "react";
import { CheckCircle2, Clock3, Minus, TrendingDown, TrendingUp } from "lucide-react";
import KoraIllustration from "@/components/kora/KoraIllustration";

type State = "gain" | "loss" | "unchanged";

const states: Record<State, {
  label: string;
  title: string;
  amount: string;
  percentage: string;
  explanation: string;
  movers: string;
  pose: "celebrate" | "explain" | "neutral";
}> = {
  gain: {
    label: "Up today", title: "Your portfolio gained today", amount: "+KES 10,000.00", percentage: "+10.00%",
    explanation: "Your comparable holdings moved from KES 100,000.00 to KES 110,000.00.",
    movers: "ABSA Bank Kenya and African Alliance MMF led the move.", pose: "celebrate",
  },
  loss: {
    label: "Down today", title: "Your portfolio declined today", amount: "−KES 2,450.00", percentage: "−2.23%",
    explanation: "Your comparable holdings moved from KES 110,000.00 to KES 107,550.00.",
    movers: "Safaricom PLC and USD/KES accounted for most of the change.", pose: "explain",
  },
  unchanged: {
    label: "Unchanged", title: "Your portfolio was unchanged today", amount: "KES 0.00", percentage: "0.00%",
    explanation: "Your comparable holdings closed at KES 110,000.00, the same as opening.",
    movers: "No material market movement was recorded across your holdings.", pose: "neutral",
  },
};

export default function DevPortfolioChangePreviewPage() {
  const [state, setState] = useState<State>("gain");
  const current = states[state];
  const positive = state === "gain";
  const Icon = state === "gain" ? TrendingUp : state === "loss" ? TrendingDown : Minus;

  if (!import.meta.env.DEV) return null;

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-muted/40 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Development preview</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Portfolio daily update</h1>
          <p className="mt-1 text-sm text-muted-foreground">A proposed explanation card for the portfolio page. It is not connected to account data.</p>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Preview state">
            {(Object.keys(states) as State[]).map((key) => <button key={key} type="button" onClick={() => setState(key)} aria-pressed={state === key} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${state === key ? "bg-emerald-600 text-white" : "border border-border bg-background text-muted-foreground hover:bg-muted"}`}>{states[key].label}</button>)}
          </div>
        </header>

        <section className="mx-auto max-w-[700px] overflow-hidden rounded-[30px] border border-slate-700/80 bg-slate-950 shadow-2xl">
          <div className="min-h-[690px] bg-background px-4 py-5 text-foreground sm:px-7 sm:py-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Portfolio</h2>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">Track and manage your investments across MMFs, Stocks, T-Bills and FX.</p>
              </div>
              <button type="button" className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white">+ Add</button>
            </div>

            <article className={`mt-4 overflow-hidden rounded-2xl border p-4 shadow-sm ${state === "gain" ? "border-emerald-500/30 bg-emerald-500/[0.055]" : state === "loss" ? "border-rose-500/25 bg-rose-500/[0.05]" : "border-border bg-card"}`} aria-label="Today’s portfolio update">
              <div className="flex gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border ${state === "gain" ? "border-emerald-500/30 bg-emerald-500/10" : state === "loss" ? "border-rose-500/30 bg-rose-500/10" : "border-border bg-muted"}`}>
                  <KoraIllustration pose={current.pose} alt="Kora portfolio guide" className="h-12 w-12 scale-125" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <p className="text-sm font-bold text-foreground">{current.title}</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${positive ? "text-emerald-600 dark:text-emerald-400" : state === "loss" ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}><Icon className="h-3.5 w-3.5" />{current.percentage}</span>
                  </div>
                  <p className={`mt-1 text-lg font-black tabular-nums ${positive ? "text-emerald-700 dark:text-emerald-300" : state === "loss" ? "text-rose-700 dark:text-rose-300" : "text-foreground"}`}>{current.amount}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{current.explanation}</p>
                </div>
              </div>
              <div className="mt-3 flex items-start gap-2 border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{current.movers}</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> Last market update: 5:15 PM EAT · 9 Sep 2026</div>
            </article>

            <div className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total value</p>
              <p className="mt-2 text-3xl font-black tabular-nums">KES 110,000.00</p>
              <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">+10.00% today · +KES 10,000.00</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
