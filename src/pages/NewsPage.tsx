import { useState } from "react";
import { newsArticles } from "@/data/funds";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight } from "lucide-react";

import newsYields from "@/assets/news-yields.jpg";
import newsTreasury from "@/assets/news-treasury.jpg";
import newsRegulation from "@/assets/news-regulation.jpg";
import newsDigital from "@/assets/news-digital.jpg";
import newsSavings from "@/assets/news-savings.jpg";
import newsFund from "@/assets/news-fund.jpg";

const imageMap: Record<string, string> = {
  yields: newsYields,
  treasury: newsTreasury,
  regulation: newsRegulation,
  digital: newsDigital,
  savings: newsSavings,
  fund: newsFund,
};

const categories = ["All", "Yield Updates", "Market News", "Regulatory Updates"] as const;

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

  const featured = filtered.filter((a) => a.featured);
  const regular = filtered.filter((a) => !a.featured);

  return (
    <div className="container py-10">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">News & Updates</h1>
      <p className="text-muted-foreground mb-6">Stay informed about Money Market Funds in Kenya.</p>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Featured articles - large hero cards */}
      {featured.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {featured.map((article) => (
            <article
              key={article.id}
              className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              <div className="aspect-[16/9] overflow-hidden">
                <img
                  src={imageMap[article.imageKey]}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className={categoryColors[article.category] || ""}>
                    {article.category}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {article.readTime}
                  </span>
                </div>
                <h2 className="font-heading font-bold text-xl mb-2 group-hover:text-accent transition-colors">
                  {article.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                  {article.summary}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(article.date).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                  <button className="flex items-center gap-1 text-accent text-sm font-medium hover:underline">
                    Read More <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Regular articles - image + text side by side */}
      <div className="space-y-4">
        {regular.map((article) => (
          <article
            key={article.id}
            className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row"
          >
            <div className="sm:w-56 md:w-72 shrink-0 aspect-[16/9] sm:aspect-auto overflow-hidden">
              <img
                src={imageMap[article.imageKey]}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
            <div className="flex-1 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className={categoryColors[article.category] || ""}>
                    {article.category}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {article.readTime}
                  </span>
                </div>
                <h2 className="font-heading font-semibold text-lg mb-2 group-hover:text-accent transition-colors">
                  {article.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {article.summary}
                </p>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">
                  {new Date(article.date).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
                </span>
                <button className="flex items-center gap-1 text-accent text-sm font-medium hover:underline">
                  Read More <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center mt-10">
        All information is sourced from publicly available data. Fund yields and regulatory details are based on CMA-regulated disclosures.
      </p>
    </div>
  );
};

export default NewsPage;
