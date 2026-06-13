import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, GitCompareArrows, Briefcase, Table, Calculator, BarChart3, X } from "lucide-react";

const DISMISS_KEY = "kff_home_hero_dismissed_v1";

const HomeHero = () => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* no-op */ }
    setDismissed(true);
  };

  const restore = () => {
    try { localStorage.removeItem(DISMISS_KEY); } catch { /* no-op */ }
    setDismissed(false);
  };

  if (dismissed) {
    return (
      <div className="px-4 md:px-6 pt-3">
        <button
          type="button"
          onClick={restore}
          className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          Show intro
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="Site introduction"
      className="px-4 md:px-6 pt-3 md:pt-4"
    >
      <div className="relative rounded-xl border border-border bg-card p-4 md:p-5">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss intro"
          className="absolute top-2 right-2 inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0 md:pr-8">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-accent mb-1.5">
              Independent · Built for Kenyan investors
            </p>
            <h1 className="text-base md:text-lg font-bold leading-snug text-foreground">
              Compare Kenyan unit trusts, MMFs, NSE stocks and T-Bills using clear data — independent, simple, and built for Kenyan investors.
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button asChild size="sm" className="rounded-full h-9 px-4 text-xs gap-1.5">
              <Link to="/compare">
                <GitCompareArrows className="h-3.5 w-3.5" /> Compare funds
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full h-9 px-4 text-xs gap-1.5">
              <Link to="/portfolio">
                <Briefcase className="h-3.5 w-3.5" /> Track a portfolio
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/60">
          <HeroTile
            to="/funds/mmf-yields"
            icon={Table}
            label="MMF yield table"
            sub="Money Market Fund yields, sortable"
          />
          <HeroTile
            to="/calculator"
            icon={Calculator}
            label="Return calculator"
            sub="Estimate gross & net returns"
          />
          <HeroTile
            to="/portfolio"
            icon={BarChart3}
            label="Portfolio tracker"
            sub="Track a simulated portfolio"
          />
        </div>
      </div>
    </section>
  );
};

const HeroTile = ({
  to, icon: Icon, label, sub,
}: { to: string; icon: any; label: string; sub: string }) => (
  <Link
    to={to}
    className="group flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2.5 hover:border-accent/40 hover:bg-background/70 transition-colors"
  >
    <span className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-accent/10 text-accent shrink-0">
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-xs font-semibold text-foreground truncate">{label}</span>
      <span className="block text-[10px] text-muted-foreground truncate">{sub}</span>
    </span>
    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 group-hover:text-accent transition-colors" />
  </Link>
);

export default HomeHero;
