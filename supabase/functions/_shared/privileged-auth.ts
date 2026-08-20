import { readNamedSecretKey } from "./supabase-keys.ts";

export type PrivilegedAuthorization =
  | { ok: true; kind: "admin" | "service"; userId?: string }
  | { ok: false; status: 401 | 403 };

interface PrivilegedAuthDependencies {
  namedSecretKeysJson?: string;
  secretName?: string;
  verifyUser: (accessToken: string) => Promise<string | null>;
  isAdmin: (userId: string) => Promise<boolean>;
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return mismatch === 0;
}

export function isNamedSecretRequest(
  request: Request,
  namedSecretKeysJson: string | undefined,
  secretName = "automations",
): boolean {
  const expectedSecret = readNamedSecretKey(namedSecretKeysJson, secretName);
  const suppliedApiKey = request.headers.get("apikey")?.trim() ?? "";

  return Boolean(
    expectedSecret &&
      suppliedApiKey &&
      constantTimeEqual(suppliedApiKey, expectedSecret),
  );
}

function bearerToken(header: string | null): string {
  if (!header) return "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

export async function authorizePrivilegedRequest(
  request: Request,
  dependencies: PrivilegedAuthDependencies,
): Promise<PrivilegedAuthorization> {
  if (isNamedSecretRequest(
    request,
    dependencies.namedSecretKeysJson,
    dependencies.secretName,
  )) {
    return { ok: true, kind: "service" };
  }

  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return { ok: false, status: 401 };

  const userId = await dependencies.verifyUser(token);
  if (!userId) return { ok: false, status: 401 };

  if (!(await dependencies.isAdmin(userId))) {
    return { ok: false, status: 403 };
  }

  return { ok: true, kind: "admin", userId };
}
