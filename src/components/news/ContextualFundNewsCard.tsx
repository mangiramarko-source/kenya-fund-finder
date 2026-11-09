import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isIndexableNewsArticle } from "@/lib/seoNewsEligibility";
import { formatDistanceToNow } from "date-fns";
import { getNewsPublishedAt } from "@/lib/newsDate";

interface ContextualFundNewsCardProps {
  fundName?: string;
  fundType?: string;
  limit?: number;
}

interface FundNewsItem {
  id: string;
  title: string | null;
  summary: string | null;
  status: string | null;
  date_published: string | null;
  source_published_at: string | null;
  created_at: string | null;
  source: string | null;
  category: string | null;
  read_time: string | null;
}

export const ContextualFundNewsCard: React.FC<ContextualFundNewsCardProps> = ({
  fundName,
  fundType,
  limit = 2,
}) => {
  const [articles, setArticles] = useState<FundNewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadFundNews() {
      try {
        // First look for yield/rate/fixed-income/CBK/inflation news
        const { data, error } = await supabase
          .from("news_articles_public")
          .select("id, title, summary, status, date_published, source_published_at, created_at, source, category, read_time")
          .or("category.eq.Yield Updates,title.ilike.%yield%,title.ilike.%rate%,title.ilike.%cbk%,title.ilike.%inflation%,title.ilike.%treasury%,title.ilike.%t-bill%,title.ilike.%money market%,title.ilike.%bond%")
          .order("source_published_at", { ascending: false, nullsFirst: false })
          .order("date_published", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(10);

        if (error || !data) return;

        let filtered = data.filter((a) => isIndexableNewsArticle(a));

        // If fewer than limit articles match, fall back to top general market articles
        if (filtered.length < limit) {
          const { data: fallbackData } = await supabase
            .from("news_articles_public")
            .select("id, title, summary, status, date_published, source_published_at, created_at, source, category, read_time")
            .order("source_published_at", { ascending: false, nullsFirst: false })
            .order("date_published", { ascending: false, nullsFirst: false })
            .limit(6);
          if (fallbackData) {
            const extra = fallbackData.filter((a) => isIndexableNewsArticle(a) && !filtered.some((f) => f.id === a.id));
            filtered = [...filtered, ...extra];
          }
        }

        if (mounted) {
          setArticles(filtered.slice(0, limit));
        }
      } catch (err) {
        console.warn("ContextualFundNewsCard load error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadFundNews();

    return () => {
      mounted = false;
    };
  }, [fundName, fundType, limit]);

  if (loading || articles.length === 0) {
    // Return null during loading or when no articles match to prevent layout shift
    return null;
  }

  return (
    <div className="rounded-[18px] border border-border bg-card p-4 shadow-[0_6px_18px_hsl(var(--foreground)/0.05)] md:rounded-xl md:shadow-none space-y-3">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Market Intelligence &amp; Yield Outlook
            </h3>
            <p className="text-[11px] text-muted-foreground">
              What is driving Kenyan interest rates, CBK decisions, and fund yields
            </p>
          </div>
        </div>
        <Link
          to="/news"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
        >
          All News <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="divide-y divide-border/40">
        {articles.map((item) => {
          const published = getNewsPublishedAt(item);
          let timeAgo = "";
          try {
            if (published) {
              timeAgo = formatDistanceToNow(new Date(published), { addSuffix: true }).replace("about ", "");
            }
          } catch {
            timeAgo = "";
          }

          return (
            <Link
              key={item.id}
              to={`/news/${encodeURIComponent(item.id)}`}
              className="group block py-2.5 first:pt-0 last:pb-0 transition-colors hover:text-primary"
            >
              <h4 className="text-xs sm:text-sm font-medium text-foreground group-hover:text-primary line-clamp-2 leading-snug">
                {item.title}
              </h4>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                {item.source && (
                  <span className="font-semibold text-foreground/80">{item.source}</span>
                )}
                {timeAgo && <span>• {timeAgo}</span>}
                {item.read_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {item.read_time}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ContextualFundNewsCard;
