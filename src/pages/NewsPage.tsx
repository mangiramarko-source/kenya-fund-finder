import { useState, useEffect, useMemo } from "react";
import { fetchPublishedNews, type NewsFromDB } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight, TrendingUp, Landmark, Shield, Megaphone, SortAsc } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const categories = ["All", "Yield Updates", "Market News", "Regulatory Updates", "Fund Announcements"] as const;

const categoryIcons: Record<string, typeof TrendingUp> = {
  "Yield Updates": TrendingUp,
  "Market News": Landmark,
  "Regulatory Updates": Shield,
  "Fund Announcements": Megaphone,
};

const categoryColors: Record<string, string> = {
  "Yield Updates": "bg-accent/10 text-accent hover:bg-accent/20",
  "Market News": "bg-info/10 text-info hover:bg-info/20",
  "Regulatory Updates": "bg-warning/10 text-warning hover:bg-warning/20",
  "Fund Announcements": "bg-primary/10 text-primary hover:bg-primary/20",
};

type SortOption = "latest" | "oldest" | "featured";

const NewsPage = () => {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [articles, setArticles] = useState<NewsFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<NewsFromDB | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("latest");

  useEffect(() => {
    fetchPublishedNews().then((data) => { setArticles(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = activeCategory === "All"
      ? articles
      : articles.filter((a) => a.category === activeCategory);

    if (sortBy === "featured") {
      list = [...list].sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
    } else {
      list = [...list].sort((a, b) => {
        const diff = new Date(b.date_published).getTime() - new Date(a.date_published).getTime();
        return sortBy === "oldest" ? -diff : diff;
      });
    }
    return list;
  }, [articles, activeCategory, sortBy]);
  if (loading) return <div className="container py-20 text-center text-muted-foreground">Loading news...</div>;

  return (
    <div className="container py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-accent/10">
          <Megaphone className="h-5 w-5 text-accent" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">News & Updates</h1>
      </div>
      <p className="text-muted-foreground mb-6 ml-[52px]">Stay informed about Money Market Funds in Kenya.</p>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat];
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {cat}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 sm:ml-auto shrink-0">
          <SortAsc className="h-4 w-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="featured">Featured First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((article) => {
          const CatIcon = categoryIcons[article.category] || Megaphone;
          return (
            <article
              key={article.id}
              className="group rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-accent/30 transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedArticle(article)}
            >
              <div className="flex items-start gap-4">
                <div className="hidden sm:flex items-center justify-center h-12 w-12 rounded-xl bg-muted shrink-0 group-hover:bg-accent/10 transition-colors">
                  <CatIcon className="h-6 w-6 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="secondary" className={categoryColors[article.category] || ""}>
                      {article.category}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {article.read_time}
                    </span>
                    {article.is_featured && (
                      <Badge className="bg-accent/15 text-accent border-0 text-[10px]">Featured</Badge>
                    )}
                  </div>
                  <h2 className="font-heading font-semibold text-base md:text-lg mb-1.5 group-hover:text-accent transition-colors">
                    {article.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{article.summary}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">
                      {article.source && `${article.source} · `}
                      {new Date(article.date_published).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                    <span className="text-xs text-accent font-medium flex items-center gap-1">
                      Read Full Article <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Full article dialog */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
          <ScrollArea className="max-h-[85vh]">
            <div className="p-6 sm:p-8">
              <DialogHeader className="mb-4">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {selectedArticle && (
                    <>
                      <Badge variant="secondary" className={categoryColors[selectedArticle.category] || ""}>
                        {selectedArticle.category}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {selectedArticle.read_time}
                      </span>
                      {selectedArticle.is_featured && (
                        <Badge className="bg-accent/15 text-accent border-0 text-[10px]">Featured</Badge>
                      )}
                    </>
                  )}
                </div>
                <DialogTitle className="text-xl md:text-2xl font-heading leading-tight">
                  {selectedArticle?.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-2">
                  {selectedArticle?.source && `${selectedArticle.source} · `}
                  {selectedArticle && new Date(selectedArticle.date_published).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
                </DialogDescription>
              </DialogHeader>

              <div className="prose prose-sm max-w-none text-foreground leading-relaxed space-y-4">
                {selectedArticle?.content ? (
                  selectedArticle.content.split("\n").filter(Boolean).map((paragraph, i) => (
                    <p key={i} className="text-sm text-muted-foreground leading-relaxed">{paragraph}</p>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedArticle?.summary}</p>
                )}
              </div>

              {selectedArticle?.url && (
                <div className="mt-6 pt-4 border-t border-border">
                  <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <a href={selectedArticle.url} target="_blank" rel="noopener noreferrer">
                      Read Original Source <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground text-center mt-10">
        All information is sourced from publicly available data. Fund yields and regulatory details are based on CMA-regulated disclosures.
      </p>
    </div>
  );
};

export default NewsPage;
