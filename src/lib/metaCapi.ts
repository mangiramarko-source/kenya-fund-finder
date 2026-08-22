import { hasConsent } from "@/lib/consent";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeProperties } from "@/lib/analytics";

export interface MetaCapiEventPayload {
  event_name: "CompleteRegistration" | "Lead" | "PortfolioAssetAdded" | "WatchlistItemAdded" | "PriceAlertCreated" | "PageView";
  event_id: string;
  event_time?: number;
  event_source_url?: string;
  user_data?: {
    em?: string; // Will be hashed on server or client
    ph?: string;
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
    external_id?: string;
  };
  custom_data?: Record<string, any>;
}

/**
 * Send a server-side conversion event to the Meta Conversions API via Supabase Edge Function.
 * Strictly gated by advertising consent.
 */
export async function sendMetaConversion(payload: MetaCapiEventPayload): Promise<boolean> {
  if (typeof window === "undefined" || !hasConsent("ads")) {
    return false;
  }

  try {
    const cleanCustomData = sanitizeProperties(payload.custom_data || {});
    const cleanPayload: MetaCapiEventPayload = {
      ...payload,
      event_time: payload.event_time || Math.floor(Date.now() / 1000),
      event_source_url: payload.event_source_url || window.location.href,
      custom_data: cleanCustomData,
    };

    const { data, error } = await supabase.functions.invoke("meta-conversion", {
      body: cleanPayload,
    });

    if (error) {
      console.warn("[MetaCAPI] Edge function error:", error);
      return false;
    }

    return !!data?.ok;
  } catch (err) {
    console.warn("[MetaCAPI] Failed to invoke meta-conversion:", err);
    return false;
  }
}
