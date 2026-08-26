import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const worker = read("../../supabase/functions/process-communication-outbox/index.ts");
const marketProducer = read("../../supabase/functions/enqueue-market-brief/index.ts");
const newsProducer = read("../../supabase/functions/run-news-highlights-edition/index.ts");
const webhook = read("../../supabase/functions/resend-webhook/index.ts");
const migration = read("../../supabase/migrations/20260826202709_safe_email_automation_foundation.sql");

describe("safe communication automation invariants", () => {
  it("keeps disabled mode read-only and requires category-scoped claims", () => {
    expect(worker.indexOf('sendMode === "disabled"')).toBeLessThan(worker.indexOf('supabase.rpc("claim_communication_category_batch"'));
    expect(worker).toContain('error: "Explicit communication category required"');
    expect(worker).toContain("p_allowed_user_ids: allowedUserIds");
    expect(worker).not.toContain('supabase.rpc("claim_communication_batch"');
    expect(worker).toContain("Math.min(5");
    expect(worker).toContain("p_lease_seconds: 300");
  });

  it("freezes provider requests and fences every worker transition", () => {
    expect(worker).toContain("provider_request: providerRequest");
    expect(worker).toContain("provider_request_frozen_at");
    expect(worker).toContain('.eq("claim_token", row.claim_token)');
    expect(worker).toContain('status: "submission_unknown"');
    expect(worker).toContain('"Idempotency-Key": row.idempotency_key');
    expect(worker).toContain("renderMarketBriefEmail");
  });

  it("requires consent and applies internal scope before producer inserts", () => {
    for (const producer of [marketProducer, newsProducer]) {
      expect(producer).toContain('.not("market_brief_email_consented_at", "is", null)');
      expect(producer).toContain('sendMode === "internal" && !allowlist.has(email)');
      expect(producer.indexOf('!allowlist.has(email)')).toBeLessThan(producer.indexOf('.from("communication_outbox")'));
    }
    expect(marketProducer).toContain('.eq("market_date", intendedDate)');
    expect(marketProducer).not.toContain('order("market_date"');
  });

  it("records delivery events once and includes all supported Resend states", () => {
    for (const type of ["email.sent", "email.delivered", "email.delivery_delayed", "email.failed", "email.bounced", "email.complained", "email.suppressed"]) {
      expect(webhook).toContain(type);
    }
    expect(webhook).toContain('supabase.rpc("record_communication_delivery_event"');
    expect(migration).toContain("webhook_event_id text not null unique");
    expect(migration).toContain("communication_delivery_events");
  });

  it("records explicit consent without installing schedules", () => {
    expect(migration).toContain("price_alert_email_consented_at");
    expect(migration).toContain("market_brief_email_consented_at");
    expect(migration).toContain("update_communication_preferences_service");
    expect(migration).not.toContain("cron.schedule(");
  });
});
