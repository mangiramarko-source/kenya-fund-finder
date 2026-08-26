import { describe, expect, it, vi } from "vitest";
import { sendMarketBriefDemo } from "./sendMarketBriefDemo";

const ready = { status: "ready", send_mode: "internal", allowlist_count: 1, demo_data_only: true };
const accepted = { status: "accepted", send_mode: "internal", recipient_count: 1 };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("admin Market Brief demo", () => {
  it("preflights before making exactly one restricted demo submission", async () => {
    const request = vi.fn().mockResolvedValueOnce(response(ready)).mockResolvedValueOnce(response(accepted));
    await expect(sendMarketBriefDemo("https://kff.example/", "test-token", request)).resolves.toEqual(accepted);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls.map(call => [call[0], JSON.parse(call[1].body)])).toEqual([
      ["https://kff.example/functions/v1/send-market-brief-demo", { preflight: true }],
      ["https://kff.example/functions/v1/send-market-brief-demo", { confirm_demo: true }],
    ]);
    expect(request.mock.calls[1][1].headers).toEqual({ Authorization: "Bearer test-token", "Content-Type": "application/json" });
  });
  it.each([
    { ...ready, send_mode: "live" }, { ...ready, allowlist_count: 2 },
    { ...ready, status: "blocked" }, { ...ready, demo_data_only: false },
  ])("never sends after an unsafe preflight: %j", async result => {
    const request = vi.fn().mockResolvedValue(response(result));
    await expect(sendMarketBriefDemo("https://kff.example", "test-token", request)).rejects.toThrow("safety checks failed");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("reports server errors and does not retry an uncertain submission", async () => {
    const request = vi.fn().mockResolvedValueOnce(response(ready)).mockResolvedValueOnce(response({ error: "Resend rejected demo delivery" }, 502));
    await expect(sendMarketBriefDemo("https://kff.example", "test-token", request)).rejects.toThrow("Resend rejected demo delivery");
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("does not treat an unconfirmed 200 response as a sent email", async () => {
    const request = vi.fn().mockResolvedValueOnce(response(ready)).mockResolvedValueOnce(response({ status: "unknown" }));
    await expect(sendMarketBriefDemo("https://kff.example", "test-token", request)).rejects.toThrow("Acceptance was not confirmed");
  });
});
