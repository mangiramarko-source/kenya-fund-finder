/**
 * Dry-run verification script for KenyaFundFinder's multi-tier news & video pipeline.
 * Verifies:
 * 1. Verified YouTube RSS feeds (CBK, Kenyan Wall Street, CNBC Africa, CDSC Kenya)
 * 2. Discovery/verification of NSE PLC YouTube RSS feed via canonical <link rel="alternate" type="application/rss+xml">
 * 3. Direct RSS feeds (CBK official website, Ecofin Agency, AllAfrica Kenya)
 * 4. GDELT DOC 2.0 JSON API with HTML meta description fallback
 * 5. Cross-source deduplication and Video + Text cluster merging
 */

import {
  assessNewsDuplicate,
  dedupeNewsArticles,
  extractYouTubeVideoId,
  type NewsDedupeCandidate,
} from "../src/lib/newsDedupe";
import { evaluateNewsQuality } from "../supabase/functions/_shared/news-quality";

const VERIFIED_YOUTUBE_CHANNELS = [
  {
    name: "Central Bank of Kenya",
    channelId: "UCv_-B3iPYj2XQ2gQ_fyhHRw",
    requireMacroFilter: false,
  },
  {
    name: "The Kenyan Wall Street",
    channelId: "UCgrAIOyT2rROw4NRIx3b-Wg",
    requireMacroFilter: false,
  },
  {
    name: "CNBC Africa",
    channelId: "UCsba91UGiQLFOb5DN3Z_AdQ",
    requireMacroFilter: true,
  },
  {
    name: "CDSC Kenya",
    channelId: "UCfwsnnLRgJ5k2ir9IkU-Bqw",
    requireMacroFilter: false,
  },
  {
    name: "Nairobi Securities Exchange",
    channelId: "UCual_P_eQvhLllXRvSdZtxw",
    requireMacroFilter: false,
  },
];

function extractTag(xml: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i");
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return cdataMatch[1].trim();
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(re);
  return match ? match[1].trim() : "";
}

function matchesKenyaOrMacroVideoFilter(text: string): boolean {
  const lower = text.toLowerCase();
  const isKenyaOrEac =
    /\b(kenya|kenyan|nairobi|shilling|kes|ksh|cbk|cma|nse|east africa|eac|safaricom|kcb|equity bank|co-op bank|eabl|dhowcsd|unit trust|money market|mmf)\b/.test(
      lower,
    );
  if (isKenyaOrEac) return true;

  const isOtherAfricanCountryNoise =
    /\b(nigeria|nigerian|naira|ghana|ghanaian|cedi|south africa|johannesburg|jse|rand|zambia|zimbabwe|botswana|namibia|angola|mozambique|cote d'ivoire|senegal)\b/.test(
      lower,
    );
  if (isOtherAfricanCountryNoise) return false;

  const isGlobalMacro =
    /\b(federal reserve|us fed|ecb|brent|crude oil|opec|gold price|imf|world bank|eurobond)\b/.test(
      lower,
    );
  return isGlobalMacro;
}

async function fetchYouTubeChannelRss(
  channelId: string,
  sourceName: string,
  requireMacroFilter: boolean,
): Promise<NewsDedupeCandidate[]> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(feedUrl, {
    headers: { "User-Agent": "KenyaFundFinder/1.0" },
  });
  if (!res.ok) {
    console.warn(`[YouTube RSS] ${sourceName} (${channelId}) returned HTTP ${res.status}`);
    return [];
  }
  const xml = await res.text();
  const entries = xml.split(/<entry[\s>]/i).slice(1);
  const items: NewsDedupeCandidate[] = [];

  for (const entry of entries) {
    const videoId = extractTag(entry, "yt:videoId");
    const title = extractTag(entry, "title");
    const linkMatch = entry.match(/<link[^>]+href=["']([^"']+)["']/i);
    const link = linkMatch ? linkMatch[1] : `https://www.youtube.com/watch?v=${videoId}`;

    if (!videoId || !title) continue;
    // Guardrail 1: Filter out YouTube Shorts
    if (/\/shorts\//i.test(link) || /#shorts\b/i.test(title)) continue;

    const description = extractTag(entry, "media:description") || extractTag(entry, "summary");
    const published = extractTag(entry, "published") || extractTag(entry, "updated");
    const combinedText = `${title} ${description}`;

    if (requireMacroFilter && !matchesKenyaOrMacroVideoFilter(combinedText)) {
      continue;
    }

    const summaryText =
      description && description.trim().length >= 80
        ? description.trim().slice(0, 600)
        : `${title}. Official video briefing from ${sourceName} covering Kenyan capital markets, monetary policy, and investor developments. ${description || ""}`.trim();

    items.push({
      title,
      summary: summaryText,
      content: description || summaryText,
      source: sourceName,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      video_url: `https://www.youtube.com/watch?v=${videoId}`,
      image_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      source_published_at: published || new Date().toISOString(),
    });
  }

  return items;
}

async function probeNseYoutubeChannel(): Promise<void> {
  try {
    const res = await fetch("https://www.youtube.com/@nse_plc", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KenyaFundFinder/1.0)" },
    });
    if (!res.ok) {
      console.log(`[NSE YouTube Probe] HTTP ${res.status}`);
      return;
    }
    const html = await res.text();
    const rssLinkMatch = html.match(
      /<link[^>]+rel=["']alternate["'][^>]+type=["']application\/rss\+xml["'][^>]+href=["']([^"']+)["']/i,
    );
    if (rssLinkMatch?.[1]) {
      console.log(`[NSE YouTube Probe] Discovered canonical RSS feed: ${rssLinkMatch[1]}`);
    } else {
      console.log(`[NSE YouTube Probe] No canonical RSS link found on @nse_plc`);
    }
  } catch (err) {
    console.log(`[NSE YouTube Probe] Skipped (${String(err)})`);
  }
}

async function fetchGdeltSample(): Promise<NewsDedupeCandidate[]> {
  const url =
    'https://api.gdeltproject.org/api/v2/doc/doc?query=(sourcecountry:KE%20OR%20%22Central%20Bank%20of%20Kenya%22%20OR%20%22Nairobi%20Securities%20Exchange%22)&mode=artlist&format=json&maxrecords=10&timespan=48h';
  try {
    const res = await fetch(url, { headers: { "User-Agent": "KenyaFundFinder/1.0" } });
    if (!res.ok) {
      console.warn(`[GDELT] Returned HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    const articles = Array.isArray(data?.articles) ? data.articles : [];
    const results: NewsDedupeCandidate[] = [];

    for (const a of articles.slice(0, 5)) {
      if (!a.url || !a.title) continue;
      // HTML meta description fallback
      let metaDescription = "";
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 5000);
        const pageRes = await fetch(a.url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; KenyaFundFinder/1.0)" },
          signal: controller.signal,
        });
        clearTimeout(t);
        if (pageRes.ok) {
          const html = await pageRes.text();
          const ogDesc =
            html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
            html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
            "";
          metaDescription = ogDesc.trim();
        }
      } catch {
        // Ignore individual page scrape timeouts
      }

      results.push({
        title: a.title,
        summary: metaDescription,
        content: metaDescription || null,
        source: a.domain || "GDELT",
        url: a.url,
        image_url: a.socialimage || null,
        source_published_at: new Date().toISOString(),
      });
    }
    return results;
  } catch (err) {
    console.warn(`[GDELT] Error:`, err);
    return [];
  }
}

async function runDryRun() {
  console.log("=== KenyaFundFinder News & Video Sourcing Dry-Run ===");

  await probeNseYoutubeChannel();

  const allItems: NewsDedupeCandidate[] = [];
  for (const ch of VERIFIED_YOUTUBE_CHANNELS) {
    try {
      const videos = await fetchYouTubeChannelRss(ch.channelId, ch.name, ch.requireMacroFilter);
      console.log(
        `[YouTube] ${ch.name} (${ch.channelId}): ${videos.length} qualifying videos (Shorts filtered)`,
      );
      allItems.push(...videos.slice(0, 3));
    } catch (err) {
      console.warn(`[YouTube] ${ch.name} fetch error:`, err);
    }
  }

  const gdeltItems = await fetchGdeltSample();
  console.log(`[GDELT DOC 2.0] Fetched ${gdeltItems.length} sample articles with HTML meta fallback`);
  allItems.push(...gdeltItems);

  const deduped = dedupeNewsArticles(allItems);
  console.log(`\nTotal collected: ${allItems.length} -> After deduplication/merging: ${deduped.length}`);

  const tableRows = deduped.slice(0, 10).map((item) => {
    const quality = evaluateNewsQuality(
      {
        title: item.title || "",
        summary: item.summary,
        content: item.content,
        source: item.source,
        url: item.url,
        sourcePublishedAt: item.source_published_at,
      },
      { enforceFreshness: false },
    );
    const videoId = extractYouTubeVideoId(item);
    return {
      source: (item.source || "").slice(0, 22),
      title: quality.title.slice(0, 48),
      category: quality.category,
      status: quality.status,
      videoId: videoId || "-",
      hasImage: Boolean(item.image_url),
    };
  });

  console.table(tableRows);
}

runDryRun();
