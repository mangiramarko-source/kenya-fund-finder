import { Link } from "react-router-dom";
import { ArrowRight, Newspaper, Clock, TrendingUp, Landmark, Shield, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { NewsFromDB } from "@/lib/api";
import { getNewsImage, handleNewsImageError } from "@/lib/news-images";

interface NewsSidebarProps {
  news: NewsFromDB[];
  loading: boolean;
}

const categoryIcons: Record<string, typeof TrendingUp> = {
  "Yield Updates": TrendingUp,
  "Market News": Landmark,
  "Regulatory Updates": Shield,
  "Fund Announcements": Megaphone,
};

const NewsSkeleton = () => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-24" />
    </div>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border bg-card p-3">
        <div className="flex gap-3">
          <Skeleton className="h-16 w-20 rounded-lg shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const NewsCard = ({ article, isFirst }: { article: NewsFromDB; isFirst: boolean }) => {
  const CatIcon = categoryIcons[article.category] || Megaphone;
  const imgSrc = getNewsImage(article.image_url, article.category, article.id);

  if (isFirst) {
    return (
      <Link to={`/news/${article.id}`} className="block group">
        <article className="rounded-xl border border-border bg-card hover:border-accent/20 hover:shadow-sm transition-all overflow-hidden">
          <div className="aspect-[16/9] overflow-hidden">
            <img
              src={imgSrc}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              fetchPriority="high"
              onError={(e) => handleNewsImageError(e, article.category, article.id)}
            />
          </div>
          <div className="p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="flex items-center justify-center h-5 w-5 rounded-md bg-accent/10">
                <CatIcon className="h-3 w-3 text-accent" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{article.category}</span>
              <span className="text-xs text-muted-foreground ml-auto flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {article.read_time}
              </span>
            </div>
            <h3 className="font-heading font-semibold text-sm leading-snug line-clamp-2 mb-1.5 group-hover:text-accent transition-colors">
              {article.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{article.summary}</p>
            <div className="flex items-center justify-between mt-2.5">
              <p className="text-xs text-muted-foreground">
                {article.source && `${article.source} · `}
                {new Date(article.date_published).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
              </p>
              <span className="text-xs text-accent font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                Read <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link to={`/news/${article.id}`} className="block group">
      <article className="rounded-xl border border-border bg-card hover:border-accent/20 hover:shadow-sm transition-all p-3">
        <div className="flex gap-3">
          <div className="w-20 h-14 rounded-lg overflow-hidden shrink-0">
            <img
              src={imgSrc}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => handleNewsImageError(e, article.category, article.id)}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <CatIcon className="h-3 w-3 text-accent" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">{article.category}</span>
            </div>
            <h3 className="font-heading font-semibold text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
              {article.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(article.date_published).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
};

const NewsSidebar = ({ news, loading }: NewsSidebarProps) => {
  if (loading) return <NewsSkeleton />;
  if (news.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-accent/10">
            <Newspaper className="h-3.5 w-3.5 text-accent" />
          </div>
          <h2 className="text-sm font-bold">Latest News</h2>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-accent text-xs h-7 px-2 gap-1 hover:bg-accent/10">
          <Link to="/news">View All <ArrowRight className="h-3 w-3" /></Link>
        </Button>
      </div>
      {news.map((article, i) => (
        <NewsCard key={article.id} article={article} isFirst={i === 0} />
      ))}
    </div>
  );
};

export default NewsSidebar;
