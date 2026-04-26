import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AssetSection = "funds" | "stocks" | "rates" | "commodities" | "overview";

interface SectionStatus {
  is_live: boolean;
  last_update_date: string | null;
}

// Module-level cache to deduplicate concurrent fetches from multiple hook instances
let liveStatusFetchPromise: Promise<{ meta: unknown } | null> | null = null;


  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [lastUpdateDate, setLastUpdateDate] = useState<string | null>(null);
  const [showDate, setShowDateState] = useState<boolean>(true);
  const [sections, setSections] = useState<Record<AssetSection, SectionStatus>>({
    funds: { is_live: false, last_update_date: null },
    stocks: { is_live: false, last_update_date: null },
    rates: { is_live: false, last_update_date: null },
    commodities: { is_live: false, last_update_date: null },
    overview: { is_live: false, last_update_date: null },
  });
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    // Deduplicate concurrent requests across hook instances on the same page load
    if (!liveStatusFetchPromise) {
      liveStatusFetchPromise = supabase
        .from("site_pages_public")
        .select("meta")
        .eq("slug", "live-status")
        .single()
        .then((res) => res.data);
      // Clear cache shortly after so subsequent navigations get fresh data
      setTimeout(() => { liveStatusFetchPromise = null; }, 30000);
    }
    const data = await liveStatusFetchPromise;
    const meta = data?.meta as Record<string, unknown> | null;
    setIsLive(meta?.is_live === true);
    setLastUpdateDate((meta?.last_update_date as string) ?? null);
    setShowDateState(meta?.show_date !== false);

    // Load per-section status
    const secs = (meta?.sections as Record<string, SectionStatus>) ?? {};
    setSections({
      funds: secs.funds ?? { is_live: meta?.is_live === true, last_update_date: (meta?.last_update_date as string) ?? null },
      stocks: secs.stocks ?? { is_live: false, last_update_date: null },
      rates: secs.rates ?? { is_live: false, last_update_date: null },
      commodities: secs.commodities ?? { is_live: false, last_update_date: null },
      overview: secs.overview ?? { is_live: false, last_update_date: null },
    });
    setLoading(false);
  };

  const updateMeta = async (patch: Record<string, unknown>) => {
    const { data } = await supabase
      .from("site_pages")
      .select("meta")
      .eq("slug", "live-status")
      .single();
    const existing = (data?.meta as Record<string, unknown>) ?? {};
    const merged = { ...existing, ...patch };
    await supabase
      .from("site_pages")
      .update({ meta: merged as any })
      .eq("slug", "live-status");
  };

  const toggleLive = async (value: boolean) => {
    setIsLive(value);
    await updateMeta({ is_live: value });
  };

  const setLastUpdate = async (date: string | null) => {
    setLastUpdateDate(date);
    await updateMeta({ last_update_date: date });
  };

  const setShowDate = async (value: boolean) => {
    setShowDateState(value);
    await updateMeta({ show_date: value });
  };

  const setSectionStatus = async (section: AssetSection, status: Partial<SectionStatus>) => {
    const updated = { ...sections[section], ...status };
    const newSections = { ...sections, [section]: updated };
    setSections(newSections);
    await updateMeta({ sections: newSections });
  };

  useEffect(() => { fetchStatus(); }, []);

  return {
    isLive, loading, toggleLive,
    lastUpdateDate, setLastUpdate,
    showDate, setShowDate,
    sections, setSectionStatus,
  };
}
