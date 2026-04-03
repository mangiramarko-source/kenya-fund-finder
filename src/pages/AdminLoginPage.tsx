import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, TrendingUp } from "lucide-react";
import CloudflareTurnstile from "@/components/CloudflareTurnstile";

const AdminLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const botFieldsRef = useRef<{ honeypot: string; formLoadedAt: number }>({ honeypot: "", formLoadedAt: Date.now() });
  const { signIn } = useAuth();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!turnstileToken) {
      setError("Please complete the security verification");
      return;
    }

    setLoading(true);

    try {
      const { data, error: verifyError } = await supabase.functions.invoke("verify-turnstile", {
        body: {
          token: turnstileToken,
          honeypot: botFieldsRef.current.honeypot,
          formLoadedAt: botFieldsRef.current.formLoadedAt,
        },
      });
      if (verifyError || !data?.success) {
        setError(data?.error || "Security verification failed. Please try again.");
        setTurnstileToken(null);
        setLoading(false);
        return;
      }
    } catch {
      setError("Security verification failed. Please try again.");
      setTurnstileToken(null);
      setLoading(false);
      return;
    }

    const { error } = await signIn(email, password);
    setLoading(false);
    setTurnstileToken(null);
    if (error) {
      setError(error.message);
    } else {
      navigate("/admin");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <TrendingUp className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl">Admin Login</CardTitle>
          <CardDescription>Sign in to manage Kenya Fund Finder</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} className="mt-1" autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={128} className="mt-1" autoComplete="current-password" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <CloudflareTurnstile onVerify={handleTurnstileVerify} onExpire={handleTurnstileExpire} onBotFields={handleBotFields} />
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading || !turnstileToken}>
              <Lock className="mr-2 h-4 w-4" />
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLoginPage;
