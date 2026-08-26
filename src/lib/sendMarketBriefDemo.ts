// Use the same narrow Authorization/Content-Type request as the verified console
// demo. The endpoint intentionally does not enable arbitrary browser headers.
export async function sendMarketBriefDemo(url: string, token: string, request: typeof fetch = fetch) {
  async function post(body: Record<string, boolean>) {
    const response = await request(`${url.replace(/\/$/, "")}/functions/v1/send-market-brief-demo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? `Demo request failed (${response.status})`);
    return result;
  }
  const ready = await post({ preflight: true });
  if (ready.status !== "ready" || ready.send_mode !== "internal" || ready.allowlist_count !== 1 || ready.demo_data_only !== true) {
    throw new Error("Demo safety checks failed. Nothing was sent.");
  }
  const sent = await post({ confirm_demo: true });
  if (sent.status !== "accepted" || sent.recipient_count !== 1 || sent.send_mode !== "internal") {
    throw new Error("Acceptance was not confirmed. Check delivery before retrying.");
  }
  return sent;
}
