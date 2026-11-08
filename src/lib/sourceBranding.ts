/**
 * Source Branding & Logo Resolution
 * Resolves sharp local brand logos for official Kenyan financial institutions,
 * video channels, and media publishers, preventing generic YouTube icons on video briefings.
 */

const KNOWN_SOURCE_LOGOS: Record<string, string> = {
  // Video Channels & Regulators
  "central bank of kenya": "/images/news-sources/cbk.png",
  "central bank": "/images/news-sources/cbk.png",
  "cbk": "/images/news-sources/cbk.png",
  "the kenyan wall street": "/images/news-sources/kenyan-wall-street.png",
  "kenyan wall street": "/images/news-sources/kenyan-wall-street.png",
  "the kenyan wallstreet": "/images/news-sources/kenyan-wall-street.png",
  "tkws": "/images/news-sources/kenyan-wall-street.png",
  "nairobi securities exchange": "/images/news-sources/nse.png",
  "nse": "/images/news-sources/nse.png",
  "nse plc": "/images/news-sources/nse.png",
  "cdsc kenya": "/images/news-sources/cdsc.png",
  "cdsc": "/images/news-sources/cdsc.png",
  "central depository & settlement corporation": "/images/news-sources/cdsc.png",
  "central depository": "/images/news-sources/cdsc.png",
  "cnbc africa": "/images/news-sources/cnbc-africa.png",

  // Business News Publishers
  "business daily": "/images/sources/business-daily.png",
  "business daily africa": "/images/sources/business-daily.png",
  "standard media": "/images/news-sources/standard.png",
  "the standard": "/images/news-sources/standard.png",
  "standard digital": "/images/news-sources/standard.png",
  "kbc": "/images/news-sources/kbc.png",
  "kbc channel 1": "/images/news-sources/kbc.png",
  "kenya broadcasting corporation": "/images/news-sources/kbc.png",
};

const DOMAIN_TO_LOGO: Record<string, string> = {
  "centralbank.go.ke": "/images/news-sources/cbk.png",
  "kenyanwallstreet.com": "/images/news-sources/kenyan-wall-street.png",
  "nse.co.ke": "/images/news-sources/nse.png",
  "cdsckenya.com": "/images/news-sources/cdsc.png",
  "cnbcafrica.com": "/images/news-sources/cnbc-africa.png",
  "businessdailyafrica.com": "/images/sources/business-daily.png",
  "standardmedia.co.ke": "/images/news-sources/standard.png",
  "kbc.co.ke": "/images/news-sources/kbc.png",
};

export function extractDomainFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Returns a high-res local logo for verified channels/publishers,
 * or falls back to Google's favicon service for general websites.
 * Crucially avoids returning the generic red YouTube favicon for YouTube video briefings.
 */
export function getSourceLogoUrl(
  authorOrSource?: string | null,
  rawUrl?: string | null,
): string | null {
  const normName = (authorOrSource || "").trim().toLowerCase();
  const domain = extractDomainFromUrl(rawUrl);

  // 1. Direct source name lookup (primary for YouTube feeds and RSS sources)
  if (KNOWN_SOURCE_LOGOS[normName]) {
    return KNOWN_SOURCE_LOGOS[normName];
  }

  // 2. Fuzzy name matching for known video channels & outlets
  if (normName.includes("central bank") || normName.includes("cbk")) {
    return "/images/news-sources/cbk.png";
  }
  if (normName.includes("wall street") || normName.includes("wallstreet")) {
    return "/images/news-sources/kenyan-wall-street.png";
  }
  if (normName.includes("nairobi securities") || normName === "nse" || normName.startsWith("nse ")) {
    return "/images/news-sources/nse.png";
  }
  if (normName.includes("cdsc") || normName.includes("central depository")) {
    return "/images/news-sources/cdsc.png";
  }
  if (normName.includes("cnbc")) {
    return "/images/news-sources/cnbc-africa.png";
  }
  if (normName.includes("business daily")) {
    return "/images/sources/business-daily.png";
  }
  if (normName.includes("standard media") || normName === "standard") {
    return "/images/news-sources/standard.png";
  }
  if (normName === "kbc" || normName.includes("kbc ")) {
    return "/images/news-sources/kbc.png";
  }

  // 3. Domain-based lookup
  if (domain && DOMAIN_TO_LOGO[domain]) {
    return DOMAIN_TO_LOGO[domain];
  }

  // 4. If URL is YouTube, NEVER return the generic YouTube favicon
  if (domain && (domain === "youtube.com" || domain === "youtu.be" || domain.endsWith(".youtube.com"))) {
    return null; // Fall back to initials rather than red YouTube play button
  }

  // 5. External article website fallback (favicons for Nation, Star, etc.)
  if (domain && !domain.includes("localhost") && domain.includes(".")) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  }

  return null;
}
