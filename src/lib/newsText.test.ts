import { describe, expect, it } from "vitest";
import {
  cleanNewsTitle,
  getNewsPresentation,
  isDuplicateNewsText,
  sanitizeNewsText,
} from "../../supabase/functions/_shared/news-text";

describe("sanitizeNewsText", () => {
  it("removes ordinary HTML while preserving text", () => {
    expect(sanitizeNewsText('<a href="https://example.com">Market update</a> <font>Business Daily</font>'))
      .toBe("Market update Business Daily");
  });

  it("removes HTML that was encoded inside RSS XML", () => {
    expect(sanitizeNewsText('&lt;a href=&quot;https://example.com&quot;&gt;EABL stake sale&lt;/a&gt;'))
      .toBe("EABL stake sale");
  });

  it("handles double-encoded entities", () => {
    expect(sanitizeNewsText('&amp;lt;b&amp;gt;Safaricom&amp;lt;/b&amp;gt; &amp;amp; M-PESA'))
      .toBe("Safaricom & M-PESA");
  });

  it("removes matching publisher labels and domains from titles", () => {
    expect(cleanNewsTitle("MPs seek safeguards in Diageo’s EABL stake sale - Business Daily", "Business Daily"))
      .toBe("MPs seek safeguards in Diageo’s EABL stake sale");
    expect(cleanNewsTitle("Markets rise - businessdailyafrica.com", "Business Daily"))
      .toBe("Markets rise");
  });

  it("detects headline and publisher-only summaries", () => {
    const title = "MPs seek safeguards in Diageo’s EABL stake sale - Business Daily";
    expect(isDuplicateNewsText(title, title, "Business Daily")).toBe(true);
    expect(isDuplicateNewsText(title, "MPs seek safeguards in Diageo’s EABL stake sale Business Daily", "Business Daily"))
      .toBe(true);
  });

  it("preserves genuine summaries and content", () => {
    const presentation = getNewsPresentation({
      title: "Safaricom reports results - Business Daily",
      summary: "Revenue increased as mobile-money usage expanded during the period.",
      content: "Long-form analysis.",
      source: "Business Daily",
    });
    expect(presentation).toEqual({
      title: "Safaricom reports results",
      body: "Revenue increased as mobile-money usage expanded during the period.",
      isHeadlineOnly: false,
    });
  });

  it("returns a headline-only presentation for duplicate fallback text", () => {
    expect(getNewsPresentation({
      title: "MPs seek safeguards in Diageo’s EABL stake sale - Business Daily",
      summary: "MPs seek safeguards in Diageo’s EABL stake sale - Business Daily",
      content: null,
      source: "Business Daily",
    })).toEqual({
      title: "MPs seek safeguards in Diageo’s EABL stake sale",
      body: "",
      isHeadlineOnly: true,
    });
  });
});
