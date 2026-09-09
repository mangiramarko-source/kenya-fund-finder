import { ArrowUp, ExternalLink, Sparkles, X } from "lucide-react";

export default function DevAiLabPopupPreviewPage() {
  return (
    <main className="min-h-screen bg-muted/40 px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Development preview</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Floating AI Lab popup</h1>
          <p className="mt-1 text-sm text-muted-foreground">Compact assistant surface for using AI while keeping the market page visible.</p>
        </div>

        <div className="relative min-h-[700px] overflow-hidden rounded-3xl border border-border bg-background shadow-sm">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-emerald-500/10 via-background to-background" />
          <div className="relative p-6 sm:p-10"><p className="text-sm font-semibold text-muted-foreground">Market overview content remains visible behind the assistant.</p></div>

          <section className="absolute bottom-5 right-5 flex h-[min(620px,calc(100%-2.5rem))] w-[min(410px,calc(100%-2.5rem))] flex-col overflow-hidden rounded-[24px] border border-border/80 bg-background/95 shadow-2xl backdrop-blur-xl" aria-label="AI Lab popup demo">
            <header className="flex shrink-0 items-center justify-between border-b border-border/70 bg-card/80 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500"><Sparkles className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-bold">AI Lab</p><p className="text-[11px] text-muted-foreground">Ask about Kenyan markets</p></div></div>
              <div className="flex items-center gap-1"><button type="button" aria-label="Open full AI Lab" className="rounded-full p-2 text-muted-foreground hover:bg-muted"><ExternalLink className="h-4 w-4" /></button><button type="button" aria-label="Close AI Lab" className="rounded-full p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button></div>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-muted px-3.5 py-2.5 text-xs leading-relaxed">Put KES 100,000 in an MMF for 12 months</div></div>
              <div className="space-y-3"><div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600"><Sparkles className="h-3.5 w-3.5" />AI scenario</div><p className="text-xs leading-relaxed text-muted-foreground">Here is an educational estimate using the current annual yield.</p><div className="grid grid-cols-3 gap-2"><div className="min-w-0 rounded-xl border border-border/70 bg-card p-2.5"><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Projected</p><p className="mt-1 truncate text-sm font-extrabold">Ksh 107,030</p></div><div className="min-w-0 rounded-xl border border-border/70 bg-card p-2.5"><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Monthly</p><p className="mt-1 truncate text-sm font-extrabold">Ksh 585.83</p></div><div className="min-w-0 rounded-xl border border-border/70 bg-card p-2.5"><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Yield</p><p className="mt-1 text-sm font-extrabold">7.03%</p></div></div><p className="text-[10px] text-muted-foreground">Data only — not personal financial advice.</p></div>
            </div>
            <div className="shrink-0 border-t border-border/60 bg-background/90 p-3"><div className="flex items-center gap-2 rounded-full border border-border/80 bg-card p-1.5 shadow-sm"><button type="button" aria-label="Prompt options" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><span className="text-lg leading-none">+</span></button><span className="min-w-0 flex-1 truncate px-1 text-xs text-muted-foreground">Ask AI Lab</span><button type="button" aria-label="Send prompt" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"><ArrowUp className="h-4 w-4" /></button></div></div>
          </section>
        </div>
      </div>
    </main>
  );
}
