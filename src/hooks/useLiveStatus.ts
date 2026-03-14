import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useLiveStatus() {
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [lastUpdateDate, setLastUpdateDate] = useState<string | null>(null);
  const [showDate, setShowDateState] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    const { data } = await supabase
      .from("site_pages_public")
      .select("meta")
      .eq("slug", "live-status")
      .single();
    const meta = data?.meta as Record<string, unknown> | null;
    setIsLive(meta?.is_live === true);
    setLastUpdateDate((meta?.last_update_date as string) ?? null);
    setShowDateState(meta?.show_date !== false);
    setLoading(false);
  };

  const toggleLive = async (value: boolean) => {
    setIsLive(value);
    const { data } = await supabase
      .from("site_pages")
      .select("meta")
      .eq("slug", "live-status")
      .single();
    const existing = (data?.meta as Record<string, unknown>) ?? {};
    await supabase
      .from("site_pages")
      .update({ meta: { ...existing, is_live: value } })
      .eq("slug", "live-status");
  };

  const setLastUpdate = async (date: string | null) => {
    setLastUpdateDate(date);
    const { data } = await supabase
      .from("site_pages")
      .select("meta")
      .eq("slug", "live-status")
      .single();
    const existing = (data?.meta as Record<string, unknown>) ?? {};
    await supabase
      .from("site_pages")
      .update({ meta: { ...existing, last_update_date: date } })
      .eq("slug", "live-status");
  };

  const setShowDate = async (value: boolean) => {
    setShowDateState(value);
    const { data } = await supabase
      .from("site_pages")
      .select("meta")
      .eq("slug", "live-status")
      .single();
    const existing = (data?.meta as Record<string, unknown>) ?? {};
    await supabase
      .from("site_pages")
      .update({ meta: { ...existing, show_date: value } })
      .eq("slug", "live-status");
  };

  useEffect(() => { fetchStatus(); }, []);

  return { isLive, loading, toggleLive, lastUpdateDate, setLastUpdate, showDate, setShowDate };
}
