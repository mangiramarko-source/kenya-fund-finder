import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { safeUUID } from "@/lib/safeUUID";

let sessionId = sessionStorage.getItem("pv_session");
if (!sessionId) {
  sessionId = safeUUID();
  sessionStorage.setItem("pv_session", sessionId);
}

export const usePageView = () => {
  const location = useLocation();

  useEffect(() => {
    const track = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user?.id) {
          // Authenticated: insert directly (RLS allows it)
          await supabase.from("page_views").insert({
            page_path: location.pathname,
            user_id: session.user.id,
            session_id: sessionId,
          });
        } else {
          // Anonymous: use backend function (bypasses RLS with service role)
          await supabase.functions.invoke("track-anonymous", {
            headers: { "x-client-key": "kff-v1-track" },
            body: {
              type: "page_view",
              page_path: location.pathname,
              session_id: sessionId,
            },
          });
        }
      } catch {
        // Silently fail - don't break the app for analytics
      }
    };
    track();
  }, [location.pathname]);
};
