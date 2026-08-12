import { ArrowLeft, ArrowRight, ExternalLink, Heart, MoreHorizontal, Share2, TrendingDown, TrendingUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getStockLogoUrl } from "@/lib/stockBranding";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const FACTORS = {
  positive: ["The pricing change may improve revenue earned per data customer.", "Time-based availability may help manage peak network demand."],
  risks: ["Price-sensitive customers could reduce usage or switch bundles.", "Customer dissatisfaction may create short-term brand pressure."],
};

const PERFORMANCE = [{ label: "1D", value: 1.19 }, { label: "7D", value: 4.2 }, { label: "1M", value: 8.6 }, { label: "3M", value: 14.3 }];

export default function StockDecisionFeedDemoPage() {
  const navigate = useNavigate();
  useDocumentTitle("Stock Decision Feed Demo | Kenya Fund Finder", "Demo of enhanced decision-support context for stock-linked news.");
  const logo = getStockLogoUrl("SCOM");

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground md:px-6 md:py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</button>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-500">Demo only</span>
        </div>

        <article className="overflow-hidden border-y border-border bg-card md:rounded-2xl md:border">
          <div className="space-y-4 p-4 md:p-6">
            <Link to="/stocks/SCOM" className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-xs hover:bg-muted"><strong>SCOM</strong><span className="text-muted-foreground">KES 35.75</span><span className="inline-flex items-center text-emerald-500"><TrendingUp className="mr-0.5 h-3 w-3" />1.2%</span></Link>

            <header className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white">{logo ? <img src={logo} alt="Safaricom PLC logo" className="h-full w-full object-contain p-1" /> : <span className="font-bold text-emerald-700">SCOM</span>}</div>
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h1 className="truncate text-sm font-bold">Safaricom PLC</h1><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /><span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Stock</span></div><p className="text-[13px] text-muted-foreground">Tuko News · 2 hours ago</p></div>
              <button type="button" className="p-1 text-muted-foreground" aria-label="More options"><MoreHorizontal className="h-5 w-5" /></button>
            </header>

            <div><h2 className="text-base font-extrabold leading-snug">Safaricom changes availability of its KSh 20 one-hour data bundle</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Safaricom limited the bundle to specific hours and introduced alternative Pata More options.</p></div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Product pricing · Short-term relevance · Source facts checked</p>

            <section className="grid gap-5 border-y border-border py-4 md:grid-cols-2">
              <FactorList title="What could help" tone="positive" items={FACTORS.positive} />
              <FactorList title="What to watch" tone="negative" items={FACTORS.risks} />
            </section>

            <section>
              <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold">Price context</h3><span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Demo data</span></div>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">{PERFORMANCE.map((period) => <Performance key={period.label} {...period} />)}</div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">The price increased during the same period, but the available data does not prove this story caused the movement.</p>
            </section>

            <section className="border-t border-border pt-4"><h3 className="text-sm font-bold">Source facts</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground"><strong className="font-semibold text-foreground">Safaricom PLC</strong> changed a <strong className="font-semibold text-foreground">KSh 20</strong> data bundle. This is classified as a <strong className="font-semibold text-foreground">pricing change</strong> based on the linked publisher article.</p></section>

            <div className="flex flex-wrap items-center gap-3"><button type="button" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-500">Continue reading <ArrowRight className="h-4 w-4" /></button><Link to="/stocks/SCOM" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">Open SCOM report <ExternalLink className="h-3.5 w-3.5" /></Link></div>

            <footer className="flex items-center justify-between gap-3 border-t border-border pt-4 text-muted-foreground"><div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.14em]"><span>0 Comments</span><span>0 Likes</span></div><div className="flex gap-2"><button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-border"><Heart className="h-4 w-4" /></button><button type="button" className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-extrabold uppercase text-background"><Share2 className="h-3.5 w-3.5" /> Share</button></div></footer>
          </div>
        </article>
      </div>
    </main>
  );
}

function FactorList({ title, items, tone }: { title: string; items: string[]; tone: "positive" | "negative" }) { const positive = tone === "positive"; return <div><h3 className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] ${positive ? "text-emerald-500" : "text-rose-500"}`}>{positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}{title}</h3><ul className="mt-2 space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-xs leading-relaxed text-muted-foreground"><span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${positive ? "bg-emerald-500" : "bg-rose-500"}`} />{item}</li>)}</ul></div>; }
function Performance({ label, value }: { label: string; value: number }) { return <div className="flex items-baseline gap-1.5"><span className="text-[10px] font-semibold text-muted-foreground">{label}</span><span className="text-xs font-bold tabular-nums text-emerald-500">+{value.toFixed(2)}%</span></div>; }
