import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { safeUUID } from "@/lib/safeUUID";

export interface WatchlistEntry {
  id: string;
  item_id: string;
  item_name: string;
}

export function useAssetWatchlist(itemType: string) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) { setEntries([]); setLoading(false); return; }
    const { data } = await supabase
      .from("user_watchlist")
      .select("id, item_id, item_name")
      .eq("user_id", user.id)
      .eq("item_type", itemType)
      .order("created_at", { ascending: false });
    setEntries((data as WatchlistEntry[]) || []);
    setLoading(false);
  }, [user, itemType]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const isFavourite = useCallback(
    (id: string) => entries.some((e) => e.item_id === id),
    [entries]
  );

  const toggle = useCallback(
    async (id: string, name: string) => {
      if (!user) return;
      const existing = entries.find((e) => e.item_id === id);
      if (existing) {
        setEntries((prev) => prev.filter((e) => e.id !== existing.id));
        await supabase.from("user_watchlist").delete().eq("id", existing.id);
        toast.success(`Removed ${name} from watchlist`);
      } else {
        const temp: WatchlistEntry = { id: safeUUID(), item_id: id, item_name: name };
        setEntries((prev) => [temp, ...prev]);
        await supabase.from("user_watchlist").insert({
          user_id: user.id,
          item_type: itemType,
          item_id: id,
          item_name: name,
        });
        toast.success(`Added ${name} to watchlist`);
        fetchEntries();
      }
    },
    [user, entries, fetchEntries, itemType]
  );

  return { entries, loading, isFavourite, toggle };
}
