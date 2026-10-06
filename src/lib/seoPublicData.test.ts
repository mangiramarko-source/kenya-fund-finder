import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seoPublicData } from "../../scripts/seo-public-data";
vi.mock("vite", () => ({ loadEnv: () => ({}) }));
beforeEach(() => vi.stubGlobal("AbortSignal", { timeout: () => new AbortController().signal }));
afterEach(() => vi.unstubAllGlobals());
describe("SEO public data transport", () => {
  it("fetches every page rather than truncating the directory", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: Array.from({ length: 200 }, (_, i) => ({ symbol: String(i) })), count: 201 }))).mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ symbol: "LAST" }], count: 201 })));
    vi.stubGlobal("fetch", fetchMock);
    expect(await seoPublicData("stocks", "symbol", "symbol.asc")).toHaveLength(201);
    expect(fetchMock.mock.calls[1][0]).toContain("offset=200");
  });
  it("rejects failed requests and invalid payloads instead of generating thin pages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("denied", { status: 401 })));
    await expect(seoPublicData("stocks", "symbol", "symbol.asc")).rejects.toThrow("HTTP 401");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await expect(seoPublicData("funds", "slug", "name.asc")).rejects.toThrow("invalid payload");
  });
});
