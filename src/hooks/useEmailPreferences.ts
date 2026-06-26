import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface EmailPreferences {
  instant_alerts: boolean;
  weekly_summary: boolean;
}

export function useEmailPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<EmailPreferences>({ instant_alerts: true, weekly_summary: false });
  const [loading, setLoading] = useState(true);

  const fetchPrefs = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("email_preferences")
      .select("instant_alerts, weekly_summary")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setPrefs({ instant_alerts: data.instant_alerts, weekly_summary: data.weekly_summary });
    } else {
      // Create default preferences
      await supabase.from("email_preferences").insert({ user_id: user.id });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  const updatePref = useCallback(async (key: keyof EmailPreferences, value: boolean) => {
    if (!user) return;
    setPrefs((prev) => ({ ...prev, [key]: value }));
    await supabase.from("email_preferences").update({ [key]: value }).eq("user_id", user.id);
  }, [user]);

  return { prefs, loading, updatePref };
}
