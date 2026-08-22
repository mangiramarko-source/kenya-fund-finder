import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processAuth = async () => {
      // Supabase's client should automatically process the hash if detectSessionInUrl is true.
      // We also do a manual check just in case.
      try {
        const hash = window.location.hash;
        if (hash && hash.includes("access_token=") && hash.includes("refresh_token=")) {
          const params = new URLSearchParams(hash.substring(1));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            
            if (sessionError) {
              setError(sessionError.message || "Failed to establish session.");
              return;
            }
          }
        }
        
        // Wait briefly for Supabase to complete any background session saving
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify we actually got a session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Clear hash and navigate to root
          window.location.hash = "";
          navigate("/", { replace: true });
        } else {
          setError("Failed to retrieve session after authentication.");
        }
      } catch (err: any) {
        setError(err?.message || "Authentication failed");
      }
    };

    processAuth();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive font-semibold">Authentication Error</p>
        <p className="text-muted-foreground text-sm">{error}</p>
        <button 
          onClick={() => navigate("/auth")}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium"
        >
          Return to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <p className="text-sm text-muted-foreground font-medium">Completing sign in...</p>
    </div>
  );
}
