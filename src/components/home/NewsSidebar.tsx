import { Link } from "react-router-dom";
import { ArrowRight, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { NewsFromDB } from "@/lib/api";

interface NewsSidebarProps {
  news: NewsFromDB[];
  loading: boolean;
}

const NewsSkeleton = () => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-24" />
    </div>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="rounded-lg border border-border bg-card p-3">
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    ))}
  </div>
);

const NewsCard = ({ article }: { article: NewsFromDB }) => (
  <article className="rounded-lg border border-border bg-card p-3 hover:border-accent/20 transition-all">
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/10 text-accent uppercase tracking-wider">{article.category}</span>
      <span className="text-[10px] text-muted-foreground">{article.read_time}</span>
    </div>
    <h3 className="font-medium text-xs leading-snug line-clamp-2 mb-1">{article.title}</h3>
    <p className="text-[11px] text-muted-foreground line-clamp-2">{article.summary}</p>
    <p className="text-[10px] text-muted-foreground mt-1.5">
      {article.source && `${article.source} · `}
      {new Date(article.date_published).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
    </p>
  </article>
);

const NewsSidebar = ({ news, loading }: NewsSidebarProps) => {
  if (loading) return <NewsSkeleton />;
  if (news.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Latest News</h2>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-accent text-xs h-7 px-2">
          <Link to="/news">All <ArrowRight className="ml-0.5 h-3 w-3" /></Link>
        </Button>
      </div>
      {news.map((article) => (
        <NewsCard key={article.id} article={article} />
      ))}
    </div>
  );
};

export default NewsSidebar;
