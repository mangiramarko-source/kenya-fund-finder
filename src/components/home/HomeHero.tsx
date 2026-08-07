import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ArrowRight,
  LayoutDashboard,
  Search,
  TrendingUp,
  CircleDollarSign,
  Newspaper,
  PieChart,
} from "lucide-react";
import { useConsent } from "@/hooks/useConsent";
import { useAuth } from "@/hooks/useAuth";

const SESSION_SHOWN_KEY = "kff_intro_shown_session_v1";
const SIGNIN_SHOWN_PREFIX = "kff_intro_signin_shown_";

/**
 * Intro popup. Shown automatically:
 *  - Once per browser session, after the user has answered the cookie banner.
 *  - Once per signed-in user when they log in (per session).
 * Manual close dismisses it for the session.
 */
const HomeHero = () => {
  const { choice } = useConsent();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Open after cookie consent answered (once per session)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!choice) return; // wait for cookie banner action
    try {
      if (sessionStorage.getItem(SESSION_SHOWN_KEY) === "1") return;
      sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
      // Small delay so it doesn't collide with consent banner fade-out
      const t = setTimeout(() => setOpen(true), 350);
      return () => clearTimeout(t);
    } catch {
      setOpen(true);
    }
  }, [choice]);

  // Open on sign-in (once per user per session)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const uid = user?.id ?? null;
    const prev = lastUserIdRef.current;
    lastUserIdRef.current = uid;
    if (!uid || prev === uid) return; // only on transition into a new signed-in id
    try {
      const key = SIGNIN_SHOWN_PREFIX + uid;
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
      setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [user?.id]);

  const handleNavigate = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[380px] gap-6 rounded-[2.5rem] border-border/70 bg-card p-6">
        {/* Header row: icon chip + status pill */}
        <div className="flex items-start justify-between">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PieChart className="h-5 w-5" />
          </span>
          <span className="rounded-full border border-warning/30 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-warning">
            Market Data
          </span>
        </div>

        {/* Headline */}
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Kenya Fund Finder
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Unified access to Kenyan markets. Monitor yields, equities and macro
            data in one dashboard.
          </p>
        </div>

        {/* Primary actions */}
        <div className="flex flex-col gap-3">
          <Button
            asChild
            className="h-12 w-full rounded-2xl gap-2 text-sm font-semibold transition-transform active:scale-95"
            onClick={handleNavigate}
          >
            <Link to="/portfolio">
              <LayoutDashboard className="h-4 w-4" /> Start portfolio tracker
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 w-full rounded-2xl gap-2 border-border bg-transparent text-sm font-medium transition-transform active:scale-95"
            onClick={handleNavigate}
          >
            <Link to="/overview">
              <Search className="h-4 w-4" /> Browse market data
            </Link>
          </Button>
        </div>

        {/* Destination rows */}
        <div className="flex flex-col">
          <HeroTile
            to="/funds"
            label="Unit Trusts & MMFs"
            sub="Yield focus"
            meta="Rates"
            onClick={handleNavigate}
            divider
          />
          <HeroTile
            to="/overview"
            label="Stocks, T-Bills & FX"
            sub="NSE markets"
            meta="Prices"
            onClick={handleNavigate}
            divider
          />
          <HeroTile
            to="/news"
            label="Commodities & News"
            sub="Macro data"
            meta="Live"
            onClick={handleNavigate}
          />
        </div>

        {/* Footer disclaimer */}
        <p className="text-center text-[10px] leading-tight text-muted-foreground/80">
          Data provided for informational purposes only. This platform does not
          provide financial advice or fund rankings. Investments carry risk.
        </p>
      </DialogContent>
    </Dialog>
  );
};

const HeroTile = ({
  to,
  label,
  sub,
  meta,
  onClick,
  divider,
}: {
  to: string;
  label: string;
  sub: string;
  meta: string;
  onClick?: () => void;
  divider?: boolean;
}) => (
  <Link
    to={to}
    onClick={onClick}
    className={`group flex items-center justify-between py-4 transition-colors active:bg-muted/40 ${
      divider ? "border-b border-border/40" : ""
    }`}
  >
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-sm font-medium text-foreground">
        {label}
      </span>
      <span className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">
        {sub}
      </span>
    </span>
    <span className="flex shrink-0 items-center gap-2">
      <span className="font-mono text-xs font-medium uppercase text-success">
        {meta}
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground/60 transition-colors group-hover:text-primary" />
    </span>
  </Link>
);


export default HomeHero;
