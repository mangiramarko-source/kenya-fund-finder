import { useState } from "react";
import { newsArticles } from "@/data/funds";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight, TrendingUp, Landmark, Shield, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = ["All", "Yield Updates", "Market News", "Regulatory Updates"] as const;

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

const NewsPage = () => {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filtered = activeCategory === "All"
    ? newsArticles
    : newsArticles.filter((a) => a.category === activeCategory);

  return (
    <div className="container py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-accent/10">
          <Megaphone className="h-5 w-5 text-accent" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">News & Updates</h1>
      </div>
      <p className="text-muted-foreground mb-6 ml-[52px]">Stay informed about Money Market Funds in Kenya.</p>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => {
          const Icon = categoryIcons[cat];
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
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

      {/* Articles list */}
      <div className="space-y-3">
        {filtered.map((article) => {
          const CatIcon = categoryIcons[article.category] || Megaphone;
          return (
            <article
              key={article.id}
              className="group rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-accent/30 transition-all duration-200"
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
                      {article.readTime}
                    </span>
                    {article.featured && (
                      <Badge className="bg-accent/15 text-accent border-0 text-[10px]">Featured</Badge>
                    )}
                  </div>
                  <h2 className="font-heading font-semibold text-base md:text-lg mb-1.5 group-hover:text-accent transition-colors">
                    {article.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {article.summary}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(article.date).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                    <Button variant="ghost" size="sm" className="text-accent hover:text-accent gap-1 -mr-2 text-xs h-8">
                      Read More <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center mt-10">
        All information is sourced from publicly available data. Fund yields and regulatory details are based on CMA-regulated disclosures.
      </p>
    </div>
  );
};

export default NewsPage;
