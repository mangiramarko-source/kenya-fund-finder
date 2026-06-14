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
      <DialogContent className="max-w-md p-0 overflow-hidden border-border bg-card">
        <div className="p-5 md:p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-3">
            Independent · Built for Kenyan investors
          </p>

          <h2 className="text-lg md:text-xl font-semibold leading-tight text-foreground pr-6">
            Your personal dashboard for Kenyan markets.
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Track your NSE stocks, MMFs, and unit trusts in one view. Monitor
            T-Bills, FX, commodities and market news with neutral, independent
            data.
          </p>

          <div className="flex flex-col gap-2 mt-5">
            <Button
              asChild
              className="w-full h-11 rounded-xl gap-2 text-sm font-medium"
              onClick={handleNavigate}
            >
              <Link to="/portfolio">
                <LayoutDashboard className="h-4 w-4" /> Start portfolio tracker
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full h-11 rounded-xl gap-2 text-sm font-medium"
              onClick={handleNavigate}
            >
              <Link to="/overview">
                <Search className="h-4 w-4" /> Browse market data
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2.5 mt-6">
            <HeroTile
              to="/funds"
              icon={TrendingUp}
              label="Unit Trusts & MMFs"
              sub="Compare historical rates and fund categories."
              onClick={handleNavigate}
            />
            <HeroTile
              to="/overview"
              icon={CircleDollarSign}
              label="Stocks, T-Bills & FX"
              sub="NSE pricing, treasury yields and currency rates."
              onClick={handleNavigate}
            />
            <HeroTile
              to="/news"
              icon={Newspaper}
              label="Commodities & News"
              sub="Global benchmark pricing and market updates."
              onClick={handleNavigate}
            />
          </div>
        </div>

        <div className="bg-muted/40 border-t border-border px-5 py-3">
          <p className="text-[10px] text-center text-muted-foreground uppercase tracking-wider">
            No investment advice · Purely data-driven insights
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
    className="group flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2.5 hover:border-accent/40 hover:bg-background/70 transition-colors"
  >
    <span className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-accent/10 text-accent shrink-0">
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-foreground truncate">
        {label}
      </span>
      <span className="block text-xs text-muted-foreground truncate">
        {sub}
      </span>
    </span>
    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 group-hover:text-accent transition-colors" />
  </Link>
);

export default HomeHero;
