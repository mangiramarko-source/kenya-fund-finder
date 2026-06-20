// Phase 10 — controlled public beta access gate (default: public).

import type { User } from "@supabase/supabase-js";

export type AiLabAccessMode = "public" | "admin-only" | "controlled-beta";

export const AI_LAB_ACCESS_MODE: AiLabAccessMode = "public";

export const AI_LAB_BETA_ALLOWLIST: readonly string[] = [];

export const AI_LAB_LOGIN_PATH = "/admin/login" as const;

export type AiLabAccessReason =
  | "public"
  | "admin"
  | "beta-allowlist"
  | "logged-out"
  | "admin-only-locked"
  | "not-on-allowlist";

export type AiLabAccessInput = {
  user: User | null;
  isAdmin: boolean;
  mode?: AiLabAccessMode;
  allowlist?: readonly string[];
};

export type AiLabAccessResult = {
  allowed: boolean;
  reason: AiLabAccessReason;
  loginPath: typeof AI_LAB_LOGIN_PATH;
  mode: AiLabAccessMode;
  modeLabel: string;
};

export const AI_LAB_ACCESS_DENIED_COPY: Record<
  Exclude<AiLabAccessReason, "admin" | "beta-allowlist" | "public">,
  string
> = {
  "logged-out":
    "Sign in with an admin account to access AI Lab during the admin-only preview.",
  "admin-only-locked":
    "AI Lab is in admin-only preview. Sign in with an admin account to continue.",
  "not-on-allowlist":
    "AI Lab controlled beta access is limited to selected accounts. Contact the team if you need access.",
};

const MODE_LABELS: Record<AiLabAccessMode, string> = {
  public: "Public",
  "admin-only": "Admin only",
  "controlled-beta": "Controlled beta",
};

export function normalizeAiLabEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

function isOnAllowlist(
  email: string | null | undefined,
  allowlist: readonly string[],
): boolean {
  const normalized = normalizeAiLabEmail(email);
  if (!normalized) return false;
  return allowlist.some((entry) => normalizeAiLabEmail(entry) === normalized);
}

export function resolveAiLabAccess(input: AiLabAccessInput): AiLabAccessResult {
  const mode = input.mode ?? AI_LAB_ACCESS_MODE;
  const allowlist = input.allowlist ?? AI_LAB_BETA_ALLOWLIST;
  const modeLabel = MODE_LABELS[mode];

  if (mode === "public") {
    return {
      allowed: true,
      reason: input.isAdmin ? "admin" : "public",
      loginPath: AI_LAB_LOGIN_PATH,
      mode,
      modeLabel,
    };
  }

  if (!input.user) {
    return {
      allowed: false,
      reason: "logged-out",
      loginPath: AI_LAB_LOGIN_PATH,
      mode,
      modeLabel,
    };
  }

  if (input.isAdmin) {
    return {
      allowed: true,
      reason: "admin",
      loginPath: AI_LAB_LOGIN_PATH,
      mode,
      modeLabel,
    };
  }

  if (mode === "admin-only") {
    return {
      allowed: false,
      reason: "admin-only-locked",
      loginPath: AI_LAB_LOGIN_PATH,
      mode,
      modeLabel,
    };
  }

  if (isOnAllowlist(input.user.email, allowlist)) {
    return {
      allowed: true,
      reason: "beta-allowlist",
      loginPath: AI_LAB_LOGIN_PATH,
      mode,
      modeLabel,
    };
  }

  return {
    allowed: false,
    reason: "not-on-allowlist",
    loginPath: AI_LAB_LOGIN_PATH,
    mode,
    modeLabel,
  };
}

export function canShowAiLabNav(input: AiLabAccessInput): boolean {
  return resolveAiLabAccess(input).allowed;
}

export function getAiLabAccessDeniedMessage(reason: AiLabAccessReason): string {
  if (reason === "admin" || reason === "beta-allowlist" || reason === "public") {
    return "";
  }
  return AI_LAB_ACCESS_DENIED_COPY[reason];
}
