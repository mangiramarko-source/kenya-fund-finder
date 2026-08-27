import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { trackEvent } from "@/lib/analytics";
import { useEmailPreferences } from "@/hooks/useEmailPreferences";
import { useLiveAssets } from "@/hooks/usePortfolio";
import OnboardingSetup, { type OnboardingAsset } from "@/components/onboarding/OnboardingSetup";
import { buildOnboardingAssets, portfolioItemFromOnboardingAsset, watchlistType } from "@/components/onboarding/onboardingAssets";
import { supabase } from "@/integrations/supabase/client";

const SESSION_SHOWN_KEY = "kff_intro_shown_session_v1";
const SIGNIN_SHOWN_PREFIX = "kff_intro_signin_shown_";

/**
 * Intro popup. Shown automatically:
 *  - Once per browser session, after the user has answered the cookie banner.
 *  - Once per signed-in user when they log in (per session).
 * Manual close dismisses it for the session.
 */
const LegacyHomeHero = () => {
  const { choice } = useConsent();
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const lastUserIdRef = useRef<string | null>(null);
  const isIntroRoute = location.pathname === "/" || location.pathname === "/overview";

  useEffect(() => {
    if (!isIntroRoute) setOpen(false);
  }, [isIntroRoute]);

  // Open after cookie consent answered (once per session)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isIntroRoute) return;
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
  }, [choice, isIntroRoute]);

  // Open on sign-in (once per user per session)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isIntroRoute) return;
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
  }, [user?.id, isIntroRoute]);

  const navigate = useNavigate();

  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string, label: string) => {
    e.preventDefault();
    trackEvent("cta_clicked", {
      cta_label: label,
      destination: path,
      source_component: "home_hero_modal",
    });
    setOpen(false);
    setTimeout(() => {
      navigate(path);
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-[380px] gap-5 sm:gap-6 rounded-[2rem] sm:rounded-[2.5rem] border-border/70 bg-card p-5 sm:p-6">
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
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Kenya Fund Finder
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
            Unified access to Kenyan markets. Monitor yields, equities and macro
            data in one dashboard.
          </DialogDescription>
        </div>

        {/* Primary actions */}
        <div className="flex flex-col gap-3">
          <Button
            asChild
            className="h-12 w-full rounded-2xl gap-2 text-sm font-semibold transition-transform active:scale-95"
          >
            <a href="/portfolio" onClick={(e) => handleNavigate(e, "/portfolio", "Start portfolio tracker")}>
              <LayoutDashboard className="h-4 w-4" /> Start portfolio tracker
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 w-full rounded-2xl gap-2 border-border bg-transparent text-sm font-medium transition-transform active:scale-95"
          >
            <a href="/overview" onClick={(e) => handleNavigate(e, "/overview", "Browse market data")}>
              <Search className="h-4 w-4" /> Browse market data
            </a>
          </Button>
        </div>

        {/* Destination rows */}
        <div className="flex flex-col">
          <HeroTile
            to="/funds"
            label="Unit Trusts & MMFs"
            sub="Yield focus"
            meta="Rates"
            onClick={(e) => handleNavigate(e, "/funds", "Unit Trusts & MMFs")}
            divider
          />
          <HeroTile
            to="/stocks"
            label="Stocks, T-Bills & FX"
            sub="NSE markets"
            meta="Prices"
            onClick={(e) => handleNavigate(e, "/stocks", "Stocks, T-Bills & FX")}
            divider
          />
          <HeroTile
            to="/commodities"
            label="Commodities & News"
            sub="Macro data"
            meta="Live"
            onClick={(e) => handleNavigate(e, "/commodities", "Commodities & News")}
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
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  divider?: boolean;
}) => (
  <a
    href={to}
    onClick={onClick}
    className={`group flex items-center justify-between py-3 sm:py-4 transition-colors active:bg-muted/40 ${
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
  </a>
);


// Keyed by account so a different sign-in never inherits another user's draft.
function SignedInIntroduction({ userId }: { userId: string }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { loading, needsWelcome, saving, saveEmailChoices, completeWelcome } = useEmailPreferences();
  const [started, setStarted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isIntroRoute = pathname === "/" || pathname === "/overview";
  const { data: liveAssets, isLoading: assetsLoading } = useLiveAssets(needsWelcome && isIntroRoute);
  const assets = useMemo(() => buildOnboardingAssets(liveAssets), [liveAssets]);

  // Retain the success screen after the saved preference invalidates needsWelcome.
  useEffect(() => {
    if (needsWelcome && isIntroRoute && !dismissed) setStarted(true);
  }, [needsWelcome, isIntroRoute, dismissed]);

  const saveSetup = async (draft: {
    priceAlertEmail: boolean;
    marketBriefEmail: boolean;
    watchlist: OnboardingAsset[];
    portfolioAsset: OnboardingAsset | null;
    portfolioAmount: number | null;
  }) => {
    if (!await saveEmailChoices({
      price_alert_email: draft.priceAlertEmail,
      market_brief_email: draft.marketBriefEmail,
    })) return false;

    const watchlistRows = draft.watchlist.map((asset, index) => {
      const itemType = watchlistType(asset);
      if (!itemType || !asset.databaseId) return null;
      return { user_id: userId, item_type: itemType, item_id: asset.databaseId, item_name: asset.name, sort_order: index };
    });
    if (watchlistRows.some((row) => row === null)) return false;
    if (watchlistRows.length) {
      const { error } = await supabase.from("user_watchlist").upsert(
        watchlistRows as { user_id: string; item_type: "fund" | "stock" | "currency" | "commodity"; item_id: string; item_name: string; sort_order: number }[],
        { onConflict: "user_id,item_type,item_id", ignoreDuplicates: true },
      );
      if (error) return false;
    }

    if (draft.portfolioAsset && draft.portfolioAmount) {
      const item = portfolioItemFromOnboardingAsset(draft.portfolioAsset, draft.portfolioAmount);
      if (!item) return false;
      let existingQuery = supabase.from("mock_portfolios").select("id").eq("user_id", userId).eq("asset_type", item.asset_type).limit(1);
      existingQuery = item.asset_id
        ? existingQuery.eq("asset_id", item.asset_id)
        : existingQuery.eq("asset_name", item.asset_name);
      const { data: existing, error: existingError } = await existingQuery.maybeSingle();
      if (existingError) return false;
      if (!existing) {
        const { data: savedHolding, error: portfolioError } = await supabase.from("mock_portfolios").insert({
          user_id: userId,
          asset_type: item.asset_type,
          asset_name: item.asset_name,
          ticker: item.ticker ?? null,
          asset_id: item.asset_id ?? null,
          units: item.units,
          buy_price: item.buy_price,
          current_price: item.current_price,
          current_yield: item.current_yield ?? 0,
          buy_date: item.buy_date ?? new Date().toISOString(),
          notes: "",
        }).select("id").single();
        if (portfolioError || !savedHolding) return false;
        void supabase.from("portfolio_events").insert({
          user_id: userId,
          portfolio_holding_id: savedHolding.id,
          asset_id: item.asset_id ?? null,
          asset_type: item.asset_type,
          asset_name: item.asset_name,
          event_type: "add",
          amount: item.units * item.buy_price,
          quantity: item.units,
          note: "Created during new-user setup",
        });
      }
    }

    return completeWelcome();
  };

  const dismiss = () => {
    if (saving) return;
    setDismissed(true);
    try {
      sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
      sessionStorage.setItem(SIGNIN_SHOWN_PREFIX + userId, "1");
    } catch { /* Dismissal still works when browser storage is unavailable. */ }
  };

  if (loading || dismissed) return null;
  if (!needsWelcome && !started) return <LegacyHomeHero />;
  return (
    <Dialog open={isIntroRoute} onOpenChange={next => { if (!next) dismiss(); }}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[480px] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-background p-5 sm:p-7">
        {assetsLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading available assets…</p> : <OnboardingSetup assets={assets} onComplete={saveSetup} onExplore={dismiss} onCreateAlert={() => { dismiss(); navigate("/alerts?create=1"); }} />}
      </DialogContent>
    </Dialog>
  );
}

export default function HomeHero() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <SignedInIntroduction key={user.id} userId={user.id} /> : <LegacyHomeHero />;
}
