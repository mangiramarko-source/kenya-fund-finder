import { useMemo, useState } from "react";
import PortfolioDailyInsightCard from "@/components/portfolio/PortfolioDailyInsightCard";
import type { AppNotification } from "@/components/alerts/NotificationProvider";

type State = "gain" | "loss" | "unchanged" | "pending";

const samples: Record<Exclude<State, "pending">, AppNotification> = {
  gain: { id: "gain", user_id: "preview", title: "Portfolio up today", message: "", type: "portfolio_daily", is_read: false, created_at: "2026-09-09T14:15:00.000Z", metadata: { opening_value: 1060781, closing_value: 1069904, change: 9123, percent_change: 0.86, movers: [{ asset_name: "Gold (XAU) Tracker", change: 5200 }] } },
  loss: { id: "loss", user_id: "preview", title: "Portfolio down today", message: "", type: "portfolio_daily", is_read: false, created_at: "2026-09-09T14:15:00.000Z", metadata: { opening_value: 1069904, closing_value: 1067454, change: -2450, percent_change: -0.23, movers: [{ asset_name: "Safaricom PLC", change: -1200 }] } },
  unchanged: { id: "unchanged", user_id: "preview", title: "Portfolio unchanged today", message: "", type: "portfolio_daily", is_read: false, created_at: "2026-09-09T14:15:00.000Z", metadata: { opening_value: 1069904, closing_value: 1069904, change: 0, percent_change: 0, movers: [] } },
};

export default function DevPortfolioChangePreviewPage() {
  const [state, setState] = useState<State>("gain");
  const notification = useMemo(() => state === "pending" ? null : samples[state], [state]);
  if (!import.meta.env.DEV) return null;
  return <main className="min-h-[calc(100vh-5rem)] bg-muted/40 px-4 py-6 sm:px-6"><div className="mx-auto max-w-5xl space-y-5">
    <header className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Development preview</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Portfolio daily insight</h1><p className="mt-1 text-sm text-muted-foreground">The approved dark-mode card, using the daily portfolio summary without changing notification state.</p><div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Preview state">{(["gain", "loss", "unchanged", "pending"] as State[]).map((key) => <button key={key} type="button" onClick={() => setState(key)} aria-pressed={state === key} className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${state === key ? "bg-emerald-600 text-white" : "border border-border bg-background text-muted-foreground hover:bg-muted"}`}>{key}</button>)}</div></header>
    <section className="mx-auto max-w-[700px] overflow-hidden rounded-[30px] border border-slate-700/80 bg-slate-950 shadow-2xl"><div className="min-h-[620px] bg-background px-4 py-5 text-foreground sm:px-7 sm:py-8"><div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-bold tracking-tight">Portfolio</h2><p className="mt-1 max-w-xl text-sm text-muted-foreground">Track and manage your investments across MMFs, Stocks, T-Bills and FX.</p></div><button type="button" className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white">+ Add</button></div><PortfolioDailyInsightCard notification={notification} /></div></section>
  </div></main>;
}
