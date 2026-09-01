import { useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useUnifiedWatchlist } from "@/hooks/useUnifiedWatchlist";

export interface WatchlistEntry {
  id: string;
  item_id: string;
  item_name: string;
}

export function useAssetWatchlist(itemType: string) {
  const { user } = useAuth();
  const { items, loading, add, remove } = useUnifiedWatchlist();
  const entries = useMemo(
    () => items.filter((item) => item.item_type === itemType),
    [itemType, items],
  );

  const isFavourite = useCallback(
    (id: string) => entries.some((e) => e.item_id === id),
    [entries]
  );

  const toggle = useCallback(
    async (id: string, name: string) => {
      if (!user) return;
      const existing = entries.find((e) => e.item_id === id);
      if (existing) {
        const result = await remove(existing.id);
        if (!result.ok) {
          toast.error(`Could not remove ${name}`);
          return;
        }
        toast.success(`Removed ${name} from watchlist`);
      } else {
        const result = await add(itemType, id, name);
        if (!result.ok) {
          toast.error(`Could not add ${name}`);
          return;
        }
        toast.success(`Added ${name} to watchlist`);
      }
    },
    [add, entries, itemType, remove, user]
  );

  return { entries, loading, isFavourite, toggle };
}
