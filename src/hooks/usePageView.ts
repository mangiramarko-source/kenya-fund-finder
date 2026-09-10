import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { safeUUID } from "@/lib/safeUUID";

function getPageViewSessionId() {
  try {
    const storedSessionId = window.sessionStorage.getItem("pv_session");
    if (storedSessionId) return storedSessionId;

    const newSessionId = safeUUID();
    window.sessionStorage.setItem("pv_session", newSessionId);
    return newSessionId;
  } catch {
    // Safari can block website storage. Analytics must never prevent the app
    // itself from mounting, so use a session-only identifier in that case.
    return safeUUID();
  }
}

const sessionId = getPageViewSessionId();

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
