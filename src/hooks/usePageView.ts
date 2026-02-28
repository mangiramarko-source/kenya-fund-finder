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
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("page_views").insert({
        page_path: location.pathname,
        user_id: user?.id ?? null,
        session_id: sessionId,
      });
    };
    track();
  }, [location.pathname]);
};
