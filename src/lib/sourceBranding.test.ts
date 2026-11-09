import { describe, expect, it } from "vitest";
import { getSourceLogoUrl, extractDomainFromUrl } from "./sourceBranding";

describe("sourceBranding", () => {
  it("resolves official logos for the 5 YouTube briefing channels even when URL is YouTube", () => {
    expect(getSourceLogoUrl("Central Bank of Kenya", "https://www.youtube.com/watch?v=Fu-Ueab7Fxw")).toBe(
      "/images/news-sources/cbk.png"
    );
    expect(getSourceLogoUrl("The Kenyan Wall Street", "https://www.youtube.com/watch?v=VtoFgKqDPTQ")).toBe(
      "/images/news-sources/kenyan-wall-street.png"
    );
    expect(getSourceLogoUrl("CDSC Kenya", "https://www.youtube.com/watch?v=0HSQwIz7YAM")).toBe(
      "/images/news-sources/cdsc.png"
    );
    expect(getSourceLogoUrl("Nairobi Securities Exchange", "https://www.youtube.com/watch?v=12345")).toBe(
      "/images/news-sources/nse.png"
    );
    expect(getSourceLogoUrl("CNBC Africa", "https://www.youtube.com/watch?v=qGSSYGLkSz8")).toBe(
      "/images/news-sources/cnbc-africa.png"
    );
  });

  it("never returns the generic red YouTube favicon for unrecognized YouTube videos", () => {
    expect(getSourceLogoUrl("Random Creator", "https://www.youtube.com/watch?v=xyz")).toBeNull();
  });

  it("resolves existing Kenyan news publisher logos", () => {
    expect(getSourceLogoUrl("Business Daily", "https://www.businessdailyafrica.com/article")).toBe(
      "/images/sources/business-daily.png"
    );
    expect(getSourceLogoUrl("KBC", "https://www.kbc.co.ke/news")).toBe(
      "/images/news-sources/kbc.png"
    );
    expect(getSourceLogoUrl("Standard Media", "https://www.standardmedia.co.ke/business")).toBe(
      "/images/news-sources/standard.png"
    );
    expect(getSourceLogoUrl("Disrupt Africa", "https://www.facebook.com/disruptafrica/posts/123")).toBe(
      "https://www.google.com/s2/favicons?domain=disrupt-africa.com&sz=128"
    );
    expect(getSourceLogoUrl("Techweez", "https://www.facebook.com/techweez/posts/123")).toBe(
      "https://www.google.com/s2/favicons?domain=techweez.com&sz=128"
    );
    expect(getSourceLogoUrl("Mwango Capital", "https://twitter.com/MwangoCapital/status/123")).toBe(
      "https://www.google.com/s2/favicons?domain=mwangocapital.com&sz=128"
    );
  });

  it("never returns a generic social network favicon (FB, X) for unrecognized creators", () => {
    expect(getSourceLogoUrl("Random Facebook Creator", "https://www.facebook.com/random/posts/123")).toBeNull();
    expect(getSourceLogoUrl("Random Tweeter", "https://x.com/random/status/123")).toBeNull();
  });

  it("falls back to Google favicon service for general websites with valid domain", () => {
    expect(getSourceLogoUrl("Nation", "https://nation.africa/kenya/business")).toBe(
      "https://www.google.com/s2/favicons?domain=nation.africa&sz=128"
    );
  });
});
