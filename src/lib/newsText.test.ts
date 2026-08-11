import { describe, expect, it } from "vitest";
import { sanitizeNewsText } from "../../supabase/functions/_shared/news-text";

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
});
