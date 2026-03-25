import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface WatchlistEntry {
  id: string;
  item_id: string;
  item_name: string;
}

export function useFundWatchlist() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setEntries([]); setLoading(false); return; }
    const { data } = await supabase
      .from("user_watchlist")
      .select("id, item_id, item_name")
      .eq("user_id", user.id)
      .eq("item_type", "fund")
      .order("created_at", { ascending: false });
    setEntries((data as WatchlistEntry[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const isFavourite = useCallback(
    (fundId: string) => entries.some((e) => e.item_id === fundId),
    [entries]
  );

  const toggle = useCallback(
    async (fundId: string, fundName: string) => {
      if (!user) return;
      const existing = entries.find((e) => e.item_id === fundId);
      if (existing) {
        setEntries((prev) => prev.filter((e) => e.id !== existing.id));
        await supabase.from("user_watchlist").delete().eq("id", existing.id);
        toast.success(`Removed ${fundName} from favourites`);
      } else {
        const temp: WatchlistEntry = { id: crypto.randomUUID(), item_id: fundId, item_name: fundName };
        setEntries((prev) => [temp, ...prev]);
        await supabase.from("user_watchlist").insert({
          user_id: user.id,
          item_type: "fund",
          item_id: fundId,
          item_name: fundName,
        });
        toast.success(`Added ${fundName} to favourites`);
        fetch();
      }
    },
    [user, entries, fetch]
  );

  return { entries, loading, isFavourite, toggle };
}
