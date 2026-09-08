import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("AI Lab page integration", () => {
  it("uses the centralized prompt processor instead of duplicating router branches", () => {
    const source = readFileSync(join(root, "src/pages/AiLabPage.tsx"), "utf8");
    expect(source).toContain("processAiLabUserPrompt(prompt, market.data, news.data");
    expect(source).toContain("naturalLanguage: true");
    expect(source).not.toContain('from "@/lib/aiLab/router"');
    expect(source).not.toContain('from "@/lib/aiLab/websiteLookup"');
  });

  it("connects privacy-safe feedback without sending message text", () => {
    const source = readFileSync(join(root, "src/pages/AiLabPage.tsx"), "utf8");
    expect(source).toContain('trackEvent("ai_lab_answer_feedback", { rating: value })');
    expect(source).not.toContain('trackEvent("ai_lab_answer_feedback", { prompt');
    expect(source).not.toContain('trackEvent("ai_lab_answer_feedback", { text');
    expect(source).toContain("onFeedback={handleFeedback}");
  });
});
