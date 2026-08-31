import { describe, expect, it, vi } from "vitest";
import {
  handleDeleteAccountRequest,
  type AccountDeletionDependencies,
} from "../../supabase/functions/delete-account/logic.ts";

function dependencies(overrides: Partial<AccountDeletionDependencies> = {}): AccountDeletionDependencies {
  return {
    getUser: vi.fn(async () => ({ id: "user-1", email: "User@Example.com" })),
    isAdmin: vi.fn(async () => false),
    listAvatarPaths: vi.fn(async () => ["user-1/avatar.jpg", "user-1/avatar.png"]),
    removeAvatarPaths: vi.fn(async () => undefined),
    deleteCommunicationOutbox: vi.fn(async () => undefined),
    deleteCommunicationSuppressions: vi.fn(async () => undefined),
    deleteAuthUser: vi.fn(async () => undefined),
    logFailure: vi.fn(),
    ...overrides,
  };
}

function request(body: unknown = { confirmation: "DELETE" }, authorization = "Bearer valid-token") {
  return new Request("https://example.com/delete-account", {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function responseBody(response: Response) {
  return await response.json() as { deleted?: boolean; error?: { code?: string } };
}

describe("handleDeleteAccountRequest", () => {
  it("rejects requests without an authenticated session", async () => {
    const deps = dependencies();
    const response = await handleDeleteAccountRequest(request(undefined, ""), deps);

    expect(response.status).toBe(401);
    expect((await responseBody(response)).error?.code).toBe("unauthorized");
    expect(deps.getUser).not.toHaveBeenCalled();
  });

  it("requires the exact DELETE confirmation", async () => {
    const deps = dependencies();
    const response = await handleDeleteAccountRequest(request({ confirmation: "delete" }), deps);

    expect(response.status).toBe(400);
    expect((await responseBody(response)).error?.code).toBe("invalid_confirmation");
    expect(deps.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON values as invalid confirmation", async () => {
    const deps = dependencies();
    const response = await handleDeleteAccountRequest(request(null), deps);

    expect(response.status).toBe(400);
    expect((await responseBody(response)).error?.code).toBe("invalid_confirmation");
    expect(deps.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("derives the target from the verified user and ignores a supplied user id", async () => {
    const deps = dependencies();
    const response = await handleDeleteAccountRequest(
      request({ confirmation: "DELETE", userId: "other-user" }),
      deps,
    );

    expect(response.status).toBe(200);
    expect(deps.deleteAuthUser).toHaveBeenCalledWith("user-1");
    expect(deps.deleteAuthUser).not.toHaveBeenCalledWith("other-user");
  });

  it("blocks administrator self-deletion", async () => {
    const deps = dependencies({ isAdmin: vi.fn(async () => true) });
    const response = await handleDeleteAccountRequest(request(), deps);

    expect(response.status).toBe(403);
    expect((await responseBody(response)).error?.code).toBe("admin_deletion_blocked");
    expect(deps.isAdmin).toHaveBeenCalledWith({ id: "user-1", email: "User@Example.com" });
    expect(deps.listAvatarPaths).not.toHaveBeenCalled();
  });

  it("removes avatars and private communication data before deleting Auth", async () => {
    const calls: string[] = [];
    const deps = dependencies({
      listAvatarPaths: vi.fn(async () => {
        calls.push("list-avatars");
        return ["user-1/avatar.jpg", "user-1/avatar.png"];
      }),
      removeAvatarPaths: vi.fn(async () => { calls.push("remove-avatars"); }),
      deleteCommunicationOutbox: vi.fn(async () => { calls.push("delete-outbox"); }),
      deleteCommunicationSuppressions: vi.fn(async (email) => { calls.push(`delete-suppressions:${email}`); }),
      deleteAuthUser: vi.fn(async () => { calls.push("delete-auth"); }),
    });

    const response = await handleDeleteAccountRequest(request(), deps);

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({ deleted: true });
    expect(calls).toEqual([
      "list-avatars",
      "remove-avatars",
      "delete-outbox",
      "delete-suppressions:user@example.com",
      "delete-auth",
    ]);
  });

  it("fails closed when avatar cleanup fails", async () => {
    const deps = dependencies({ removeAvatarPaths: vi.fn(async () => { throw new Error("storage"); }) });
    const response = await handleDeleteAccountRequest(request(), deps, { requestId: "request-1" });

    expect(response.status).toBe(409);
    expect((await responseBody(response)).error?.code).toBe("cleanup_failed");
    expect(deps.deleteAuthUser).not.toHaveBeenCalled();
    expect(deps.logFailure).toHaveBeenCalledWith("avatar_cleanup", "request-1");
  });

  it("reports Auth deletion failures without exposing provider details", async () => {
    const deps = dependencies({ deleteAuthUser: vi.fn(async () => { throw new Error("foreign key detail"); }) });
    const response = await handleDeleteAccountRequest(request(), deps);
    const body = await responseBody(response);

    expect(response.status).toBe(409);
    expect(body.error?.code).toBe("account_deletion_failed");
    expect(JSON.stringify(body)).not.toContain("foreign key detail");
  });
});
