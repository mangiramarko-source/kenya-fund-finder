import { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, BellRing, BookmarkCheck, BriefcaseBusiness,
  Check, ChevronRight, Mail, Search, ShieldCheck, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";

export type OnboardingAssetType = "fund" | "stock" | "currency" | "commodity" | "fixed_income";

export interface OnboardingAsset {
  id: string;
  databaseId?: string;
  type: OnboardingAssetType;
  name: string;
  detail: string;
  price?: number;
  ticker?: string;
  annualYield?: number;
}

export interface OnboardingSetupProps {
  assets: OnboardingAsset[];
  onExplore?: () => void;
  onCreateAlert?: () => void;
  onComplete: (draft: {
    priceAlertEmail: boolean;
    marketBriefEmail: boolean;
    watchlist: OnboardingAsset[];
    portfolioAsset: OnboardingAsset | null;
    portfolioAmount: number | null;
  }) => Promise<boolean>;
}

const labels: Record<OnboardingAssetType, string> = {
  fund: "Funds", stock: "NSE stocks", currency: "FX", commodity: "Commodities", fixed_income: "T-bills & bonds",
};

export default function OnboardingSetup({
  assets, onExplore, onCreateAlert, onComplete,
}: OnboardingSetupProps) {
  const [step, setStep] = useState(0);
  const [priceAlertEmail, setPriceAlertEmail] = useState(false);
  const [marketBriefEmail, setMarketBriefEmail] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<OnboardingAssetType | "all">("all");
  const [watchlist, setWatchlist] = useState<OnboardingAsset[]>([]);
  const [portfolioAsset, setPortfolioAsset] = useState<OnboardingAsset | null>(null);
  const [portfolioAmount, setPortfolioAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => assets.filter((asset) => {
    const query = search.trim().toLowerCase();
    return (type === "all" || asset.type === type)
      && (!query || `${asset.name} ${asset.detail}`.toLowerCase().includes(query));
  }), [assets, search, type]);
  const watchlistAssets = useMemo(() => filtered.filter((asset) => asset.type !== "fixed_income"), [filtered]);
  const enterPortfolio = () => {
    setSearch("");
    setType("all");
    setStep(2);
  };

  const toggleWatchlist = (asset: OnboardingAsset) => {
    setWatchlist((current) => {
      const exists = current.some((saved) => saved.id === asset.id && saved.type === asset.type);
      if (exists) return current.filter((saved) => !(saved.id === asset.id && saved.type === asset.type));
      if (current.length >= 5) return current;
      return [...current, asset];
    });
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    const amount = Number(portfolioAmount.replace(/,/g, ""));
    if (portfolioAsset && (!Number.isFinite(amount) || amount <= 0)) {
      setSaving(false);
      setError("Enter a valid KES amount or remove the selected asset before saving.");
      return;
    }
    const ok = await onComplete({
      priceAlertEmail,
      marketBriefEmail,
      watchlist,
      portfolioAsset,
      portfolioAmount: portfolioAsset && Number.isFinite(amount) && amount > 0 ? amount : null,
    });
    setSaving(false);
    setError(ok ? null : "We couldn't save your setup. Please try again—your choices are still here.");
    if (ok) setStep(3);
  };

  const stages = ["Updates", "Watchlist", "Portfolio"];

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      {step < 3 && <>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
            <span className="h-5 w-1 rounded-full bg-emerald-500" /> KenyaFundFinder
          </div>
          <span className="text-xs text-muted-foreground">Optional setup</span>
        </div>
        <ol className="grid grid-cols-3 gap-2" aria-label="Onboarding progress">
          {stages.map((label, index) => <li key={label} className="min-w-0">
            <div className={`h-1 rounded-full ${index <= step ? "bg-emerald-500" : "bg-muted"}`} />
            <span className={`mt-1.5 block truncate text-[10px] font-medium ${index === step ? "text-foreground" : "text-muted-foreground"}`}>{index + 1}. {label}</span>
          </li>)}
        </ol>
      </>}

      {step === 0 && <section className="space-y-5">
        <div>
          <DialogTitle className="text-2xl sm:text-3xl font-semibold tracking-tight">Choose your updates</DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-relaxed">Your account works either way. Choose only the emails that help you keep track.</DialogDescription>
        </div>
        <div className="space-y-3">
          <ChoiceCard icon={BellRing} title="Price alert emails" detail="Email me when a price target I have set is reached." checked={priceAlertEmail} onChange={setPriceAlertEmail} />
          <ChoiceCard icon={Mail} title="Market Brief & Morning News" detail="Send market summaries and weekday morning news highlights." checked={marketBriefEmail} onChange={setMarketBriefEmail} />
        </div>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />No email is sent now. You can change these in Alerts → Settings at any time.</p>
        <StepActions onNext={() => setStep(1)} next="Continue to watchlist" onSkip={() => { setPriceAlertEmail(false); setMarketBriefEmail(false); setStep(1); }} />
      </section>}

      {step === 1 && <section className="space-y-5">
        <div>
          <DialogTitle className="text-2xl sm:text-3xl font-semibold tracking-tight">Build a watchlist</DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-relaxed">Pick up to five assets to follow. You can add more whenever you want.</DialogDescription>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(["all", "fund", "stock", "currency", "commodity"] as const).map((value) => <button type="button" key={value} onClick={() => setType(value)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${type === value ? "border-emerald-600 bg-emerald-600 text-white" : "border-border bg-background text-muted-foreground"}`}>{value === "all" ? "All assets" : labels[value]}</button>)}
        </div>
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search funds, stocks, FX, or commodities" /></div>
        <div className="max-h-[270px] divide-y overflow-y-auto rounded-xl border border-border">
          {watchlistAssets.map((asset) => {
            const selected = watchlist.some((saved) => saved.id === asset.id && saved.type === asset.type);
            return <button key={`${asset.type}-${asset.id}`} type="button" onClick={() => toggleWatchlist(asset)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/50">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${selected ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>{selected ? <Check className="h-4 w-4" /> : <BookmarkCheck className="h-4 w-4" />}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{asset.name}</span><span className="block truncate text-xs text-muted-foreground">{asset.detail}</span></span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{labels[asset.type]}</span>
            </button>;
          })}
        </div>
        <p className="text-xs text-muted-foreground">{watchlist.length}/5 selected · T-bills & bonds can be added to your portfolio in the next step.</p>
        <StepActions onBack={() => setStep(0)} onNext={enterPortfolio} next="Continue to portfolio" onSkip={enterPortfolio} />
      </section>}

      {step === 2 && <section className="space-y-5">
        <div>
          <DialogTitle className="text-2xl sm:text-3xl font-semibold tracking-tight">Add a private holding</DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-relaxed">Optional. Track one investment privately in your account—this is not investment advice.</DialogDescription>
        </div>
        {!portfolioAsset ? <>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(["all", "fund", "stock", "currency", "commodity", "fixed_income"] as const).map((value) => <button type="button" key={value} onClick={() => setType(value)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${type === value ? "border-emerald-600 bg-emerald-600 text-white" : "border-border bg-background text-muted-foreground"}`}>{value === "all" ? "All assets" : labels[value]}</button>)}
          </div>
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search an asset to track" /></div>
          <div className="max-h-[260px] divide-y overflow-y-auto rounded-xl border border-border">
            {filtered.map((asset) => <button key={`${asset.type}-${asset.id}`} type="button" onClick={() => setPortfolioAsset(asset)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/50"><BriefcaseBusiness className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{asset.name}</span><span className="block truncate text-xs text-muted-foreground">{asset.detail}</span></span></button>)}
          </div>
        </> : <div className="space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{portfolioAsset.name}</p><p className="text-xs text-muted-foreground">{portfolioAsset.detail}</p></div><Button size="sm" variant="ghost" onClick={() => setPortfolioAsset(null)}>Change</Button></div>
          <div><label className="text-xs font-medium text-foreground">How much are you tracking?</label><div className="relative mt-1.5"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KES</span><Input inputMode="decimal" type="number" min="0" value={portfolioAmount} onChange={(event) => setPortfolioAmount(event.target.value)} className="pl-12 text-base font-semibold" placeholder="e.g. 10,000" /></div><p className="mt-1.5 text-[11px] text-muted-foreground">For stocks, FX, and commodities, we calculate units from the current listed price.</p></div>
        </div>}
        <StepActions onBack={() => setStep(1)} onNext={() => void finish()} next={saving ? "Saving your setup…" : "Save setup & explore"} disabled={saving} onSkip={() => { setPortfolioAsset(null); setPortfolioAmount(""); void finish(); }} />
        {error && <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
      </section>}

      {step === 3 && <section className="space-y-6 py-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Sparkles className="h-6 w-6" /></span>
        <div><DialogTitle className="text-2xl sm:text-3xl font-semibold tracking-tight">Your dashboard is ready.</DialogTitle><DialogDescription className="mt-3 leading-relaxed">Your updates, watchlist, and private portfolio setup are saved. You can refine everything later.</DialogDescription></div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm"><p className="font-semibold">Setup summary</p><p className="mt-1 text-muted-foreground">{watchlist.length ? `${watchlist.length} watchlist ${watchlist.length === 1 ? "asset" : "assets"}` : "No watchlist assets yet"}{portfolioAsset ? ` · ${portfolioAsset.name} added to your portfolio` : " · Portfolio can be added later"}</p></div>
        {priceAlertEmail && <Button variant="outline" className="w-full min-h-12" onClick={onCreateAlert}>Create your first price alert <ArrowRight className="ml-2 h-4 w-4" /></Button>}
        <Button className="w-full min-h-12" onClick={onExplore}>Explore your overview <ChevronRight className="ml-2 h-4 w-4" /></Button>
      </section>}
    </div>
  );
}

function ChoiceCard({ icon: Icon, title, detail, checked, onChange }: { icon: typeof Mail; title: string; detail: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${checked ? "border-emerald-600 bg-emerald-500/5" : "border-border bg-background"}`}><Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{detail}</span></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 accent-emerald-600" aria-label={title} /></label>;
}

function StepActions({ onBack, onNext, onSkip, next, disabled }: { onBack?: () => void; onNext: () => void; onSkip: () => void; next: string; disabled?: boolean }) {
  return <div className="space-y-2"><div className="flex gap-2">{onBack && <Button type="button" variant="outline" className="min-h-12 px-4" onClick={onBack} disabled={disabled}><ArrowLeft className="h-4 w-4" /></Button>}<Button type="button" className="min-h-12 flex-1" onClick={onNext} disabled={disabled}>{next}<ArrowRight className="ml-2 h-4 w-4" /></Button></div><Button type="button" variant="ghost" className="min-h-11 w-full text-muted-foreground" onClick={onSkip} disabled={disabled}>Skip for now</Button></div>;
}
