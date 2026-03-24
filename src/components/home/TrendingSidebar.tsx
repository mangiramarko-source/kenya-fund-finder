import { Link } from "react-router-dom";
import { ArrowRight, Newspaper, TrendingUp, Calculator, BookOpen, Search, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FundFromDB, NewsFromDB } from "@/lib/api";

interface TrendingSidebarProps {
  funds: FundFromDB[];
  news: NewsFromDB[];
  loading: boolean;
}

const TrendingSidebar = ({ funds, news, loading }: TrendingSidebarProps) => {
  // Top 5 funds by annual yield
  const topFunds = [...funds].sort((a, b) => b.annual_yield - a.annual_yield).slice(0, 5);

  return (
    <div className="space-y-4">
      {/* ── Quick Actions ── */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2 mb-2.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-foreground">Quick Actions</span>
        </div>
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground">
            <Link to="/compare"><Search className="mr-2 h-3 w-3" /> Compare Funds</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full justify-start h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground">
            <Link to="/calculator"><Calculator className="mr-2 h-3 w-3" /> Calculate Returns</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full justify-start h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground">
            <Link to="/learn"><BookOpen className="mr-2 h-3 w-3" /> Learn About Funds</Link>
          </Button>
        </div>
      </div>

      {/* ── Top Yielding ── */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-3 py-2 border-b border-border flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-accent" />
          <span className="text-[11px] font-bold text-foreground">Top Yielding</span>
        </div>
        {loading ? (
          <div className="p-3 space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div><Skeleton className="h-3 w-24 mb-1" /><Skeleton className="h-2.5 w-16" /></div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {topFunds.map((fund) => (
              <Link key={fund.id} to={`/compare/${fund.slug}`} className="flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors group">
                <div className="min-w-0 flex-1 mr-2">
                  <p className="text-[11px] font-semibold text-accent group-hover:text-accent/80 truncate">{fund.name}</p>
                  <p className="text-[9px] text-muted-foreground">{fund.manager}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-bold text-foreground tabular-nums">{fund.annual_yield}%</p>
                  <p className="text-[9px] text-accent tabular-nums">+{fund.daily_yield}%</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Latest News ── */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="h-3.5 w-3.5 text-accent" />
            <span className="text-[11px] font-bold text-foreground">Latest News</span>
          </div>
          <Link to="/news" className="text-[10px] text-accent hover:text-accent/80 font-medium inline-flex items-center gap-0.5">
            All <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </div>
        {loading ? (
          <div className="p-3 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}><Skeleton className="h-3 w-full mb-1" /><Skeleton className="h-2.5 w-3/4" /></div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-muted-foreground">No recent news</div>
        ) : (
          <div className="divide-y divide-border/30">
            {news.map((article) => (
              <Link key={article.id} to={`/news/${article.id}`} className="block px-3 py-2.5 hover:bg-muted/30 transition-colors group">
                <p className="text-[11px] font-medium text-foreground group-hover:text-accent transition-colors line-clamp-2 leading-snug mb-1">{article.title}</p>
                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  <span>{article.read_time}</span>
                  <span>·</span>
                  <span>{new Date(article.date_published).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendingSidebar;
