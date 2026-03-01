import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

let sessionId = sessionStorage.getItem("pv_session");
if (!sessionId) {
  sessionId = crypto.randomUUID();
  sessionStorage.setItem("pv_session", sessionId);
}

export const usePageView = () => {
  const location = useLocation();

  useEffect(() => {
    const track = async () => {
      try {
        // Use getSession instead of getUser to avoid unnecessary network call
        // and to work reliably for both authenticated and anonymous users
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id ?? null;

        await supabase.from("page_views").insert({
          page_path: location.pathname,
          user_id: userId,
          session_id: sessionId,
        });
      } catch {
        // Silently fail - don't break the app for analytics
      }
    };
    track();
  }, [location.pathname]);
};
