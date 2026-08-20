import { describe, expect, it, vi } from "vitest";
import { authorizePrivilegedRequest } from "../../supabase/functions/_shared/privileged-auth";

const endpoint = "https://example.supabase.co/functions/v1/fetch-market-data";
const namedKeys = JSON.stringify({ automations: "sb_secret_automation_test_value" });

function request(headers: HeadersInit = {}) {
  return new Request(endpoint, { method: "POST", headers });
}

describe("privileged Edge Function authorization", () => {
  it("rejects anonymous requests before user or admin lookup", async () => {
    const verifyUser = vi.fn(async () => null);
    const isAdmin = vi.fn(async () => false);

    await expect(authorizePrivilegedRequest(request(), {
      namedSecretKeysJson: namedKeys,
      verifyUser,
      isAdmin,
    })).resolves.toEqual({ ok: false, status: 401 });
    expect(verifyUser).not.toHaveBeenCalled();
    expect(isAdmin).not.toHaveBeenCalled();
  });

  it("rejects a fake JWT role claim after server-side verification fails", async () => {
    const verifyUser = vi.fn(async () => null);
    const isAdmin = vi.fn(async () => true);

    const result = await authorizePrivilegedRequest(request({
      Authorization: "Bearer fake.header.payload",
    }), { namedSecretKeysJson: namedKeys, verifyUser, isAdmin });

    expect(result).toEqual({ ok: false, status: 401 });
    expect(verifyUser).toHaveBeenCalledWith("fake.header.payload");
    expect(isAdmin).not.toHaveBeenCalled();
  });

  it("rejects a verified ordinary user", async () => {
    const result = await authorizePrivilegedRequest(request({
      Authorization: "Bearer valid-user-token",
    }), {
      namedSecretKeysJson: namedKeys,
      verifyUser: async () => "ordinary-user-id",
      isAdmin: async () => false,
    });

    expect(result).toEqual({ ok: false, status: 403 });
  });

  it("accepts a verified administrator", async () => {
    const result = await authorizePrivilegedRequest(request({
      Authorization: "Bearer valid-admin-token",
    }), {
      namedSecretKeysJson: namedKeys,
      verifyUser: async () => "admin-user-id",
      isAdmin: async (userId) => userId === "admin-user-id",
    });

    expect(result).toEqual({ ok: true, kind: "admin", userId: "admin-user-id" });
  });

  it("accepts only the named scheduled-service key in the apikey header", async () => {
    const verifyUser = vi.fn(async () => null);
    const isAdmin = vi.fn(async () => false);

    const accepted = await authorizePrivilegedRequest(request({
      apikey: "sb_secret_automation_test_value",
    }), { namedSecretKeysJson: namedKeys, verifyUser, isAdmin });
    const rejected = await authorizePrivilegedRequest(request({
      apikey: "sb_secret_wrong_value",
    }), { namedSecretKeysJson: namedKeys, verifyUser, isAdmin });

    expect(accepted).toEqual({ ok: true, kind: "service" });
    expect(rejected).toEqual({ ok: false, status: 401 });
    expect(verifyUser).not.toHaveBeenCalled();
    expect(isAdmin).not.toHaveBeenCalled();
  });

  it("does not accept a secret supplied as an Authorization bearer", async () => {
    const result = await authorizePrivilegedRequest(request({
      Authorization: "Bearer sb_secret_automation_test_value",
    }), {
      namedSecretKeysJson: namedKeys,
      verifyUser: async () => null,
      isAdmin: async () => true,
    });

    expect(result).toEqual({ ok: false, status: 401 });
  });
});
