import { useState } from "react";
import { newsArticles } from "@/data/funds";
import { Badge } from "@/components/ui/badge";

const categories = ["All", "Yield Updates", "Market News", "Regulatory Updates", "Fund Announcements"] as const;

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
      <h1 className="text-2xl md:text-3xl font-bold mb-2">News & Updates</h1>
      <p className="text-muted-foreground mb-6">Stay informed about Money Market Funds in Kenya.</p>

      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((article) => (
          <article key={article.id} className="rounded-lg border border-border bg-card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className={categoryColors[article.category] || ""}>
                {article.category}
              </Badge>
              <span className="text-xs text-muted-foreground">{new Date(article.date).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })}</span>
            </div>
            <h2 className="font-semibold text-lg mb-2">{article.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{article.summary}</p>
            <button className="text-accent text-sm font-medium hover:underline">Read More →</button>
          </article>
        ))}
      </div>
    </div>
  );
};

export default NewsPage;
