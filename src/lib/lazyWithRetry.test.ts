import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isChunkLoadError, forceReloadWithCacheBust } from "./lazyWithRetry";

describe("isChunkLoadError", () => {
  it("detects standard dynamic import chunk errors", () => {
    expect(
      isChunkLoadError(new Error("Failed to fetch dynamically imported module: https://kenyafundfinder.com/assets/OverviewPage-CawMbEdL.js"))
    ).toBe(true);

    expect(
      isChunkLoadError(new Error("error loading dynamically imported module"))
    ).toBe(true);

    expect(
      isChunkLoadError(new Error("Importing a module script failed"))
    ).toBe(true);

    const chunkError = new Error("chunk 1234 failed to load");
    chunkError.name = "ChunkLoadError";
    expect(isChunkLoadError(chunkError)).toBe(true);
  });

  it("detects MIME type mismatch errors when HTML was returned for JS chunk", () => {
    const mimeError = new TypeError(
      "'text/html' is not a valid JavaScript MIME type for module script 'https://kenyafundfinder.com/assets/AreaChart-B1FwvBd0.js'."
    );
    expect(isChunkLoadError(mimeError)).toBe(true);
  });

  it("detects failed to load module script errors", () => {
    expect(
      isChunkLoadError(new Error("Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of 'text/html'."))
    ).toBe(true);
  });

  it("returns false for ordinary runtime errors", () => {
    expect(isChunkLoadError(new Error("NetworkError: Failed to fetch API"))).toBe(false);
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false);
    expect(isChunkLoadError(new ReferenceError("foo is not defined"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe("forceReloadWithCacheBust", () => {
  const originalLocation = window.location;
  const originalCaches = (window as any).caches;

  beforeEach(() => {
    delete (window as any).location;
    (window as any).location = {
      href: "https://kenyafundfinder.com/overview",
      replace: vi.fn(),
      reload: vi.fn(),
    };
  });

  afterEach(() => {
    (window as any).location = originalLocation;
    (window as any).caches = originalCaches;
  });

  it("adds _v query parameter and replaces location", () => {
    forceReloadWithCacheBust();
    expect(window.location.replace).toHaveBeenCalledTimes(1);
    const calledUrl = (window.location.replace as any).mock.calls[0][0];
    expect(calledUrl).toContain("https://kenyafundfinder.com/overview?_v=");
  });

  it("cleans caches if caches API is present", async () => {
    const deleteMock = vi.fn().mockResolvedValue(true);
    (window as any).caches = {
      keys: vi.fn().mockResolvedValue(["cache-v1", "cache-v2"]),
      delete: deleteMock,
    };

    forceReloadWithCacheBust();
    // Allow promise microtasks
    await Promise.resolve();
    expect(deleteMock).toHaveBeenCalledWith("cache-v1");
    expect(deleteMock).toHaveBeenCalledWith("cache-v2");
  });
});
