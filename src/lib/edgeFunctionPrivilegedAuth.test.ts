import { describe, expect, it, vi } from "vitest";
import { authorizePrivilegedRequest } from "../../supabase/functions/_shared/privileged-auth";

const endpoints = [
  "https://example.supabase.co/functions/v1/check-price-alerts",
  "https://example.supabase.co/functions/v1/process-email-queue",
  "https://example.supabase.co/functions/v1/send-market-update",
  "https://example.supabase.co/functions/v1/sync-portfolio-prices",
  "https://example.supabase.co/functions/v1/enrich-article",
  "https://example.supabase.co/functions/v1/fetch-stock-disclosures",
];
const namedKeys = JSON.stringify({ automations: "sb_secret_automation_test_value" });

function request(url: string, headers: HeadersInit = {}) {
  return new Request(url, { method: "POST", headers });
}

describe("privileged Edge Function authorization", () => {
  it.each(endpoints)("rejects anonymous requests for %s before user or admin lookup", async (endpoint) => {
    const verifyUser = vi.fn(async () => null);
    const isAdmin = vi.fn(async () => false);

    await expect(authorizePrivilegedRequest(request(endpoint), {
      namedSecretKeysJson: namedKeys,
      verifyUser,
      isAdmin,
    })).resolves.toEqual({ ok: false, status: 401 });
    expect(verifyUser).not.toHaveBeenCalled();
    expect(isAdmin).not.toHaveBeenCalled();
  });

  it.each(endpoints)("rejects fake JWT role claim for %s after server-side verification fails", async (endpoint) => {
    const verifyUser = vi.fn(async () => null);
    const isAdmin = vi.fn(async () => true);

    const result = await authorizePrivilegedRequest(request(endpoint, {
      Authorization: "Bearer eyJhbGciOiJub25lIn0.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.",
    }), { namedSecretKeysJson: namedKeys, verifyUser, isAdmin });

    expect(result).toEqual({ ok: false, status: 401 });
    expect(verifyUser).toHaveBeenCalledWith("eyJhbGciOiJub25lIn0.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.");
    expect(isAdmin).not.toHaveBeenCalled();
  });

  it.each(endpoints)("rejects a verified ordinary user for %s", async (endpoint) => {
    const result = await authorizePrivilegedRequest(request(endpoint, {
      Authorization: "Bearer valid-user-token",
    }), {
      namedSecretKeysJson: namedKeys,
      verifyUser: async () => "ordinary-user-id",
      isAdmin: async () => false,
    });

    expect(result).toEqual({ ok: false, status: 403 });
  });

  it.each(endpoints)("accepts a verified administrator for %s", async (endpoint) => {
    const result = await authorizePrivilegedRequest(request(endpoint, {
      Authorization: "Bearer valid-admin-token",
    }), {
      namedSecretKeysJson: namedKeys,
      verifyUser: async () => "admin-user-id",
      isAdmin: async (userId) => userId === "admin-user-id",
    });

    expect(result).toEqual({ ok: true, kind: "admin", userId: "admin-user-id" });
  });

  it.each(endpoints)("accepts only the named scheduled-service key in the apikey header for %s", async (endpoint) => {
    const verifyUser = vi.fn(async () => null);
    const isAdmin = vi.fn(async () => false);

    const accepted = await authorizePrivilegedRequest(request(endpoint, {
      apikey: "sb_secret_automation_test_value",
    }), { namedSecretKeysJson: namedKeys, verifyUser, isAdmin });
    const rejected = await authorizePrivilegedRequest(request(endpoint, {
      apikey: "sb_secret_wrong_value",
    }), { namedSecretKeysJson: namedKeys, verifyUser, isAdmin });

    expect(accepted).toEqual({ ok: true, kind: "service" });
    expect(rejected).toEqual({ ok: false, status: 401 });
    expect(verifyUser).not.toHaveBeenCalled();
    expect(isAdmin).not.toHaveBeenCalled();
  });

  it.each(endpoints)("does not accept a secret supplied as an Authorization bearer for %s", async (endpoint) => {
    const result = await authorizePrivilegedRequest(request(endpoint, {
      Authorization: "Bearer sb_secret_automation_test_value",
    }), {
      namedSecretKeysJson: namedKeys,
      verifyUser: async () => null,
      isAdmin: async () => true,
    });

    expect(result).toEqual({ ok: false, status: 401 });
  });
});
