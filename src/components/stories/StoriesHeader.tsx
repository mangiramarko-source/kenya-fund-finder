import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ArrowRight, Video } from "lucide-react";
import StoryViewerModal, { StoryPost } from "./StoryViewerModal";
import { PostCategory } from "@/lib/compliance/cmaDisclaimers";

interface StoriesHeaderProps {
  className?: string;
}

export default function StoriesHeader({ className = "" }: StoriesHeaderProps) {
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["admin_posts_public_stories"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();

      // Query active published stories
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
        .in("post_type", ["story", "both"])
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order("created_at", { ascending: false })
        .limit(15);

      if (error) {
        // Safe fallback in case table hasn't migrated in dev environment
        return [];
      }

      return (data || []) as unknown as StoryPost[];
    },
    staleTime: 60 * 1000,
  });

  // Prerender-safe guard: If loading or no active stories exist, render nothing without layout shift
  if (isLoading || stories.length === 0) {
    return <div className={`empty:hidden ${className}`} aria-hidden="true" />;
  }

  return (
    <>
      <section
        aria-label="Market Stories & Announcements"
        className={`w-full py-2 ${className}`}
      >
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              Live Updates & Stories
            </span>
          </div>
          <Link
            to="/updates"
            className="text-xs text-primary hover:underline font-medium flex items-center gap-1 transition"
          >
            <span>All Updates</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="flex items-center gap-3.5 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
          {stories.map((story, idx) => {
            const author = story.persona?.name || story.custom_author_name || "Admin";
            const avatar =
              story.persona?.avatar_url ||
              story.custom_avatar_url ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80";
            const badge = story.persona?.badge_title || "Update";
            const hasVideo = Array.isArray(story.media) && story.media.some((m) => m.type === "video" || m.type === "embed");

            return (
              <button
                key={story.id}
                type="button"
                onClick={() => setSelectedStoryIndex(idx)}
                className="flex flex-col items-center flex-shrink-0 group focus:outline-none"
              >
                {/* Gradient ring */}
                <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-primary group-hover:scale-105 transition-transform duration-200 shadow-sm">
                  <div className="p-0.5 bg-background rounded-full">
                    <img
                      src={avatar}
                      alt={author}
                      className="w-14 h-14 rounded-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  {hasVideo && (
                    <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-0.5 rounded-full border-2 border-background shadow-xs">
                      <Video className="h-3 w-3" />
                    </div>
                  )}
                </div>

                <span className="text-[11px] font-medium text-foreground/90 max-w-[70px] truncate mt-1 text-center group-hover:text-primary transition-colors">
                  {author}
                </span>
                <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {badge}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Story Viewer Modal */}
      {selectedStoryIndex !== null && (
        <StoryViewerModal
          isOpen={selectedStoryIndex !== null}
          onClose={() => setSelectedStoryIndex(null)}
          stories={stories}
          initialIndex={selectedStoryIndex}
        />
      )}
    </>
  );
}
