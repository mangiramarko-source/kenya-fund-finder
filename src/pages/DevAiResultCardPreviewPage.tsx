import { useState } from "react";
import { Calculator, ChevronDown, TrendingUp } from "lucide-react";

export default function DevAiResultCardPreviewPage() {
  const [showDetails, setShowDetails] = useState(false);
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground md:px-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-500">AI Lab result preview</p>
        <h1 className="text-2xl font-bold tracking-tight">Insight card + calculation drawer</h1>
        <p className="text-sm text-muted-foreground">Recommended direction for clearer scenario explanations.</p>

        <section className="space-y-5 p-1 md:p-2" aria-label="AI chat preview">
          <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-muted px-4 py-3 text-sm">Put 500k in Etica MMF for 2 years</div></div>
          <div className="flex items-start gap-3"><span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500"><TrendingUp className="h-4 w-4" /></span><p className="pt-1 text-sm text-muted-foreground">Here’s an illustrative projection based on the selected fund and time horizon:</p></div>
        <div className="p-1 md:p-2" aria-label="Investment projection summary">
          <div className="grid gap-3 sm:grid-cols-3">
            {[['Projected gross', 'Ksh 552,750'], ['Monthly equivalent', 'Ksh 4,395.83'], ['Annual yield', '10.55%', 'Ksh 500,000']].map(([label, value, note]) => <div key={label} className="rounded-2xl bg-muted/30 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-3 text-xl font-extrabold tracking-tight">{value}</p>{note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}</div>)}
          </div>
          <button type="button" onClick={() => setShowDetails((value) => !value)} aria-expanded={showDetails} className="mt-5 flex w-full items-center justify-between border-t border-border/70 pt-4 text-left text-sm font-semibold hover:text-emerald-500"><span className="inline-flex items-center gap-2"><Calculator className="h-4 w-4" />Calculations</span><ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? "rotate-180" : ""}`} /></button>
          {showDetails && <div className="mt-3 space-y-3 rounded-2xl bg-muted/30 p-4 text-sm"><div className="flex justify-between gap-4"><span className="text-muted-foreground">Selected fund</span><strong>Etica</strong></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Fund type</span><strong>money market</strong></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Initial amount</span><strong>Ksh 500,000</strong></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Annual yield</span><strong>10.55%</strong></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Period</span><strong>12 months</strong></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Estimated annual gross income</span><strong>Ksh 52,750</strong></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Estimated monthly gross equivalent</span><strong>Ksh 4,395.83</strong></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Estimated daily gross equivalent</span><strong>Ksh 144.52</strong></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Projected gross value</span><strong>Ksh 552,750</strong></div><button type="button" className="flex w-full items-center justify-between border-t border-border/60 pt-3 text-left font-semibold">Assumptions <ChevronDown className="h-4 w-4" /></button><button type="button" className="flex w-full items-center justify-between border-t border-border/60 pt-3 text-left font-semibold">Notes <ChevronDown className="h-4 w-4" /></button></div>}
        </div></section>
      </div>
    </main>
  );
}
