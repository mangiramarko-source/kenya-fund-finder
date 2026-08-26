/**
 * Makes a story URL stable across tracking links, fragments, and harmless
 * trailing slashes so a transient duplicate row cannot be rendered twice.
 */
export function canonicalNewsUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url.trim());
    for (const parameter of [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "ref", "mc_cid", "mc_eid",
    ]) {
      parsed.searchParams.delete(parameter);
    }
    parsed.hash = "";
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    const search = parsed.searchParams.toString();
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}${search ? `?${search}` : ""}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase() || null;
  }
}

export function dedupeNewsByUrl<T extends { url?: string | null }>(articles: T[]): T[] {
  const seenUrls = new Set<string>();

  return articles.filter((article) => {
    const url = canonicalNewsUrl(article.url);
    if (!url) return true;
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });
}
