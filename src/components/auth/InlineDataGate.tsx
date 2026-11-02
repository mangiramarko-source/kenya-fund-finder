import { useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

interface InlineDataGateProps {
  totalCount: number;
  visibleCount?: number;
  title: string;
  description: string;
  category: "funds" | "stocks" | "news" | "rates" | "commodities" | "bonds" | "treasury";
}

export default function InlineDataGate({
  totalCount,
  visibleCount = 3,
  title,
  description,
  category,
}: InlineDataGateProps) {
  const location = useLocation();
  const currentFullPath = `${location.pathname}${location.search}`;
  const remainingCount = Math.max(totalCount - visibleCount, 0);

  const handleGoogleSignIn = useCallback(async () => {
    trackEvent("signup_started", { method: "google", source: `inline_gate_${category}` });
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${currentFullPath}`,
        },
      });
    } catch {
      window.location.href = `/auth?redirect=${encodeURIComponent(currentFullPath)}`;
    }
  }, [category, currentFullPath]);

  return (
    <div className="relative mt-3 p-6 sm:p-8 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-card/80 via-card/95 to-card text-center shadow-xl backdrop-blur-md overflow-hidden animate-in fade-in-50 duration-300">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-lg mx-auto space-y-4">
        {/* Counter Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{remainingCount > 0 ? `${remainingCount}+ More Available` : "Exclusive Member Data"}</span>
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2 max-w-md mx-auto">
          <Button
            onClick={handleGoogleSignIn}
            className="w-full sm:w-auto h-11 px-6 gap-2.5 bg-foreground text-background hover:bg-foreground/90 font-medium text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-[0.99]"
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
            asChild
            className="w-full sm:w-auto h-11 px-6 text-xs sm:text-sm border-border/80 text-foreground rounded-xl hover:bg-muted/40"
          >
            <Link to={`/auth?redirect=${encodeURIComponent(currentFullPath)}`}>
              Continue with Email
            </Link>
          </Button>
        </div>

        {/* Trust badge */}
        <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 pt-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Free forever • No credit card required • Instant access</span>
        </p>
      </div>
    </div>
  );
}
