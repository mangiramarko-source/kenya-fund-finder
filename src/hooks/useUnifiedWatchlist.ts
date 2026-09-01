import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { safeUUID } from "@/lib/safeUUID";
import { trackEvent } from "@/lib/analytics";
import { applyWatchlistOrder } from "@/lib/watchlistOrder";

const LOCAL_WATCHLIST_KEY = "kf_local_watchlist";

export interface UnifiedWatchlistItem {
  id: string;
  user_id: string;
  item_type: string;
  item_id: string;
  item_name: string;
  sort_order: number;
}

export type UnifiedWatchlistAssetType = "stock" | "fund" | "currency" | "commodity";

type MutationResult = { ok: true; duplicate?: boolean } | { ok: false; error: unknown };

const supportedAssetTypes = new Set<UnifiedWatchlistAssetType>(["stock", "fund", "currency", "commodity"]);

export function useUnifiedWatchlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<UnifiedWatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLocalState, setHasLocalState] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    if (!user) {
      try {
        const saved = localStorage.getItem(LOCAL_WATCHLIST_KEY);
        setHasLocalState(saved !== null);
        setItems(saved ? JSON.parse(saved) as UnifiedWatchlistItem[] : []);
      } catch {
        setHasLocalState(false);
        setItems([]);
      }
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_watchlist")
      .select("id,user_id,item_type,item_id,item_name,sort_order")
      .eq("user_id", user.id)
      .order("sort_order");
    setItems(error ? [] : (data as UnifiedWatchlistItem[] ?? []));
    setLoading(false);
  }, [user]);

  useEffect(() => { void refetch(); }, [refetch]);

  const add = useCallback(async (itemType: UnifiedWatchlistAssetType, itemId: string, itemName: string): Promise<MutationResult> => {
    if (!supportedAssetTypes.has(itemType) || !itemId) {
      return { ok: false, error: new Error("Choose a valid stock, fund, FX rate, or commodity") };
    }
    if (items.some((item) => item.item_type === itemType && item.item_id === itemId)) {
      return { ok: true, duplicate: true };
    }
    const item: UnifiedWatchlistItem = {
      id: safeUUID(),
      user_id: user?.id ?? "guest",
      item_type: itemType,
      item_id: itemId,
      item_name: itemName,
      sort_order: items.length,
    };
    const previous = items;
    const next = [...items, item];
    setItems(next);

    if (!user) {
      setHasLocalState(true);
      localStorage.setItem(LOCAL_WATCHLIST_KEY, JSON.stringify(next));
      trackEvent("watchlist_item_added", { item_type: itemType, item_id: itemId, signed_in: false });
      return { ok: true };
    }

    const { error } = await supabase
      .from("user_watchlist")
      .insert({
        id: item.id,
        user_id: user.id,
        item_type: itemType,
        item_id: itemId,
        item_name: itemName,
        sort_order: item.sort_order,
      })
      .select("id")
      .single();
    if (error) {
      setItems(previous);
      return { ok: false, error };
    }
    await refetch();
    trackEvent("watchlist_item_added", { item_type: itemType, item_id: itemId, signed_in: true });
    return { ok: true };
  }, [items, refetch, user]);

  const remove = useCallback(async (id: string): Promise<MutationResult> => {
    const previous = items;
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    if (!user) {
      setHasLocalState(true);
      localStorage.setItem(LOCAL_WATCHLIST_KEY, JSON.stringify(next));
      return { ok: true };
    }
    const { error } = await supabase
      .from("user_watchlist")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      setItems(previous);
      return { ok: false, error };
    }
    return { ok: true };
  }, [items, user]);

  const reorder = useCallback(async (orderedIds: string[]): Promise<MutationResult> => {
    const previous = items;
    const next = applyWatchlistOrder(items, orderedIds);
    if (!next) return { ok: false, error: new Error("Invalid watchlist order") };
    setItems(next);

    if (!user) {
      setHasLocalState(true);
      localStorage.setItem(LOCAL_WATCHLIST_KEY, JSON.stringify(next));
      return { ok: true };
    }

    const updates = await Promise.all(next.map((item) =>
      supabase
        .from("user_watchlist")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id)
        .eq("user_id", user.id),
    ));
    const failed = updates.find((result) => result.error);
    if (failed?.error) {
      setItems(previous);
      return { ok: false, error: failed.error };
    }
    return { ok: true };
  }, [items, user]);

  return { items, loading, hasLocalState, refetch, add, remove, reorder };
}
