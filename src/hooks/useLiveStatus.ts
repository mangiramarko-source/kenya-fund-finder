import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useLiveStatus() {
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    const { data } = await supabase
      .from("site_pages")
      .select("meta")
      .eq("slug", "live-status")
      .single();
    const meta = data?.meta as Record<string, unknown> | null;
    setIsLive(meta?.is_live === true);
    setLoading(false);
  };

  const toggleLive = async (value: boolean) => {
    setIsLive(value);
    await supabase
      .from("site_pages")
      .update({ meta: { is_live: value } })
      .eq("slug", "live-status");
  };

  useEffect(() => { fetchStatus(); }, []);

  return { isLive, loading, toggleLive };
}
