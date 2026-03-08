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

const AdBanner = ({ placement, className = "" }: AdBannerProps) => {
  const { data: ads = [], error } = useQuery({
    queryKey: ["ads", placement],
    queryFn: async () => {
      // Simple query - date filtering done client-side to avoid .or() chaining issues
      const { data, error } = await supabase
        .from("ads")
        .select("id, title, description, media_type, media_url, click_url, placement, start_date, end_date")
        .eq("is_active", true)
        .eq("placement", placement)
        .limit(5);

      if (error) {
        console.error("AdBanner query error:", error);
        throw error;
      }

      // Client-side date filtering
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
  if (!ad || !ad.media_url) return null;

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

  if (ad.click_url) {
    return (
      <a href={ad.click_url} target="_blank" rel="noopener noreferrer sponsored" className="block hover:opacity-90 transition-opacity">
        {content}
      </a>
    );
  }

  return content;
};

export default AdBanner;
