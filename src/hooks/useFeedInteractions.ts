import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

// Supabase reuses a channel when its topic name matches an existing one. Feed
// pages can briefly overlap while routes change, so a shared topic lets a new
// mount add callbacks to an already-subscribed channel and throws at runtime.
let feedRealtimeChannelSequence = 0;

function nextFeedRealtimeChannelName() {
  feedRealtimeChannelSequence += 1;
  return `feed-interactions-${feedRealtimeChannelSequence}`;
}

function getGuestToken(): string {
  try {
    let token = localStorage.getItem("kf_guest_token");
    if (!token) {
      const randomValues = new Uint8Array(16);
      crypto.getRandomValues(randomValues);
      token = "gt_" + Array.from(randomValues).map(b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem("kf_guest_token", token);
    }
    return token;
  } catch {
    return "gt_fallback_" + Math.random().toString(36).substring(2, 15);
  }
}

export function useFeedInteractions() {
  const { user } = useAuth();
  const [globalStore, setGlobalStore] = useState<StoredFeedData>({});
  
  // Track personal likes locally so UI updates instantly and we know if *we* liked it
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
  
  const guestToken = getGuestToken();

  useEffect(() => {
    let isMounted = true;

    async function fetchInitialData() {
      // Fetch all likes and comments to initialize the global store
      const [{ data: likesData }, { data: commentsData }] = await Promise.all([
        supabase.from("post_likes").select("post_id, user_id"),
        supabase.from("post_comments").select("id, post_id, content, author_name, created_at").order("created_at", { ascending: true })
      ]);

      if (!isMounted) return;

      const newStore: StoredFeedData = {};
      const newUserLikes: Record<string, boolean> = { ...userLikesRef.current };

      if (likesData) {
        likesData.forEach(like => {
          if (!newStore[like.post_id]) {
            newStore[like.post_id] = { likes: 0, comments: [] };
          }
          newStore[like.post_id].likes = (newStore[like.post_id].likes || 0) + 1;
          
          // Detect if current authenticated user liked it
          if (user && like.user_id === user.id) {
            newUserLikes[like.post_id] = true;
          }
        });
      }

      // If guest, sync liked state from database using guestToken
      if (!user && guestToken) {
        const { data: guestLikes } = await supabase.rpc("get_guest_liked_posts", {
          p_guest_token: guestToken,
        });
        if (guestLikes && isMounted) {
          guestLikes.forEach((row: { post_id: string }) => {
            newUserLikes[row.post_id] = true;
          });
        }
      }

      if (commentsData) {
        commentsData.forEach(comment => {
          if (!newStore[comment.post_id]) {
            newStore[comment.post_id] = { likes: 0, comments: [] };
          }
          const existingComments = newStore[comment.post_id].comments || [];
          newStore[comment.post_id].comments = [
            ...existingComments, 
            { authorName: comment.author_name || "User", content: comment.content }
          ];
        });
      }

      setGlobalStore(newStore);
      setUserLikes(newUserLikes);
    }

    fetchInitialData();

    // Setup Realtime subscriptions
    const channel = supabase.channel(nextFeedRealtimeChannelName())
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_likes' },
        (payload) => {
          const like = payload.new as any;
          if (like && like.post_id) {
            setGlobalStore(prev => {
              const currentItem = prev[like.post_id] || { likes: 0, comments: [] };
              return {
                ...prev,
                [like.post_id]: {
                  ...currentItem,
                  likes: (currentItem.likes || 0) + 1
                }
              };
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_likes' },
        (_payload) => {
          // Realtime on DELETE optimistically handled on interaction
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_comments' },
        (payload) => {
          const comment = payload.new as any;
          if (comment && comment.post_id) {
            setGlobalStore(prev => {
              const currentItem = prev[comment.post_id] || { likes: 0, comments: [] };
              const existingComments = currentItem.comments || [];
              return {
                ...prev,
                [comment.post_id]: {
                  ...currentItem,
                  comments: [...existingComments, { authorName: comment.author_name || "User", content: comment.content }]
                }
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, guestToken]);

  // Sync user likes to localStorage for persistence across reloads for guests
  useEffect(() => {
    try {
      localStorage.setItem("kf_user_likes", JSON.stringify(userLikes));
    } catch {
      // Likes remain available in memory when local storage is unavailable.
    }
  }, [userLikes]);

  const toggleLike = useCallback(async (itemId: string, defaultLikes: number = 0) => {
    const isCurrentlyLiked = !!userLikesRef.current[itemId];
    const newLikedState = !isCurrentlyLiked;

    // Optimistic UI Update
    setUserLikes(prev => ({ ...prev, [itemId]: newLikedState }));
    
    setGlobalStore(prev => {
      const currentItem = prev[itemId] || { likes: defaultLikes, comments: [] };
      const currentCount = currentItem.likes != null ? currentItem.likes : defaultLikes;
      const nextCount = newLikedState ? currentCount + 1 : Math.max(0, currentCount - 1);
      return {
        ...prev,
        [itemId]: { ...currentItem, likes: nextCount }
      };
    });

    // Network Request
    if (newLikedState) {
      if (user?.id) {
        const { error } = await supabase.from("post_likes").insert({
          post_id: itemId,
          user_id: user.id,
        });
        if (error) console.error("Error liking post:", error);
      } else {
        const { error } = await supabase.rpc("like_post", {
          p_post_id: itemId,
          p_guest_token: guestToken,
        });
        if (error) console.error("Error liking post:", error);
      }
    } else {
      if (user?.id) {
        const { error } = await supabase.from("post_likes").delete().eq("post_id", itemId).eq("user_id", user.id);
        if (error) console.error("Error unliking post:", error);
      } else {
        const { error } = await supabase.rpc("unlike_post", {
          p_post_id: itemId,
          p_guest_token: guestToken,
        });
        if (error) console.error("Error unliking post:", error);
      }
    }
  }, [user, guestToken]);

  const addComment = useCallback(async (itemId: string, text: string, authorName?: string) => {
    if (!text.trim()) return;

    const newCommentObj = { authorName: authorName || "User", content: text.trim() };

    // Optimistic UI Update
    setGlobalStore(prev => {
      const currentItem = prev[itemId] || { likes: 0, comments: [] };
      const existingComments = currentItem.comments || [];
      return {
        ...prev,
        [itemId]: {
          ...currentItem,
          comments: [...existingComments, newCommentObj]
        }
      };
    });

    // Network Request
    const { error } = await supabase.from("post_comments").insert({
      post_id: itemId,
      content: text.trim(),
      author_name: authorName || "User",
      user_id: user?.id || null,
    });

    if (error) console.error("Error adding comment:", error);
  }, [user]);

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
