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

function getDeviceId() {
  try {
    let id = localStorage.getItem("kf_device_id");
    if (!id) {
      id = "dev_" + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("kf_device_id", id);
    }
    return id;
  } catch {
    return "dev_fallback";
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
  
  const deviceId = getDeviceId();

  useEffect(() => {
    let isMounted = true;

    async function fetchInitialData() {
      // Fetch all likes and comments to initialize the global store
      const [{ data: likesData }, { data: commentsData }] = await Promise.all([
        supabase.from("post_likes").select("post_id, user_id, device_id"),
        supabase.from("post_comments").select("*").order("created_at", { ascending: true })
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
          
          // Detect if current user/device liked it
          if ((user && like.user_id === user.id) || like.device_id === deviceId) {
            newUserLikes[like.post_id] = true;
          }
        });
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
    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_likes' },
        (payload) => {
          const like = payload.new;
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
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_likes' },
        (payload) => {
          // Decrement not safely possible without replica identity full (post_id usually not in old payload)
          // But since the frontend optimistically decrements when the user unlikes, it's fine for local state.
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_comments' },
        (payload) => {
          const comment = payload.new;
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
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, deviceId]);

  // Sync user likes to localStorage for persistence across reloads for guests
  useEffect(() => {
    try {
      localStorage.setItem("kf_user_likes", JSON.stringify(userLikes));
    } catch {}
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
      const { error } = await supabase.from("post_likes").insert({
        post_id: itemId,
        user_id: user?.id || null,
        device_id: deviceId
      });
      if (error) console.error("Error liking post:", error);
    } else {
      let query = supabase.from("post_likes").delete().eq("post_id", itemId);
      if (user?.id) {
        query = query.eq("user_id", user.id);
      } else {
        query = query.eq("device_id", deviceId);
      }
      const { error } = await query;
      if (error) console.error("Error unliking post:", error);
    }
  }, [user, deviceId]);

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
      device_id: deviceId
    });

    if (error) console.error("Error adding comment:", error);
  }, [user, deviceId]);

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
