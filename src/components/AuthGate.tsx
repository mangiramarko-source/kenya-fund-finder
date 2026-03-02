import { Link, useLocation } from "react-router-dom";
import { Lock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface AuthGateProps {
  title?: string;
  description?: string;
  source?: string;
}

const getSessionId = () => {
  let id = sessionStorage.getItem("pv_session");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("pv_session", id);
  }
  return id;
};

const AuthGate = ({
  title = "Sign up to unlock full access",
  description = "Create a free account to view detailed fund information, use the investment calculator, and read full news articles.",
  source = "unknown",
}: AuthGateProps) => {
  const location = useLocation();

  const trackClick = async (action: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        // Authenticated: insert directly
        await supabase.from("auth_gate_clicks").insert({
          source,
          action,
          session_id: getSessionId(),
          page_path: location.pathname,
        });
      } else {
        // Anonymous: use backend function
        await supabase.functions.invoke("track-anonymous", {
          body: {
            type: "auth_gate_click",
            page_path: location.pathname,
            session_id: getSessionId(),
            source,
            action,
          },
        });
      }
    } catch {
      // Silently fail
    }
  };

  return (
    <div className="relative rounded-2xl border-2 border-dashed border-accent/30 bg-gradient-to-b from-accent/5 to-transparent p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
        <Lock className="h-7 w-7 text-accent" />
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">{description}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8" onClick={() => trackClick("signup")}>
          <Link to="/auth">
            <TrendingUp className="mr-2 h-4 w-4" /> Sign Up Free
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full px-8" onClick={() => trackClick("signin")}>
          <Link to="/auth">Already have an account? Sign In</Link>
        </Button>
      </div>
    </div>
  );
};

export default AuthGate;
