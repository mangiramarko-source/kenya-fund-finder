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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return; // Only track authenticated users

        await supabase.from("page_views").insert({
          page_path: location.pathname,
          user_id: session.user.id,
          session_id: sessionId,
        });
      } catch {
        // Silently fail - don't break the app for analytics
      }
    };
    track();
  }, [location.pathname]);
};
