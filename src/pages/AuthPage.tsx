import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp, Mail, Lock, ArrowLeft, Eye, EyeOff, Sparkles,
  ShieldCheck, Zap, BarChart3, ChevronRight, CheckCircle2, AlertCircle, ArrowRight
} from "lucide-react";
import CloudflareTurnstile from "@/components/CloudflareTurnstile";
import {
  isTurnstileDevBypassEnabled,
  TURNSTILE_DEV_BYPASS_TOKEN,
} from "@/lib/turnstile-dev";
import { trackEvent } from "@/lib/analytics";

const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const botFieldsRef = useRef<{ honeypot: string; formLoadedAt: number }>({ honeypot: "", formLoadedAt: Date.now() });
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const handleBotFields = useCallback((fields: { honeypot: string; formLoadedAt: number }) => {
    botFieldsRef.current = fields;
  }, []);

  const verifyTurnstile = async (token: string): Promise<boolean> => {
    if (isTurnstileDevBypassEnabled() && token === TURNSTILE_DEV_BYPASS_TOKEN) {
      return true;
    }
    try {
      const { data, error } = await supabase.functions.invoke("verify-turnstile", {
        body: {
          token,
          honeypot: botFieldsRef.current.honeypot,
          formLoadedAt: botFieldsRef.current.formLoadedAt,
        },
      });
      if (error) return false;
      return data?.success === true;
    } catch {
      return false;
    }
  };

  const submitAuth = useCallback(async (token: string) => {
    setError("");
    setMessage("");

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const verified = await verifyTurnstile(token);
    if (!verified) {
      setError("Security verification failed. Please try again.");
      setTurnstileToken(null);
      setLoading(false);
    }

    if (isSignUp) {
      const { error } = await signUp(email, password);
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        trackEvent("signup_completed", { method: "email" });
        setMessage("Account created! Please check your email to verify your account before signing in. You'll choose optional email updates after sign-in.");
        setIsSignUp(false);
        setPassword("");
      }
    } else {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        trackEvent("login_completed", { method: "email" });
        navigate("/");
      }
    }
    setTurnstileToken(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignUp, email, password, confirmPassword, signIn, signUp, navigate]);

  // Auto-submit when Turnstile verification completes (after fields are filled)
  useEffect(() => {
    if (!turnstileToken || loading) return;
    if (!email || !password) return;
    if (isSignUp && !confirmPassword) return;
    submitAuth(turnstileToken);
  }, [turnstileToken, loading, email, password, confirmPassword, isSignUp, submitAuth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      trackEvent("signup_started", { method: "email" });
    }
    if (!turnstileToken) {
      setError("Please complete the security check before continuing.");
      return;
    }
    submitAuth(turnstileToken);
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    trackEvent("signup_started", { method: "google" });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) {
        setError(error.message || "Google sign-in failed");
        setLoading(false);
      }
    } catch {
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    // Instant demo access: navigate directly to main dashboard
    navigate("/");
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-[calc(100vh-5rem)] flex items-center justify-center py-6 lg:py-8 px-3.5 sm:px-4 relative">
      {/* Background ambient lighting - constrained on mobile to prevent horizontal overflow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[280px] sm:w-[550px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -z-10 overflow-hidden" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center lg:-translate-y-4">
        
        {/* Left Side: Brand & Feature Showcase (Desktop - Unchanged) */}
        <div className="lg:col-span-6 space-y-6 text-left hidden lg:block pr-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            Kenya's Premier Wealth Platform
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-foreground">
              Master Your Money with <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">Fund Finder</span>
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
              Real-time yields for 40+ Money Market Funds, NSE stocks, Treasury Bills, and FX rates—all in one intelligent financial dashboard.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-card/60 backdrop-blur-md border border-border/50 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <Zap className="h-4 w-4" />
                Daily MMF Yields
              </div>
              <p className="text-xs text-muted-foreground">Real-time daily rates across 40+ CMA-licensed fund managers.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-card/60 backdrop-blur-md border border-border/50 space-y-1">
              <div className="flex items-center gap-2 text-teal-400 text-xs font-bold">
                <BarChart3 className="h-4 w-4" />
                NSE Stock Insights
              </div>
              <p className="text-xs text-muted-foreground">Detailed financials, disclosures & market movers.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-card/60 backdrop-blur-md border border-border/50 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <ShieldCheck className="h-4 w-4" />
                CMA Licensed
              </div>
              <p className="text-xs text-muted-foreground">Verified public financial data & transparent metrics.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-card/60 backdrop-blur-md border border-border/50 space-y-1">
              <div className="flex items-center gap-2 text-teal-400 text-xs font-bold">
                <TrendingUp className="h-4 w-4" />
                Yield Calculator
              </div>
              <p className="text-xs text-muted-foreground">Project returns with compound interest analysis.</p>
            </div>
          </div>

          {/* Instant Demo Access Box */}
          <div className="pt-2">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-card/80 to-card/60 border border-emerald-500/30 backdrop-blur-md flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  Want to explore right now?
                </p>
                <p className="text-[11px] text-muted-foreground">No account or password required to test.</p>
              </div>
              <Button onClick={handleDemoMode} size="sm" variant="outline" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 gap-1 text-xs">
                Demo Mode <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Page Container (Cover UI on Mobile, Card UI on Desktop) */}
        <div className="lg:col-span-6 w-full max-w-sm mx-auto">
          <div className="relative overflow-hidden lg:rounded-2xl lg:bg-card/90 lg:backdrop-blur-xl lg:border lg:border-border/80 lg:shadow-2xl lg:p-5 lg:py-4">
            
            {/* Top Navigation Row: Back Button (Hidden on Desktop) */}
            <div className="flex items-center justify-between pt-1 mb-5 lg:mb-0 lg:hidden">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="h-10 w-10 rounded-full bg-card/80 border border-border/60 text-foreground flex items-center justify-center hover:bg-card transition-colors shadow-sm"
                aria-label="Back to home"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 lg:space-y-3.5">
              {/* Brand Logo & Name Header */}
              <div className="flex flex-col items-center justify-center text-center space-y-2 lg:space-y-1.5 pt-1">
                <div className="flex items-center justify-center gap-3 lg:gap-2.5">
                <div className="flex h-12 w-12 lg:h-10 lg:w-10 items-center justify-center rounded-2xl lg:rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 shadow-inner">
                  <TrendingUp className="h-6 w-6 lg:h-5 lg:w-5" />
                </div>
                <div className="text-left">
                  <div className="text-xl lg:text-lg font-bold tracking-tight text-foreground leading-tight">
                    Kenya<span className="text-emerald-400">FundFinder</span>
                  </div>
                  <p className="text-[11px] lg:text-[10px] text-muted-foreground font-medium tracking-wide">
                    Compare. Invest. Grow.
                  </p>
                </div>
              </div>

              <div className="pt-2 lg:pt-1 space-y-1 lg:space-y-0.5">
                <h2 className="text-2xl lg:text-xl font-bold tracking-tight text-foreground">
                  {isSignUp ? "Create account" : "Welcome back"}
                </h2>
                <p className="text-xs lg:text-[11px] text-muted-foreground">
                  {isSignUp ? "Join thousands tracking wealth across Kenya" : "Sign in to continue tracking the markets"}
                </p>
                {isSignUp && <p className="text-xs text-muted-foreground pt-1">Optional email updates start off. Choose what you'd like after sign-in.</p>}
              </div>
            </div>

            {/* Google OAuth Button */}
            <div className="space-y-3 lg:space-y-2.5 pt-1 lg:pt-0">
              <Button
                variant="outline"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-11 lg:h-10 gap-2.5 bg-card/50 hover:bg-card border-border/80 text-foreground font-medium text-sm rounded-xl lg:rounded-lg transition-all shadow-sm active:scale-[0.99]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>

              <div className="relative flex items-center justify-center my-2 lg:my-1.5">
                <Separator className="bg-border/60" />
                <span className="absolute bg-background px-3 text-xs text-muted-foreground">
                  or
                </span>
              </div>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 lg:space-y-2.5">
              <div className="space-y-1.5 lg:space-y-1 text-left">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Mail className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Email address</span>
                </div>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={255}
                  className="h-11 lg:h-10 bg-card/60 border-border/80 focus-visible:ring-emerald-500/40 text-sm rounded-xl lg:rounded-lg px-3.5"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5 lg:space-y-1 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Lock className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Password</span>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 lg:h-10 bg-card/60 border-border/80 focus-visible:ring-emerald-500/40 text-sm rounded-xl lg:rounded-lg px-3.5 pr-10"
                    placeholder="••••••••"
                    minLength={6}
                    maxLength={128}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {!isSignUp && (
                  <div className="flex justify-end pt-0.5">
                    <Link to="/reset-password" className="text-xs text-emerald-400 hover:underline font-medium">
                      Forgot password?
                    </Link>
                  </div>
                )}
              </div>

              {isSignUp && (
                <div className="space-y-1.5 lg:space-y-1 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Lock className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Confirm Password</span>
                  </div>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-11 lg:h-10 bg-card/60 border-border/80 focus-visible:ring-emerald-500/40 text-sm rounded-xl lg:rounded-lg px-3.5 pr-10"
                    placeholder="••••••••"
                    minLength={6}
                    maxLength={128}
                    autoComplete="new-password"
                  />
                </div>
              )}

              {/* Status alerts */}
              {error && (
                <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {message && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{message}</span>
                </div>
              )}

              {/* Cloudflare Turnstile section - Preserved as requested */}
              <div className="pt-1 lg:pt-0 flex justify-center scale-90 sm:scale-95 lg:scale-[0.85] origin-center -my-1 lg:-my-2 max-w-full overflow-hidden">
                <CloudflareTurnstile onVerify={handleTurnstileVerify} onExpire={handleTurnstileExpire} onBotFields={handleBotFields} />
              </div>

              {/* Main Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 lg:h-11 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base lg:text-sm rounded-xl lg:rounded-lg shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <span>{loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </form>

            {/* Toggle Sign In / Sign Up */}
            <div className="pt-2 lg:pt-1 text-center">
              <p className="text-xs text-muted-foreground">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError("");
                    setMessage("");
                    setConfirmPassword("");
                    setShowPassword(false);
                    setTurnstileToken(null);
                  }}
                  className="text-emerald-400 font-semibold hover:underline ml-1"
                >
                  {isSignUp ? "Sign In" : "Sign up free"}
                </button>
              </p>
            </div>

            {/* Bottom Trust Badge */}
            <div className="pt-3 lg:pt-1.5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-400/80" />
              <span>Trusted by investors across Kenya</span>
            </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;
