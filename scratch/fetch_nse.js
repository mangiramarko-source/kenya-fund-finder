async function fetchSector(sector) {
  const res = await fetch("https://www.nse.co.ke/dataservices/wp-admin/admin-ajax.php", {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Referer": "https://www.nse.co.ke/dataservices/market-statistics/"
    },
    body: new URLSearchParams({ action: "display_prices", sector }).toString()
  });
  const text = await res.text();
  console.log(`--- SECTOR: ${sector} ---`);
  // Extract td tags
  const matches = [...text.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map(m => m[1].trim().replace(/<[^>]+>/g, ''));
  for (let i = 0; i < matches.length; i += 7) {
    if (matches[i]) console.log(`${matches[i]} | Price: ${matches[i+3]}`);
  }
}
async function run() {
  await fetchSector("energy");
  await fetchSector("const");
  await fetchSector("invest");
}
run();
