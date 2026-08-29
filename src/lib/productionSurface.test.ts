import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
const productionRouteSource = appSource.slice(0, appSource.indexOf("{DevOnlyPages ?"));
const devOnlyRouteSource = appSource.slice(appSource.indexOf("{DevOnlyPages ?"));

const internalPaths = [
  "/checklist",
  "/stocks-demo",
  "/demo-stocks-feed",
  "/demo-feed",
  "/demo-stock-insights",
  "/stocks/demo-2",
  "/dev/email-preview",
  "/dev/welcome-preview",
  "/dev/notification-preview",
];

describe("production launch surface", () => {
  it("registers internal routes only in the development-only route block", () => {
    expect(appSource).toContain("const DevOnlyPages = import.meta.env.DEV");

    for (const path of internalPaths) {
      expect(productionRouteSource).not.toContain(`path=\"${path}\"`);
      expect(devOnlyRouteSource).toContain(`path=\"${path}\"`);
    }
  });

  it("does not eagerly import development-only page modules", () => {
    for (const page of [
      "ChecklistPage",
      "StocksDemoPage",
      "DemoStocksPage",
      "DemoStockFeedPage",
      "StockDecisionFeedDemoPage",
      "StocksMobileDesktopDemoPage",
      "DevEmailPreviewPage",
      "DevWelcomePreviewPage",
      "DevNotificationPreviewPage",
    ]) {
      expect(productionRouteSource).not.toContain(`const ${page} = lazy`);
    }
  });
});
