import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Search,
  Share2,
  Eye,
  Clock,
  ShieldCheck,
  Video,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import StoriesHeader from "@/components/stories/StoriesHeader";
import StoryViewerModal, { StoryPost } from "@/components/stories/StoryViewerModal";
import {
  PostCategory,
  POST_CATEGORIES,
  getDisclaimerText,
} from "@/lib/compliance/cmaDisclaimers";

export default function UpdatesPage() {
  useDocumentTitle(
    "Market Updates & Broadcasts – Kenya Fund Finder",
    "Official broadcasts, founder commentary, MMF yield changes, and real-time market updates for Kenyan investors.",
    {
      title: "Market Updates & Broadcasts | Kenya Fund Finder",
      description: "Official broadcasts, founder commentary, and real-time market updates for Kenyan investors.",
    }
  );

  useJsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://kenyafundfinder.com/updates",
    name: "KenyaFundFinder Market Updates & Broadcasts",
    description: "Official market updates, money market yields, and educational commentary.",
    url: "https://kenyafundfinder.com/updates",
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin_posts_public_feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_posts")
        .select(`
          id,
          author_user_id,
          persona_id,
          custom_author_name,
          custom_avatar_url,
          title,
          content,
          category,
          post_type,
          media,
          disclaimer_type,
          is_published,
          expires_at,
          view_count,
          created_at,
          persona:persona_id (
            name,
            avatar_url,
            badge_title
          )
        `)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (error) return [];
      return (data || []) as unknown as StoryPost[];
    },
    staleTime: 60 * 1000,
  });

  const filteredPosts = posts.filter((post) => {
    const matchesCategory =
      selectedCategory === "all" || post.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      (post.title && post.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSharePost = (postId: string) => {
    const url = `${window.location.origin}/updates#post-${postId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  return (
    <div className="container max-w-4xl py-6 md:py-8 space-y-6">
      {/* Top Stories Reel */}
      <StoriesHeader className="mb-2" />

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Market Updates & Broadcasts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verified updates from KenyaFundFinder analysts, yield changes, and platform news.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search updates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
            selectedCategory === "all"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          All Updates ({posts.length})
        </button>
        {Object.values(POST_CATEGORIES).map((cat) => {
          const count = posts.filter((p) => p.category === cat.key).length;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                selectedCategory === cat.key
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {cat.label} {count > 0 ? `(${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* Feed Content */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Loading updates...
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-muted/20 border rounded-xl p-8">
          <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <p className="text-sm font-semibold">No updates found</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? "No updates match your search filter. Try clearing the search box."
              : "No broadcasts currently published in this category."}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPosts.map((post, index) => {
            const author =
              post.persona?.name || post.custom_author_name || "Admin";
            const avatar =
              post.persona?.avatar_url ||
              post.custom_avatar_url ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80";
            const badge = post.persona?.badge_title || "Official";
            const mediaList = Array.isArray(post.media) ? post.media : [];
            const disclaimerText = getDisclaimerText(post.disclaimer_type);
            const catMeta =
              POST_CATEGORIES[post.category] || POST_CATEGORIES.market_update;

            return (
              <Card
                key={post.id}
                id={`post-${post.id}`}
                className="overflow-hidden shadow-xs border-border/80 hover:border-border transition"
              >
                <CardHeader className="p-4 sm:p-5 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    {/* Author identity */}
                    <div className="flex items-center gap-3">
                      <img
                        src={avatar}
                        alt={author}
                        className="w-10 h-10 rounded-full object-cover border"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-semibold leading-none">
                            {author}
                          </h3>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4"
                          >
                            {badge}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                            {catMeta.badgeLabel}
                          </Badge>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(post.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => handleSharePost(post.id)}
                        title="Share link"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
                  {/* Headline & Text */}
                  <div className="space-y-1.5">
                    {post.title && (
                      <h2 className="text-base font-bold tracking-tight text-foreground">
                        {post.title}
                      </h2>
                    )}
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>
                  </div>

                  {/* Media Gallery / Player */}
                  {mediaList.length > 0 && (
                    <div className="rounded-xl overflow-hidden border bg-black/5 dark:bg-black/30">
                      {mediaList.map((item, mIdx) => (
                        <div key={mIdx} className="w-full">
                          {item.type === "image" && (
                            <img
                              src={item.url}
                              alt="Post media"
                              className="w-full max-h-[500px] object-cover sm:object-contain bg-black/90 mx-auto"
                              loading="lazy"
                            />
                          )}

                          {item.type === "video" && (
                            <video
                              src={item.url}
                              poster={item.thumbnail_url}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full max-h-[500px] mx-auto bg-black"
                            />
                          )}

                          {item.type === "embed" && (
                            <div className="aspect-video w-full">
                              <iframe
                                src={item.url}
                                title="Embedded video"
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Automated CMA Regulatory Disclaimer */}
                  {disclaimerText && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border border-border/50 text-[11px] text-muted-foreground leading-relaxed">
                      <ShieldCheck className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                      <span>{disclaimerText}</span>
                    </div>
                  )}

                  {/* Footer Metrics */}
                  <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {post.view_count || 1} views
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveStoryIndex(index)}
                      className="text-primary hover:underline font-medium flex items-center gap-0.5"
                    >
                      <span>Open in Stories</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Story Viewer Modal */}
      {activeStoryIndex !== null && (
        <StoryViewerModal
          isOpen={activeStoryIndex !== null}
          onClose={() => setActiveStoryIndex(null)}
          stories={filteredPosts}
          initialIndex={activeStoryIndex}
        />
      )}
    </div>
  );
}
