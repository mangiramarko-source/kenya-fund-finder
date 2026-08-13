import { fetchPublicData } from "./src/lib/gateway.ts";
async function run() {
  const response = await fetchPublicData("stock-history-bulk", {
    select: ["stock_id", "snapshot_date", "price"],
    order: "snapshot_date.asc",
    days: 365,
    limit: 5000,
  });
  const grouped = {};
  response.data.forEach(d => {
    if (!grouped[d.stock_id]) grouped[d.stock_id] = [];
    grouped[d.stock_id].push(d.snapshot_date);
  });
  for (const [id, dates] of Object.entries(grouped)) {
    console.log(`Stock ${id}: ${dates.length} points. Range: ${dates[0]} to ${dates[dates.length-1]}`);
    if (dates.length < 5) console.log("  Dates:", dates);
  }
}
run().catch(console.error);
