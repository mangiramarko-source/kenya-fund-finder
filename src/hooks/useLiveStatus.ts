import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AssetSection = "funds" | "stocks" | "rates" | "commodities" | "overview";

interface SectionStatus {
  is_live: boolean;
  last_update_date: string | null;
}

const LIVE_STATUS_QUERY_KEY = ["live-status"] as const;

async function fetchLiveStatusMeta(): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from("site_pages_public")
    .select("meta")
    .eq("slug", "live-status")
    .single();
  return (data?.meta as Record<string, unknown> | null) ?? null;
}

export function useLiveStatus() {
  const queryClient = useQueryClient();

  // React Query handles deduplication across all concurrent hook instances natively.
  // staleTime ensures repeat mounts within 60s reuse cache without refetching.
  const { data: meta, isLoading } = useQuery({
    queryKey: LIVE_STATUS_QUERY_KEY,
    queryFn: fetchLiveStatusMeta,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

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

  useEffect(() => {
    if (!meta) return;
    setIsLive(meta.is_live === true);
    setLastUpdateDate((meta.last_update_date as string) ?? null);
    setShowDateState(meta.show_date !== false);

    const secs = (meta.sections as Record<string, SectionStatus>) ?? {};
    setSections({
      funds: secs.funds ?? { is_live: meta.is_live === true, last_update_date: (meta.last_update_date as string) ?? null },
      stocks: secs.stocks ?? { is_live: false, last_update_date: null },
      rates: secs.rates ?? { is_live: false, last_update_date: null },
      commodities: secs.commodities ?? { is_live: false, last_update_date: null },
      overview: secs.overview ?? { is_live: false, last_update_date: null },
    });
  }, [meta]);

  const loading = isLoading;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: LIVE_STATUS_QUERY_KEY });

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
    invalidate();
  };

  const setLastUpdate = async (date: string | null) => {
    setLastUpdateDate(date);
    await updateMeta({ last_update_date: date });
    invalidate();
  };

  const setShowDate = async (value: boolean) => {
    setShowDateState(value);
    await updateMeta({ show_date: value });
    invalidate();
  };

  const setSectionStatus = async (section: AssetSection, status: Partial<SectionStatus>) => {
    const updated = { ...sections[section], ...status };
    const newSections = { ...sections, [section]: updated };
    setSections(newSections);
    await updateMeta({ sections: newSections });
    invalidate();
  };

  return {
    isLive, loading, toggleLive,
    lastUpdateDate, setLastUpdate,
    showDate, setShowDate,
    sections, setSectionStatus,
  };
}
