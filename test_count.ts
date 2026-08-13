import { fetchPublicData } from "./src/lib/gateway.ts";
async function run() {
  const t0 = Date.now();
  const response = await fetchPublicData("stock-history-bulk", {
    select: ["stock_id"],
    order: "snapshot_date.asc",
    days: 365,
    limit: 1,
  });
  console.log("Count:", response.count, "Time:", Date.now() - t0, "ms");
}
run().catch(console.error);
