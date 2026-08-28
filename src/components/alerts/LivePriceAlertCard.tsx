import { useEffect, useRef } from "react";
import { ArrowUpRight, BellRing, Clock3, X } from "lucide-react";
import type { AppNotification } from "./NotificationProvider";
import { priceAlertPresentation } from "./priceAlertPresentation";

type Props = {
  notification: AppNotification | null;
  onDismiss: () => void;
  onView: (notification: AppNotification) => void;
};

export function LivePriceAlertCard({ notification, onDismiss, onView }: Props) {
  const dismissRef = useRef<HTMLButtonElement>(null);
  const details = notification ? priceAlertPresentation(notification) : null;

  useEffect(() => {
    if (!notification) return;
    dismissRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onDismiss(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [notification, onDismiss]);

  if (!notification || !details) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm motion-reduce:backdrop-blur-none" role="presentation">
      <section role="alertdialog" aria-modal="true" aria-labelledby="price-alert-title" className="w-full max-w-md overflow-hidden rounded-[28px] border border-emerald-400/35 bg-slate-950 text-slate-50 shadow-[0_25px_100px_rgba(0,0,0,0.55)] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-300"><span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-400 text-slate-950"><BellRing className="h-3.5 w-3.5" /></span> Price target reached</div>
          <button ref={dismissRef} type="button" aria-label="Dismiss price alert" onClick={onDismiss} className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300"><X className="h-4 w-4" /></button>
        </header>
        <div className="px-5 pb-5 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-3xl font-bold tracking-tight">{details.currentPrice ?? "Price updated"}</p><h2 id="price-alert-title" className="mt-1 text-base font-semibold">{details.assetName}{details.symbol && <span className="text-slate-400"> ({details.symbol})</span>}</h2></div>
            <span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-300">Target hit</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-white/[0.06] p-3">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your condition</p><p className="mt-1 text-sm font-semibold text-white">{details.target ?? "Price target met"}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Observed</p><p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-white"><Clock3 className="h-3.5 w-3.5 text-emerald-300" />{details.observedAt ? new Date(details.observedAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }) : "Now"}</p></div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-400">Price data is informational only and is not financial advice.</p>
          <div className="mt-5 flex gap-2"><button type="button" onClick={onDismiss} className="flex-1 rounded-xl border border-white/15 px-3 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300">Dismiss</button><button type="button" onClick={() => onView(notification)} className="flex-1 rounded-xl bg-emerald-400 px-3 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300">View alert <ArrowUpRight className="ml-1 inline h-4 w-4" /></button></div>
        </div>
      </section>
    </div>
  );
}
