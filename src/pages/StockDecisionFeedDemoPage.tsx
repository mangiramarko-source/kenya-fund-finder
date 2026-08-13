import { ArrowLeft, Heart, MoreHorizontal, Share2, TrendingUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getStockLogoUrl } from "@/lib/stockBranding";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { StockDecisionContext } from "@/components/news/StockDecisionContext";
import { type NewsFromDB, type PublicStock } from "@/lib/api";

export default function StockDecisionFeedDemoPage() {
  const navigate = useNavigate();
  useDocumentTitle("Stock Decision Feed Demo | Kenya Fund Finder", "Demo of enhanced decision-support context for stock-linked news.");
  const logo = getStockLogoUrl("SCOM");

  const mockArticle = {
    id: "demo-safaricom-article",
    title: "Safaricom changes availability of its KSh 20 one-hour data bundle",
    source: "Tuko News",
    url: "https://tuko.co.ke",
    created_at: new Date().toISOString(),
  } as NewsFromDB;

  const mockStock = {
    id: "scom-id",
    symbol: "SCOM",
    name: "Safaricom PLC",
    price: 35.75,
    previous_price: 35.33,
    day_change: 0.42,
    day_change_percent: 1.2,
    volume: 10000,
    market_cap: 1000000000,
    pe_ratio: 10,
    dividend_yield: 5,
    sector: "Telecommunications",
    year_high: 40,
    year_low: 20,
    updated_at: new Date().toISOString()
  } as PublicStock;

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

            <div>
              <h2 className="text-base font-extrabold leading-snug">Safaricom changes availability of its KSh 20 one-hour data bundle</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">Safaricom limited the bundle to specific hours and introduced alternative Pata More options. The move is aimed at managing network congestion during peak hours while ensuring customers still have affordable access to internet services.</p>
            </div>

            <StockDecisionContext 
              article={mockArticle} 
              stock={mockStock} 
            />

            <footer className="flex items-center justify-between gap-3 border-t border-border pt-4 text-muted-foreground">
              <div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.14em]">
                <span>0 Comments</span><span>0 Likes</span>
              </div>
              <div className="flex gap-2">
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-border"><Heart className="h-4 w-4" /></button>
                <button type="button" className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-extrabold uppercase text-background"><Share2 className="h-3.5 w-3.5" /> Share</button>
              </div>
            </footer>
          </div>
        </article>
      </div>
    </main>
  );
}
