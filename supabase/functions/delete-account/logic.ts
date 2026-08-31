export type AccountDeletionUser = {
  id: string;
  email?: string | null;
};

export type AccountDeletionStage =
  | "authentication"
  | "authorization"
  | "avatar_cleanup"
  | "communication_cleanup"
  | "auth_deletion"
  | "unexpected";

export interface AccountDeletionDependencies {
  getUser(accessToken: string): Promise<AccountDeletionUser | null>;
  isAdmin(user: AccountDeletionUser): Promise<boolean>;
  listAvatarPaths(userId: string): Promise<string[]>;
  removeAvatarPaths(paths: string[]): Promise<void>;
  deleteCommunicationOutbox(userId: string): Promise<void>;
  deleteCommunicationSuppressions(email: string): Promise<void>;
  deleteAuthUser(userId: string): Promise<void>;
  logFailure(stage: AccountDeletionStage, requestId: string): void;
}

type ErrorCode =
  | "invalid_confirmation"
  | "unauthorized"
  | "admin_deletion_blocked"
  | "cleanup_failed"
  | "account_deletion_failed"
  | "internal_error";

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  headers: HeadersInit = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  headers: HeadersInit,
) {
  return jsonResponse(status, { error: { code, message } }, headers);
}

function bearerToken(header: string | null): string {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

export async function handleDeleteAccountRequest(
  request: Request,
  dependencies: AccountDeletionDependencies,
  options: { requestId?: string; responseHeaders?: HeadersInit } = {},
): Promise<Response> {
  const requestId = options.requestId ?? crypto.randomUUID();
  const responseHeaders = options.responseHeaders ?? {};

  if (request.method !== "POST") {
    return jsonResponse(405, {
      error: { code: "method_not_allowed", message: "Method not allowed." },
    }, {
      ...responseHeaders,
      Allow: "POST",
    });
  }

  const token = bearerToken(request.headers.get("authorization"));
  if (!token) {
    return errorResponse(
      401,
      "unauthorized",
      "Your session is invalid or has expired.",
      responseHeaders,
    );
  }

  let user: AccountDeletionUser | null;
  try {
    user = await dependencies.getUser(token);
  } catch {
    dependencies.logFailure("authentication", requestId);
    return errorResponse(
      401,
      "unauthorized",
      "Your session is invalid or has expired.",
      responseHeaders,
    );
  }
  if (!user) {
    return errorResponse(
      401,
      "unauthorized",
      "Your session is invalid or has expired.",
      responseHeaders,
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(
      400,
      "invalid_confirmation",
      "Type DELETE to confirm account deletion.",
      responseHeaders,
    );
  }
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    !("confirmation" in payload) ||
    payload.confirmation !== "DELETE"
  ) {
    return errorResponse(
      400,
      "invalid_confirmation",
      "Type DELETE to confirm account deletion.",
      responseHeaders,
    );
  }

  try {
    if (await dependencies.isAdmin(user)) {
      return errorResponse(
        403,
        "admin_deletion_blocked",
        "Administrator accounts must be removed through the controlled support process.",
        responseHeaders,
      );
    }
  } catch {
    dependencies.logFailure("authorization", requestId);
    return errorResponse(
      500,
      "internal_error",
      "Account deletion is temporarily unavailable.",
      responseHeaders,
    );
  }

  try {
    const avatarPaths = await dependencies.listAvatarPaths(user.id);
    if (avatarPaths.length > 0) {
      await dependencies.removeAvatarPaths(avatarPaths);
    }
  } catch {
    dependencies.logFailure("avatar_cleanup", requestId);
    return errorResponse(
      409,
      "cleanup_failed",
      "We could not remove all account files. Please try again.",
      responseHeaders,
    );
  }

  try {
    await dependencies.deleteCommunicationOutbox(user.id);
    if (user.email) {
      await dependencies.deleteCommunicationSuppressions(
        user.email.trim().toLowerCase(),
      );
    }
  } catch {
    dependencies.logFailure("communication_cleanup", requestId);
    return errorResponse(
      409,
      "cleanup_failed",
      "We could not remove all private account data. Please try again.",
      responseHeaders,
    );
  }

  try {
    await dependencies.deleteAuthUser(user.id);
  } catch {
    dependencies.logFailure("auth_deletion", requestId);
    return errorResponse(
      409,
      "account_deletion_failed",
      "We could not delete the account. Please try again.",
      responseHeaders,
    );
  }

  return jsonResponse(200, { deleted: true }, responseHeaders);
}
