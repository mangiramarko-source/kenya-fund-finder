import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, Mail, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import CloudflareTurnstile from "@/components/CloudflareTurnstile";

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
      return;
    }

    if (isSignUp) {
      const { error } = await signUp(email, password);
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setMessage("Account created! Please check your email to verify your account before signing in.");
        setIsSignUp(false);
        setPassword("");
      }
    } else {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
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
    if (!turnstileToken) {
      setError("Please complete the security check before continuing.");
      return;
    }
    submitAuth(turnstileToken);
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError(result.error.message || "Google sign-in failed");
        setLoading(false);
        return;
      }
      if (result.redirected) {
        return; // Browser will redirect to Google
      }
      // Session set successfully — redirect to home
      navigate("/");
    } catch {
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 rounded-none">
        <CardHeader className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 self-start">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <TrendingUp className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl">{isSignUp ? "Create Account" : "Welcome Back"}</CardTitle>
          <CardDescription>
            {isSignUp ? "Sign up to track your favorite funds" : "Sign in to your Fund Finder account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={handleGoogleSignIn} className="w-full gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              or continue with email
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} className="pl-9" placeholder="you@example.com" autoComplete="email" />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-9 pr-10" placeholder="••••••••" minLength={6} maxLength={128} autoComplete={isSignUp ? "new-password" : "current-password"} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {isSignUp && (
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="confirmPassword" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="pl-9 pr-10" placeholder="••••••••" minLength={6} maxLength={128} autoComplete="new-password" />
                </div>
              </div>
            )}
            {!isSignUp && (
              <div className="flex justify-end">
                <Link to="/reset-password" className="text-xs text-muted-foreground hover:text-accent hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-accent">{message}</p>}
            <CloudflareTurnstile onVerify={handleTurnstileVerify} onExpire={handleTurnstileExpire} onBotFields={handleBotFields} />
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage(""); setConfirmPassword(""); setShowPassword(false); setTurnstileToken(null); }} className="text-accent hover:underline font-medium">
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
