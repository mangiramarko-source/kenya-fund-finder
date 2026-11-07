import { describe, it, expect } from "vitest";
import { getNewsImage, optimizeImageUrl } from "./news-images";

describe("news-images resolution", () => {
  it("preserves genuine publisher image URL", () => {
    const genuineUrl = "https://cdn.businessdaily.africa/story-123.jpg";
    const result = getNewsImage(genuineUrl, "Markets", "art-1", false, "Business Daily");
    expect(result).toBe(genuineUrl);
  });

  it("optimizes Unsplash URLs when article actually provides one", () => {
    const genuineUnsplash = "https://images.unsplash.com/photo-12345?foo=bar";
    const result = getNewsImage(genuineUnsplash, "Banking", "art-2", false);
    expect(result).toContain("images.unsplash.com");
    expect(result).toContain("w=560");
    expect(result).toContain("h=350");
  });

  it("returns null when imageUrl is null", () => {
    const result = getNewsImage(null, "Economy", "art-3", false, "Business Daily");
    expect(result).toBeNull();
  });

  it("returns null when imageUrl is undefined", () => {
    const result = getNewsImage(undefined, "Markets", "art-4", true);
    expect(result).toBeNull();
  });

  it("returns null when imageUrl is empty string or whitespace", () => {
    expect(getNewsImage("", "Tech", "art-5")).toBeNull();
    expect(getNewsImage("   ", "Tech", "art-6")).toBeNull();
  });

  it("does not generate stock photos for KBC or Standard Media when imageUrl is missing", () => {
    expect(getNewsImage(null, "News", "art-7", false, "KBC")).toBeNull();
    expect(getNewsImage(null, "News", "art-8", false, "Standard Media")).toBeNull();
  });
});
