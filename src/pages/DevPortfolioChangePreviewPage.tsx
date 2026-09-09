import { useMemo, useState } from "react";
import PortfolioDailyInsightCard, { portfolioInsight } from "@/components/portfolio/PortfolioDailyInsightCard";
import { Clock3, ShieldCheck } from "lucide-react";
import type { AppNotification } from "@/components/alerts/NotificationProvider";
import type { PortfolioLiveMovement } from "@/hooks/usePortfolioLiveMovement";

type State = "live" | "daily close" | "loss" | "unchanged" | "tracking";

const dailySamples: Record<"daily close" | "loss" | "unchanged", AppNotification> = {
  "daily close": { id: "daily", user_id: "preview", title: "Portfolio up today", message: "", type: "portfolio_daily", is_read: false, created_at: "2026-09-09T14:15:00.000Z", metadata: { opening_value: 1060781, closing_value: 1069904, change: 9123, percent_change: 0.86, movers: [{ asset_name: "Gold (XAU) Tracker", change: 5200 }] } },
  loss: { id: "loss", user_id: "preview", title: "Portfolio down today", message: "", type: "portfolio_daily", is_read: false, created_at: "2026-09-09T14:15:00.000Z", metadata: { opening_value: 1069904, closing_value: 1067454, change: -2450, percent_change: -0.23, movers: [{ asset_name: "Safaricom PLC", change: -1200 }] } },
  unchanged: { id: "unchanged", user_id: "preview", title: "Portfolio unchanged today", message: "", type: "portfolio_daily", is_read: false, created_at: "2026-09-09T14:15:00.000Z", metadata: { opening_value: 1069904, closing_value: 1069904, change: 0, percent_change: 0, movers: [] } },
};

const liveSample: PortfolioLiveMovement = { openingValue: 1060781, closingValue: 1069904, change: 9123, percentChange: 0.86, movers: [{ assetName: "Gold (XAU) Tracker", change: 5200 }], observedAt: "2026-09-09T14:15:00.000Z", comparedHoldings: 4 };

export default function DevPortfolioChangePreviewPage() {
  const [state, setState] = useState<State>("live");
  const notification = useMemo(() => state in dailySamples ? dailySamples[state as keyof typeof dailySamples] : null, [state]);
  const movement = state === "live" ? liveSample : null;
  const insight = useMemo(() => portfolioInsight(notification, movement), [notification, movement]);
  if (!import.meta.env.DEV) return null;
  return <main className="min-h-[calc(100vh-5rem)] bg-muted/40 px-4 py-6 sm:px-6"><div className="mx-auto max-w-5xl space-y-5">
    <header className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Development preview</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Portfolio movement</h1><p className="mt-1 text-sm text-muted-foreground">A live 24-hour estimate when quote history exists, then a verified close at 5:15 PM EAT.</p><div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Preview state">{(["live", "daily close", "loss", "unchanged", "tracking"] as State[]).map((key) => <button key={key} type="button" onClick={() => setState(key)} aria-pressed={state === key} className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${state === key ? "bg-emerald-600 text-white" : "border border-border bg-background text-muted-foreground hover:bg-muted"}`}>{key}</button>)}</div></header>
    <section className="mx-auto max-w-[700px] overflow-hidden rounded-[30px] border border-slate-700/80 bg-slate-950 shadow-2xl"><div className="min-h-[620px] bg-background px-4 py-5 text-foreground sm:px-7 sm:py-8"><div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-bold tracking-tight">Portfolio</h2><p className="mt-1 max-w-xl text-sm text-muted-foreground">Track and manage your investments across MMFs, Stocks, T-Bills and FX.</p></div><button type="button" className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white">+ Add</button></div><div className="mt-4 space-y-4 rounded-3xl border border-border/75 bg-card p-5 shadow-sm dark:bg-neutral-900/90 dark:border-white/10"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total portfolio</p><div className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold">KES</div></div><div><p className="text-3xl font-black tabular-nums">KES 1,069,904</p><p className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">+0.86% <span className="ml-1 font-medium text-muted-foreground">past 24h</span></p></div><PortfolioDailyInsightCard notification={notification} movement={movement} showUpdatedAt={false} /><div className="border-t border-border/40 pt-3 text-xs text-muted-foreground"><div className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{insight.updatedAt}</div><div className="mt-2 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />100% mock — no real money, live Kenyan market data.</div></div></div></div></section>
  </div></main>;
}
