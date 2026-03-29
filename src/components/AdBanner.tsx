import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AdBannerProps {
  placement: "sidebar" | "banner" | "in-feed";
  className?: string;
}

interface Ad {
  id: string;
  title: string;
  description: string;
  media_type: string;
  media_url: string;
  click_url: string;
}

const getSessionId = () => {
  let sid = sessionStorage.getItem("ad_sid");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("ad_sid", sid);
  }
  return sid;
};

const trackEvent = async (adId: string, type: "impression" | "click") => {
  try {
    await supabase.functions.invoke("content-feed", {
      headers: { "x-client-key": "kff-v1-track" },
      body: {
        action: "track",
        ad_id: adId,
        event_type: type,
        session_id: getSessionId(),
        page_path: window.location.pathname,
      },
    });
  } catch {
    // silent
  }
};

const AdBanner = ({ placement, className = "" }: AdBannerProps) => {
  const tracked = useRef<string | null>(null);

  const { data: ad } = useQuery({
    queryKey: ["public-ads", placement],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("content-feed", {
        headers: { "x-client-key": "kff-v1-track" },
        body: { action: "fetch", placement },
      });
      if (error) throw error;
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (parsed.error) throw new Error(parsed.error);
      const ads = parsed.data as Ad[];
      return ads?.[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (ad && ad.id !== tracked.current) {
      tracked.current = ad.id;
      trackEvent(ad.id, "impression");
    }
  }, [ad?.id]);

  if (!ad || !ad.media_url) return null;

  const handleClick = () => trackEvent(ad.id, "click");

  const media = (
    <div className={`rounded-xl overflow-hidden border border-border bg-card ${className}`}>
      {ad.media_type === "video" ? (
        <video src={ad.media_url} autoPlay muted loop playsInline className="w-full" />
      ) : (
        <img src={ad.media_url} alt={ad.title || "Sponsored"} className="w-full" loading="lazy" />
      )}
      <div className="px-3 py-1.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Sponsored</span>
      </div>
    </div>
  );

  const safeUrl = ad.click_url && /^https?:\/\//i.test(ad.click_url) ? ad.click_url : "";

  if (safeUrl) {
    return (
      <a href={safeUrl} target="_blank" rel="noopener noreferrer sponsored"
        className="block hover:opacity-90 transition-opacity" onClick={handleClick}>
        {media}
      </a>
    );
  }

  return media;
};

export default AdBanner;
