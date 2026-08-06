import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface PostInteraction {
  liked: boolean;
  likeCount: number;
  comments: (string | { authorName?: string; content: string })[];
}

interface StoredFeedData {
  [itemId: string]: {
    likes?: number;
    likedBy?: string[];
    comments?: (string | { authorName?: string; content: string })[];
  };
}

const SUPABASE_URL = "https://caawgzuofnujrznwbuxk.supabase.co";
const SERVICE_ROLE_KEY = import.meta?.env?.VITE_SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMyMjQ4NiwiZXhwIjoyMDkxODk4NDg2fQ.RoY94LVmcCVVjLtIHyOCLb-8UYpE4wEQkPHobGdKkDE";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const FEED_INTERACTIONS_ID = "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d";
const FEED_INTERACTIONS_SLUG = "feed_interactions";

export function useFeedInteractions() {
  const [globalStore, setGlobalStore] = useState<StoredFeedData>(() => {
    try {
      const saved = localStorage.getItem("kf_global_feed_interactions");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [userLikes, setUserLikes] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("kf_user_likes");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const storeRef = useRef(globalStore);
  storeRef.current = globalStore;

  const userLikesRef = useRef(userLikes);
  userLikesRef.current = userLikes;

  // 1. Fetch global interactions from Supabase for all users (signed-in & guests)
  useEffect(() => {
    let isMounted = true;

    async function fetchGlobalInteractions() {
      try {
        const { data, error } = await supabase
          .from("site_pages_public")
          .select("content")
          .eq("slug", FEED_INTERACTIONS_SLUG)
          .maybeSingle();

        if (!error && data?.content && isMounted) {
          try {
            const parsed: StoredFeedData = typeof data.content === "string" 
              ? JSON.parse(data.content) 
              : data.content as any;

            if (parsed && typeof parsed === "object") {
              setGlobalStore(prev => ({ ...prev, ...parsed }));
              localStorage.setItem("kf_global_feed_interactions", JSON.stringify(parsed));
            }
          } catch (e) {
            console.error("Failed to parse global feed interactions:", e);
          }
        }
      } catch (e) {
        console.error("Error fetching global feed interactions:", e);
      }
    }

    fetchGlobalInteractions();

    // Poll periodically every 5 seconds so real-time updates flow across devices
    const interval = setInterval(fetchGlobalInteractions, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Sync user likes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("kf_user_likes", JSON.stringify(userLikes));
    } catch {}
  }, [userLikes]);

  // Helper to persist updated global store to Supabase via admin client
  const syncToSupabase = async (updatedStore: StoredFeedData) => {
    try {
      const { error } = await supabaseAdmin.from("site_pages").upsert({
        id: FEED_INTERACTIONS_ID,
        slug: FEED_INTERACTIONS_SLUG,
        title: "Feed Interactions Global Store",
        content: JSON.stringify(updatedStore),
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.warn("Supabase site_pages write notice:", error.message);
      }
    } catch (e) {
      console.warn("Failed to sync feed interactions to Supabase:", e);
    }
  };

  const toggleLike = useCallback((itemId: string, defaultLikes: number = 0) => {
    const isCurrentlyLiked = !!userLikesRef.current[itemId];
    const newLikedState = !isCurrentlyLiked;

    // Update user's personal liked state
    setUserLikes(prev => ({ ...prev, [itemId]: newLikedState }));

    // Update global likes count
    setGlobalStore(prev => {
      const currentItem = prev[itemId] || { likes: defaultLikes, comments: [] };
      const currentCount = currentItem.likes != null ? currentItem.likes : defaultLikes;
      const nextCount = newLikedState ? currentCount + 1 : Math.max(0, currentCount - 1);

      const nextStore = {
        ...prev,
        [itemId]: {
          ...currentItem,
          likes: nextCount,
        },
      };

      try {
        localStorage.setItem("kf_global_feed_interactions", JSON.stringify(nextStore));
      } catch {}

      syncToSupabase(nextStore);
      return nextStore;
    });
  }, []);

  const addComment = useCallback((itemId: string, text: string, authorName?: string) => {
    if (!text.trim()) return;

    setGlobalStore(prev => {
      const currentItem = prev[itemId] || { likes: 0, comments: [] };
      const existingComments = currentItem.comments || [];
      const newCommentObj = authorName ? { authorName, content: text.trim() } : text.trim();
      const updatedComments = [...existingComments, newCommentObj];

      const nextStore = {
        ...prev,
        [itemId]: {
          ...currentItem,
          comments: updatedComments,
        },
      };

      try {
        localStorage.setItem("kf_global_feed_interactions", JSON.stringify(nextStore));
      } catch {}

      syncToSupabase(nextStore);
      return nextStore;
    });
  }, []);

  const getPostInteraction = useCallback((itemId: string, defaultLikes: number = 0): PostInteraction => {
    const currentItem = globalStore[itemId];
    const isLiked = !!userLikes[itemId];
    const count = currentItem?.likes != null ? currentItem.likes : defaultLikes;
    const commentsList = currentItem?.comments || [];

    return {
      liked: isLiked,
      likeCount: count,
      comments: commentsList,
    };
  }, [globalStore, userLikes]);

  return { toggleLike, addComment, getPostInteraction, globalStore };
}
