export interface SortableWatchlistItem {
  id: string;
  sort_order: number;
}

export function applyWatchlistOrder<T extends SortableWatchlistItem>(items: T[], orderedIds: string[]): T[] | null {
  if (items.length !== orderedIds.length || new Set(orderedIds).size !== items.length) return null;
  const byId = new Map(items.map((item) => [item.id, item]));
  const next = orderedIds.map((id, sort_order) => {
    const item = byId.get(id);
    return item ? { ...item, sort_order } : null;
  });
  return next.every(Boolean) ? next as T[] : null;
}
