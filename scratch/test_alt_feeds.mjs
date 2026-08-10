const testFeeds = [
  // Direct attempts
  "https://www.businessdailyafrica.com/rss",
  "https://citizen.digital/rss",
  "https://www.the-star.co.ke/business/rss",
  "https://www.pd.co.ke/feed/",
  // Google News fallbacks
  "https://news.google.com/rss/search?q=site:businessdailyafrica.com+business+when:7d&hl=en-KE&gl=KE&ceid=KE:en",
  "https://news.google.com/rss/search?q=site:nation.africa/kenya/business+when:7d&hl=en-KE&gl=KE&ceid=KE:en",
  "https://news.google.com/rss/search?q=site:kenyanwallstreet.com+when:7d&hl=en-KE&gl=KE&ceid=KE:en",
  "https://news.google.com/rss/search?q=site:citizen.digital/business+when:7d&hl=en-KE&gl=KE&ceid=KE:en",
  "https://news.google.com/rss/search?q=site:techweez.com+when:7d&hl=en-KE&gl=KE&ceid=KE:en",
  "https://news.google.com/rss/search?q=site:techcabal.com+when:7d&hl=en-KE&gl=KE&ceid=KE:en"
];

async function main() {
  for (const url of testFeeds) {
    try {
      const start = Date.now();
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
        signal: AbortSignal.timeout(6000),
      });
      const elapsed = Date.now() - start;
      if (!res.ok) {
        console.log(`❌ [HTTP ${res.status}] ${url} - ${elapsed}ms`);
      } else {
        const xml = await res.text();
        const itemCount = (xml.match(/<item/g) || []).length;
        console.log(`✅ [HTTP ${res.status}] ${url} - ${itemCount} items found (${elapsed}ms)`);
      }
    } catch (err) {
      console.log(`💥 [ERROR] ${url}: ${err.message}`);
    }
  }
}
main();
