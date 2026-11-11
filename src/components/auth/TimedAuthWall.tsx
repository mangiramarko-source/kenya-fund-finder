import { useCallback, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, CheckCircle2, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { useSoftWallTrigger } from "@/hooks/useSoftWallTrigger";

export default function TimedAuthWall() {
  const { shouldShow, snooze } = useSoftWallTrigger();
  const location = useLocation();

  // Preserves both path and query parameters (e.g. /funds?type=money_market)
  const currentFullPath = `${location.pathname}${location.search}`;

  const handleGoogleSignIn = useCallback(async () => {
    trackEvent("signup_started", { method: "google", source: "timed_soft_wall" });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${currentFullPath}`,
        },
      });
      if (error) {
        window.location.href = `/auth?mode=signup&redirect=${encodeURIComponent(currentFullPath)}`;
      }
    } catch {
      // Fallback redirect to /auth with preserved redirect parameter
      window.location.href = `/auth?mode=signup&redirect=${encodeURIComponent(currentFullPath)}`;
    }
  }, [currentFullPath]);

  const handleMicrosoftSignIn = useCallback(async () => {
    trackEvent("signup_started", { method: "microsoft", source: "timed_soft_wall" });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: `${window.location.origin}${currentFullPath}`,
          scopes: "email profile openid",
        },
      });
      if (error) {
        window.location.href = `/auth?mode=signup&redirect=${encodeURIComponent(currentFullPath)}`;
      }
    } catch {
      window.location.href = `/auth?mode=signup&redirect=${encodeURIComponent(currentFullPath)}`;
    }
  }, [currentFullPath]);

  const handleSnooze = useCallback(() => {
    trackEvent("cta_clicked", { action: "soft_wall_snoozed", path: currentFullPath });
    snooze(10);
  }, [snooze, currentFullPath]);

  // Accessibility: Allow users to dismiss/snooze with the Escape key
  useEffect(() => {
    if (!shouldShow) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSnooze();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shouldShow, handleSnooze]);

  if (!shouldShow) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Unlock full market access"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-card/95 border border-emerald-500/30 shadow-2xl p-5 sm:p-6 space-y-4 backdrop-blur-xl">
        {/* Dismiss / Snooze */}
        <button
          onClick={handleSnooze}
          className="absolute right-3.5 top-3.5 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Maybe later"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Micro-badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-semibold tracking-wide uppercase">
          <Sparkles className="h-3.5 w-3.5" />
          <span>CMA-Regulated Market Data</span>
        </div>

        {/* Headline & Value Proposition */}
        <div className="space-y-1.5 text-left">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
            Stop guessing where your money grows fastest in Kenya.
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Create a free account to track 30+ unit trusts, compare real net yields after taxes, and monitor your personal portfolio.
          </p>
        </div>

        {/* 3 Core Pain-Point Solutions */}
        <div className="space-y-2.5 pt-1 text-left text-xs">
          <div className="flex items-start gap-2.5 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground">Real Net Yields:</strong> Compare returns after 15% withholding tax & fund fees across 30+ funds.
            </div>
          </div>
          <div className="flex items-start gap-2.5 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground">Yield Drop & Rate Alerts:</strong> Never miss when a fund lowers its rate or a competitor raises payouts.
            </div>
          </div>
          <div className="flex items-start gap-2.5 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground">Saved Portfolio:</strong> Track your MMFs, NSE stocks, and CBK T-bills across devices.
            </div>
          </div>
        </div>

        {/* CTA Stack */}
        <div className="space-y-2.5 pt-2">
          <Button
            onClick={handleGoogleSignIn}
            className="w-full h-11 gap-2.5 bg-foreground text-background hover:bg-foreground/90 font-medium text-sm rounded-xl transition-all shadow-md active:scale-[0.99]"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <Button
            variant="outline"
            onClick={handleMicrosoftSignIn}
            className="w-full h-11 gap-2.5 bg-card/60 hover:bg-card border-border/80 text-foreground font-medium text-sm rounded-xl transition-all shadow-sm active:scale-[0.99]"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            Continue with Microsoft
          </Button>

          <Button
            variant="outline"
            asChild
            className="w-full h-10 text-xs border-border/80 text-foreground rounded-xl hover:bg-muted/40"
          >
            <Link to={`/auth?mode=signup&redirect=${encodeURIComponent(currentFullPath)}`}>
              Continue with Email or Sign In
            </Link>
          </Button>
        </div>

        {/* Footer reassurance & Snooze Link */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 px-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> No spam
          </span>
          <button
            onClick={handleSnooze}
            className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Preview 1 more page
          </button>
        </div>
      </div>
    </div>
  );
}
