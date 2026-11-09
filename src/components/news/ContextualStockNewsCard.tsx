import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Newspaper, ExternalLink, ArrowRight, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isIndexableNewsArticle } from "@/lib/seoNewsEligibility";
import { formatDistanceToNow } from "date-fns";
import { getNewsPublishedAt } from "@/lib/newsDate";
import { type NewsFromDB, type PublicStock } from "@/lib/api";

interface ContextualStockNewsCardProps {
  stockId: string;
  symbol: string;
  name: string;
  limit?: number;
}

interface StockNewsItem {
  id: string;
  title: string | null;
  summary: string | null;
  content?: string | null;
  status: string | null;
  related_stock_id?: string | null;
  date_published: string | null;
  source_published_at: string | null;
  created_at: string | null;
  source: string | null;
  category: string | null;
  image_url?: string | null;
  read_time: string | null;
}

export const ContextualStockNewsCard: React.FC<ContextualStockNewsCardProps> = ({
  stockId,
  symbol,
  name,
  limit = 3,
}) => {
  const [articles, setArticles] = useState<StockNewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadStockNews() {
      try {
        const cleanName = name.replace(/\b(plc|group|holdings|ltd|limited|bank|company)\b/gi, "").trim();
        const brandAliases = [symbol, name];
        if (cleanName.length > 3) brandAliases.push(cleanName);
        if (cleanName.toLowerCase() === "equity") brandAliases.push("Equity Bank");
        if (cleanName.toLowerCase() === "co-operative") brandAliases.push("Co-op Bank");

        const aliasPattern = brandAliases.join("|");
        const regex = new RegExp(`\\b(${aliasPattern})\\b`, "i");

        const stockFilter = stockId ? `related_stock_id.eq.${stockId},` : "";
        const { data, error } = await supabase
          .from("news_articles_public")
          .select("id, title, summary, content, status, related_stock_id, date_published, source_published_at, created_at, source, category, image_url, read_time")
          .or(`${stockFilter}title.ilike.%${symbol}%,title.ilike.%${cleanName}%,summary.ilike.%${symbol}%,summary.ilike.%${cleanName}%`)
          .order("source_published_at", { ascending: false, nullsFirst: false })
          .order("date_published", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(15);

        if (error || !data) return;

        // Prioritize explicit related_stock_id, then title/summary regex matches
        const matched = data
          .filter((a) => isIndexableNewsArticle(a) && (a.related_stock_id === stockId || regex.test(a.title) || regex.test(a.summary || "")))
          .sort((a, b) => Number(b.related_stock_id === stockId) - Number(a.related_stock_id === stockId))
          .slice(0, limit);

        if (mounted) {
          setArticles(matched);
        }
      } catch (err) {
        console.warn("ContextualStockNewsCard load error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStockNews();

    return () => {
      mounted = false;
    };
  }, [stockId, symbol, name, limit]);

  if (loading || articles.length === 0) {
    // Return null during loading or when no articles match to prevent empty box layout shifts
    return null;
  }

  return (
    <div className="rounded-[18px] border border-border bg-card p-4 shadow-[0_6px_18px_hsl(var(--foreground)/0.05)] md:rounded-xl md:shadow-none space-y-3">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-foreground">
            Latest News &amp; Intelligence for {symbol}
          </h3>
        </div>
        <Link
          to={`/news?search=${encodeURIComponent(symbol)}`}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all <ArrowRight className="h-3 w-3" />
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

export default ContextualStockNewsCard;
