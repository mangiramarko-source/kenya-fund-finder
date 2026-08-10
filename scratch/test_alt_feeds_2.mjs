const testFeeds = [
  "https://news.google.com/rss/search?q=site:citizen.digital+business+when:7d&hl=en-KE&gl=KE&ceid=KE:en",
  "https://news.google.com/rss/search?q=site:bizna.co.ke+when:7d&hl=en-KE&gl=KE&ceid=KE:en",
  "https://news.google.com/rss/search?q=site:the-star.co.ke+business+when:7d&hl=en-KE&gl=KE&ceid=KE:en",
  "https://news.google.com/rss/search?q=site:pd.co.ke+business+when:7d&hl=en-KE&gl=KE&ceid=KE:en"
];

async function main() {
  for (const url of testFeeds) {
    try {
      const start = Date.now();
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
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
