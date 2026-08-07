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
      <DialogContent className="max-w-[380px] p-0 overflow-hidden rounded-3xl border-border bg-card">
        <div className="p-5">
          {/* Card head: icon chip + status pill */}
          <div className="flex items-center justify-between">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/25 text-primary">
              <PieChart className="h-5 w-5" />
            </span>
            <span className="rounded-full border border-warning/40 bg-warning/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-warning">
              Independent
            </span>
          </div>

          <h2 className="mt-4 text-[22px] font-semibold leading-[1.15] tracking-tight text-foreground">
            Kenyan markets,
            <br />
            in one dashboard.
          </h2>

          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            NSE stocks, MMFs, unit trusts, T-Bills, FX and commodities — neutral
            data, no noise.
          </p>

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2">
            <Button
              asChild
              className="h-11 w-full rounded-2xl gap-2 text-sm font-semibold"
              onClick={handleNavigate}
            >
              <Link to="/portfolio">
                <LayoutDashboard className="h-4 w-4" /> Start portfolio tracker
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="h-11 w-full rounded-2xl gap-2 text-sm font-medium bg-muted/40 hover:bg-muted/70"
              onClick={handleNavigate}
            >
              <Link to="/overview">
                <Search className="h-4 w-4" /> Browse market data
              </Link>
            </Button>
          </div>

          <div className="my-4 h-px bg-border/60" />

          <div className="flex flex-col">
            <HeroTile
              to="/funds"
              icon={TrendingUp}
              label="Unit Trusts & MMFs"
              sub="Historical rates & categories"
              onClick={handleNavigate}
            />
            <HeroTile
              to="/overview"
              icon={CircleDollarSign}
              label="Stocks, T-Bills & FX"
              sub="NSE pricing & treasury yields"
              onClick={handleNavigate}
            />
            <HeroTile
              to="/news"
              icon={Newspaper}
              label="Commodities & News"
              sub="Global benchmarks & updates"
              onClick={handleNavigate}
            />
          </div>
        </div>

        <div className="border-t border-border/60 bg-muted/20 px-5 py-3">
          <p className="text-center text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
            No investment advice · Purely data-driven
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const HeroTile = ({
  to,
  icon: Icon,
  label,
  sub,
  onClick,
}: {
  to: string;
  icon: any;
  label: string;
  sub: string;
  onClick?: () => void;
}) => (
  <Link
    to={to}
    onClick={onClick}
    className="group -mx-1 flex items-center gap-3 rounded-2xl px-1 py-2.5 transition-colors active:bg-muted/50"
  >
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-primary">
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[13px] font-semibold text-foreground">
        {label}
      </span>
      <span className="block truncate text-[11px] text-muted-foreground">
        {sub}
      </span>
    </span>
    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
  </Link>
);


export default HomeHero;
