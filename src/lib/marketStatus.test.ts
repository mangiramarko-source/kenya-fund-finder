import { describe, expect, it } from "vitest";
import { getNairobiMarketDate, isGlobalMarketOpen, isKenyanMarketOpen } from "./utils";

describe("automatic market status", () => {
  it("uses the 9 AM to 5 PM EAT stock window", () => {
    expect(isKenyanMarketOpen(new Date("2026-08-10T05:59:00Z"))).toBe(false);
    expect(isKenyanMarketOpen(new Date("2026-08-10T06:00:00Z"))).toBe(true);
    expect(isKenyanMarketOpen(new Date("2026-08-10T13:59:00Z"))).toBe(true);
    expect(isKenyanMarketOpen(new Date("2026-08-10T14:00:00Z"))).toBe(false);
    expect(isKenyanMarketOpen(new Date("2026-08-09T10:00:00Z"))).toBe(false);
  });

  it("uses standard global 24/5 boundaries", () => {
    expect(isGlobalMarketOpen(new Date("2026-08-14T21:59:00Z"))).toBe(true);
    expect(isGlobalMarketOpen(new Date("2026-08-14T22:00:00Z"))).toBe(false);
    expect(isGlobalMarketOpen(new Date("2026-08-16T21:59:00Z"))).toBe(false);
    expect(isGlobalMarketOpen(new Date("2026-08-16T22:00:00Z"))).toBe(true);
  });

  it("rolls Nairobi weekend dates back to Friday", () => {
    expect(getNairobiMarketDate(new Date("2026-08-15T09:00:00Z")).toISOString().slice(0, 10)).toBe("2026-08-14");
    expect(getNairobiMarketDate(new Date("2026-08-16T09:00:00Z")).toISOString().slice(0, 10)).toBe("2026-08-14");
    expect(getNairobiMarketDate(new Date("2026-08-17T09:00:00Z")).toISOString().slice(0, 10)).toBe("2026-08-17");
  });
});
