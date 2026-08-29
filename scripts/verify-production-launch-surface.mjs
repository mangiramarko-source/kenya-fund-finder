import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const assetsDirectory = join(process.cwd(), "dist", "assets");
if (!existsSync(assetsDirectory)) {
  throw new Error("Production bundle is missing. Run npm run build before this check.");
}

const assetFiles = readdirSync(assetsDirectory, { recursive: true })
  .filter((entry) => typeof entry === "string")
  .map((entry) => join(assetsDirectory, entry));

const forbiddenChunkNames = [
  "ChecklistPage",
  "StocksDemoPage",
  "DemoStocksPage",
  "DemoStockFeedPage",
  "StockDecisionFeedDemoPage",
  "StocksMobileDesktopDemoPage",
  "DevEmailPreviewPage",
  "DevWelcomePreviewPage",
  "DevNotificationPreviewPage",
];
const forbiddenMarkers = [
  "/checklist",
  "/stocks-demo",
  "/demo-stocks-feed",
  "/demo-feed",
  "/demo-stock-insights",
  "/stocks/demo-2",
  "/dev/email-preview",
  "/dev/welcome-preview",
  "/dev/notification-preview",
  "adsense-checklist-state",
  "Stocks Feed Demo – Market News",
  "This is a mobile-first UI preview.",
  "Weekly email preview (dev)",
  "New-user setup preview",
  "Development preview",
];

const forbiddenFiles = assetFiles.filter((asset) => forbiddenChunkNames.some((name) => asset.includes(name)));
if (forbiddenFiles.length) {
  throw new Error(`Development-only chunks found in production bundle: ${forbiddenFiles.join(", ")}`);
}

const bundleText = assetFiles
  .filter((asset) => asset.endsWith(".js"))
  .map((asset) => readFileSync(asset, "utf8"))
  .join("\n");
const leakedMarkers = forbiddenMarkers.filter((marker) => bundleText.includes(marker));
if (leakedMarkers.length) {
  throw new Error(`Development-only content found in production bundle: ${leakedMarkers.join(", ")}`);
}

console.log(`Production launch-surface verification passed (${assetFiles.length} assets checked).`);
