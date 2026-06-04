/** Normalize VITE_SUPABASE_URL (trim, strip trailing slash, fix duplicated https://). */
export function normalizeSupabaseUrl(url: string | undefined): string | undefined {
  if (!url || url === "undefined") return undefined;
  const trimmed = url.trim().replace(/\/$/, "");
  return trimmed.replace(/^https:\/\/https:\/\//i, "https://");
}
