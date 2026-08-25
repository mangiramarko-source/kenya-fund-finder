import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface EmailPreferences {
  price_alert_email: boolean;
  price_alert_inapp: boolean;
  market_brief_email: boolean;
}

export function useEmailPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<EmailPreferences>({
    price_alert_email: true,
    price_alert_inapp: true,
    market_brief_email: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchPrefs = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("communication_preferences")
      .select("price_alert_email, price_alert_inapp, market_brief_email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) setPrefs(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  const updatePref = useCallback(async (key: keyof EmailPreferences, value: boolean) => {
    if (!user) return;
    setPrefs((prev) => ({ ...prev, [key]: value }));
    const { error } = await supabase
      .from("communication_preferences")
      .update({ [key]: value })
      .eq("user_id", user.id);
    if (error) {
      setPrefs((prev) => ({ ...prev, [key]: !value }));
    }
  }, [user]);

  return { prefs, loading, updatePref };
}
