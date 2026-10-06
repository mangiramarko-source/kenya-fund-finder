import { loadEnv } from "vite";

const env = { ...loadEnv("production", process.cwd(), "VITE_"), ...process.env };
export const SEO_SUPABASE_URL = env.VITE_SUPABASE_URL || "https://caawgzuofnujrznwbuxk.supabase.co";
export const SEO_SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "sb_publishable_6snC3do-2emXAMEp7-C9AA_3_kb-GkC";

/** Uses the same field-allowlisted public gateway as the application. */
export async function seoPublicData<T>(resource: string, select: string, order: string): Promise<T[]> {
  const rows: T[] = [];
  const limit = 200;
  for (let offset = 0; ; offset += limit) {
    const query = new URLSearchParams({ select, order, limit: String(limit), offset: String(offset) });
    const response = await fetch(`${SEO_SUPABASE_URL}/functions/v1/public-data/${resource}?${query}`, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`SEO ${resource} returned HTTP ${response.status}`);
    const payload = await response.json() as { data?: T[]; count?: number };
    if (!Array.isArray(payload.data)) throw new Error(`SEO ${resource} returned an invalid payload`);
    rows.push(...payload.data);
    if (payload.data.length < limit || (typeof payload.count === "number" && rows.length >= payload.count)) return rows;
  }
}
