import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Newspaper, Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getNewsImage, handleNewsImageError } from "@/lib/news-images";
import { StockTickerItem } from "./StockTickerTape";

interface NewsItem {
  id: string | number;
  title: string;
  url?: string;
  source?: string;
  published_at?: string;
  image_url?: string;
  summary?: string;
  body?: string;
}

interface RichStockNewsCardProps {
  article: NewsItem;
  stocksMap?: Record<string, StockTickerItem>;
}

export const RichStockNewsCard: React.FC<RichStockNewsCardProps> = ({ article, stocksMap = {} }) => {
  const textContent = `${article.title} ${article.summary || ""} ${article.body || ""}`;

  // Find all stock symbols mentioned in title or content
  const mentionedSymbols = Object.keys(stocksMap).filter((symbol) => {
    const regex = new RegExp(`\\b${symbol}\\b`, "i");
    return regex.test(textContent);
  });

  const displayImage = getNewsImage(article.image_url, article.title);

  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-all duration-200 group flex flex-col md:flex-row gap-4">
      {/* Article Image Preview */}
      {displayImage && (
        <div className="w-full md:w-44 h-32 md:h-28 rounded-lg overflow-hidden shrink-0 bg-muted relative">
          <img
            src={displayImage}
            alt={article.title}
            onError={(e) => handleNewsImageError(e, article.title)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      {/* Article Content */}
      <div className="flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1.5">
          {/* Metadata Bar */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/80 flex items-center gap-1">
              <Newspaper className="h-3.5 w-3.5 text-emerald-500" />
              {article.source || "Financial Market News"}
            </span>
            {article.published_at && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(article.published_at).toLocaleDateString("en-KE", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <a
            href={article.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-sm md:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2"
          >
            {article.title}
          </a>

          {/* Description */}
          {article.summary && (
            <p className="text-xs text-muted-foreground line-clamp-2">{article.summary}</p>
          )}
        </div>

        {/* Mentioned Stock Badges */}
        {mentionedSymbols.length > 0 && (
          <div className="pt-2 flex flex-wrap gap-2 items-center">
            <span className="text-[11px] font-medium text-muted-foreground">Mentioned:</span>
            {mentionedSymbols.map((sym) => {
              const stock = stocksMap[sym];
              if (!stock) return null;
              const isUp = stock.day_change_percent > 0;
              const isDown = stock.day_change_percent < 0;

              return (
                <Link
                  key={sym}
                  to={`/stocks/${sym}`}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 hover:bg-muted border border-border text-xs font-semibold transition-colors"
                >
                  <span className="text-foreground">{sym}</span>
                  <span className="tabular-nums font-mono text-[11px]">KSh {stock.price.toFixed(2)}</span>
                  <span
                    className={`inline-flex items-center font-bold text-[10px] tabular-nums ${
                      isUp ? "text-emerald-500" : isDown ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {isUp ? "+" : ""}
                    {stock.day_change_percent.toFixed(1)}%
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RichStockNewsCard;
