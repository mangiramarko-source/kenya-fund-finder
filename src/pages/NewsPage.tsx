import { useState, useEffect, useMemo } from "react";
import { decodeHtmlEntities } from "@/lib/utils";
import { fetchPublishedNews, type NewsFromDB } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Search, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { SocialFeedCard } from "@/components/feed/SocialFeed";
import { FeedItemDetailModal } from "@/components/feed/FeedItemDetailModal";
import { useFeedInteractions } from "@/hooks/useFeedInteractions";
import { type FeedItem } from "@/hooks/useSocialFeed";

const INTERNATIONAL_SOURCES = new Set([
  "Reuters Business",
  "Reuters Markets",
  "Reuters",
  "BBC Business",
  "BBC News",
  "Financial Times Africa",
  "Financial Times",
  "Bloomberg",
  "Al Jazeera",
  "CNBC World",
  "CNBC",
  "Investing.com",
  "MarketWatch",
  "Seeking Alpha",
  "African Business",
  "The Africa Report",
  "Further Africa",
]);

const isInternationalArticle = (a: { source?: string | null; category?: string | null }) =>
  a.category === "International" || (a.source ? INTERNATIONAL_SOURCES.has(a.source) : false);

export default function NewsPage() {
  useDocumentTitle(
    "Market News – Kenya Investment & Global Financial Updates",
    "Stay informed with the latest Kenyan & international investment news, stock updates, unit trust developments, and market trends.",
    { title: "Market News – Kenya Investment & Global Financial Updates", description: "Up-to-date market news covering Kenya and global financial markets." }
  );

  const { toggleLike, addComment, getPostInteraction } = useFeedInteractions();
  const [articles, setArticles] = useState<NewsFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNavTab, setActiveNavTab] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null);

  useEffect(() => {
    fetchPublishedNews()
      .then((data) => {
        setArticles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredArticles = useMemo(() => {
    let list = [...articles];

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || (a.summary || "").toLowerCase().includes(q));
    }

    // Filter & Sort by Nav Tab
    if (activeNavTab === "Kenyan") {
      list = list.filter(a => !isInternationalArticle(a));
    } else if (activeNavTab === "International") {
      list = list.filter(a => isInternationalArticle(a));
    } else if (activeNavTab === "Latest") {
      list.sort((a, b) => new Date(b.created_at || b.date_published).getTime() - new Date(a.created_at || a.date_published).getTime());
    } else if (activeNavTab === "Oldest") {
      list.sort((a, b) => new Date(a.created_at || a.date_published).getTime() - new Date(b.created_at || b.date_published).getTime());
    } else {
      // "All" defaults to latest first
      list.sort((a, b) => new Date(b.created_at || b.date_published).getTime() - new Date(a.created_at || a.date_published).getTime());
    }

    return list;
  }, [articles, activeNavTab, searchQuery]);

  const feedItems = useMemo(() => {
    return filteredArticles.map((a) => ({
      id: `news-${a.id}`,
      type: "NEWS" as const,
      authorName: a.source || "Market News",
      authorLabel: a.category || "News",
      title: decodeHtmlEntities(a.title),
      content: a.summary || a.content || "",
      mediaUrl: a.image_url || undefined,
      mediaType: a.image_url ? ("image" as const) : undefined,
      timestamp: new Date(a.created_at || a.date_published || Date.now()),
      likes: a.likes || 0,
      comments: a.comments || 0,
      url: a.url || "#",
      rawItem: a,
    }));
  }, [filteredArticles]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-full max-w-md" />
        <div className="space-y-4 pt-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Market News</h1>
          <Badge variant="secondary" className="text-xs bg-muted/80">{filteredArticles.length} articles</Badge>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search market news..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-xs pl-8 bg-card border-border rounded-full w-full"
          />
        </div>
      </div>

      {/* Top Nav Filter Tabs */}
      <div className="relative mb-6 border-b border-border dark:border-white/10">
        <div className="flex overflow-x-auto gap-6 sm:gap-8 pb-2.5 hide-scrollbar text-sm font-medium">
          {[
            "All",
            "Kenyan",
            "International",
            "Latest",
            "Oldest",
          ].map((cat) => {
            const isActive = activeNavTab === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveNavTab(cat)}
                className={`whitespace-nowrap transition-colors duration-200 relative pb-1 text-sm ${
                  isActive
                    ? "text-foreground font-bold dark:text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
                {isActive && (
                  <span className="absolute bottom-[-11px] left-0 right-0 h-[2px] bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Articles Feed */}
      {feedItems.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl">
          <Megaphone className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium">No articles found matching your criteria.</p>
          <p className="text-xs mt-1 text-muted-foreground/60">Try searching for something else or selecting a different tab.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-20">
          {feedItems.map((item) => (
            <SocialFeedCard
              key={item.id}
              item={item}
              onSelect={setSelectedFeedItem}
            />
          ))}
        </div>
      )}

      {/* Pop-up Detail Modal */}
      <FeedItemDetailModal
        item={selectedFeedItem}
        open={!!selectedFeedItem}
        onOpenChange={(open) => {
          if (!open) setSelectedFeedItem(null);
        }}
        interaction={selectedFeedItem ? getPostInteraction(selectedFeedItem.id, selectedFeedItem.likes || 0) : undefined}
        onLikeToggle={toggleLike}
        onAddComment={addComment}
      />
    </div>
  );
}
