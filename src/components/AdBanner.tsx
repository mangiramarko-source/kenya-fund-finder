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
  media_type: "image" | "video";
  media_url: string;
  click_url: string;
  placement: string;
}

const getSessionId = () => {
  let sid = sessionStorage.getItem("ad_sid");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("ad_sid", sid);
  }
  return sid;
};

const trackAdEvent = async (adId: string, eventType: "impression" | "click") => {
  try {
    await supabase.from("ad_events").insert({
      ad_id: adId,
      event_type: eventType,
      session_id: getSessionId(),
      page_path: window.location.pathname,
    });
  } catch {
    // Silent fail — don't break UX for analytics
  }
};

const AdBanner = ({ placement, className = "" }: AdBannerProps) => {
  const impressionTracked = useRef<string | null>(null);

  const { data: ads = [] } = useQuery({
    queryKey: ["ads", placement],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads_public" as any)
        .select("id, title, description, media_type, media_url, click_url, placement, start_date, end_date")
        .eq("placement", placement)
        .limit(5) as { data: any[] | null; error: any };

      if (error) throw error;

      const today = new Date().toISOString().split("T")[0];
      const filtered = (data || []).filter((ad: any) => {
        if (ad.start_date && ad.start_date > today) return false;
        if (ad.end_date && ad.end_date < today) return false;
        return true;
      });

      return filtered as Ad[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const ad = ads[0];

  // Track impression once per ad per component mount
  useEffect(() => {
    if (ad && ad.id !== impressionTracked.current) {
      impressionTracked.current = ad.id;
      trackAdEvent(ad.id, "impression");
    }
  }, [ad?.id]);

  if (!ad || !ad.media_url) return null;

  const handleClick = () => {
    trackAdEvent(ad.id, "click");
  };

  const content = (
    <div className={`rounded-xl overflow-hidden border border-border bg-card ${className}`}>
      {ad.media_type === "video" ? (
        <video src={ad.media_url} autoPlay muted loop playsInline className="w-full" />
      ) : (
        <img src={ad.media_url} alt={ad.title} className="w-full" loading="lazy" />
      )}
      <div className="px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Sponsored</span>
      </div>
    </div>
  );

  const safeClickUrl = ad.click_url && /^https?:\/\//i.test(ad.click_url) ? ad.click_url : "";

  if (safeClickUrl) {
    return (
      <a
        href={safeClickUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block hover:opacity-90 transition-opacity"
        onClick={handleClick}
      >
        {content}
      </a>
    );
  }

  return content;
};

export default AdBanner;
