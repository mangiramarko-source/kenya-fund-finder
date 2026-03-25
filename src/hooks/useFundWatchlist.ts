import { useAssetWatchlist } from "./useAssetWatchlist";

export type { WatchlistEntry } from "./useAssetWatchlist";

export function useFundWatchlist() {
  return useAssetWatchlist("fund");
}
