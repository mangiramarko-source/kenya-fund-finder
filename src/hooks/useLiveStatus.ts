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

  const isLive = meta ? meta.is_live === true : null;
  const lastUpdateDate = meta ? ((meta.last_update_date as string) ?? null) : null;
  const showDate = meta ? meta.show_date !== false : true;

  const secs = (meta?.sections as Record<string, SectionStatus>) ?? {};
  const sections: Record<AssetSection, SectionStatus> = {
    funds: secs.funds ?? { is_live: false, last_update_date: (meta?.last_update_date as string) ?? null },
    stocks: secs.stocks ?? { is_live: false, last_update_date: null },
    rates: secs.rates ?? { is_live: false, last_update_date: null },
    commodities: secs.commodities ?? { is_live: false, last_update_date: null },
    overview: secs.overview ?? { is_live: false, last_update_date: null },
  };

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
    await updateMeta({ is_live: value });
    invalidate();
  };

  const setLastUpdate = async (date: string | null) => {
    await updateMeta({ last_update_date: date });
    invalidate();
  };

  const setShowDate = async (value: boolean) => {
    await updateMeta({ show_date: value });
    invalidate();
  };

  const setSectionStatus = async (section: AssetSection, status: Partial<SectionStatus>) => {
    const updated = { ...sections[section], ...status };
    const newSections = { ...sections, [section]: updated };
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
