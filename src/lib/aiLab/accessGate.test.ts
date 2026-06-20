/**
 * Phase 10 — controlled beta access gate tests.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { User } from "@supabase/supabase-js";
import {
  AI_LAB_ACCESS_MODE,
  AI_LAB_LOGIN_PATH,
  canShowAiLabNav,
  normalizeAiLabEmail,
  resolveAiLabAccess,
} from "./accessGate";

const __dirname = dirname(fileURLToPath(import.meta.url));

const mkUser = (email: string): User =>
  ({ id: "u1", email } as User);

describe("Phase 10 access gate", () => {
  it("default mode is public", () => {
    expect(AI_LAB_ACCESS_MODE).toBe("public");
  });

  it("logged-out user is allowed in default public mode", () => {
    const access = resolveAiLabAccess({ user: null, isAdmin: false });
    expect(access.allowed).toBe(true);
    expect(access.reason).toBe("public");
    expect(access.mode).toBe("public");
  });

  it("non-admin signed-in user is allowed in default public mode", () => {
    const access = resolveAiLabAccess({
      user: mkUser("user@example.com"),
      isAdmin: false,
    });
    expect(access.allowed).toBe(true);
    expect(access.reason).toBe("public");
    expect(access.mode).toBe("public");
  });

  it("admin is allowed in default public mode", () => {
    const access = resolveAiLabAccess({
      user: mkUser("admin@example.com"),
      isAdmin: true,
    });
    expect(access.allowed).toBe(true);
    expect(access.reason).toBe("admin");
    expect(access.mode).toBe("public");
  });

  it("logged-out user is denied in admin-only mode", () => {
    const access = resolveAiLabAccess({
      user: null,
      isAdmin: false,
      mode: "admin-only",
    });
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("logged-out");
    expect(access.loginPath).toBe("/admin/login");
    expect(access.loginPath).toBe(AI_LAB_LOGIN_PATH);
  });

  it("non-admin signed-in user is denied in admin-only mode", () => {
    const access = resolveAiLabAccess({
      user: mkUser("beta@example.com"),
      isAdmin: false,
      mode: "admin-only",
    });
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("admin-only-locked");
    expect(access.mode).toBe("admin-only");
  });

  it("admin is allowed in admin-only mode", () => {
    const access = resolveAiLabAccess({
      user: mkUser("admin@example.com"),
      isAdmin: true,
      mode: "admin-only",
    });
    expect(access.allowed).toBe(true);
    expect(access.reason).toBe("admin");
    expect(access.mode).toBe("admin-only");
  });

  it("controlled-beta with empty allowlist allows admin only", () => {
    const admin = resolveAiLabAccess({
      user: mkUser("admin@example.com"),
      isAdmin: true,
      mode: "controlled-beta",
      allowlist: [],
    });
    expect(admin.allowed).toBe(true);
    expect(admin.reason).toBe("admin");

    const betaUser = resolveAiLabAccess({
      user: mkUser("beta@example.com"),
      isAdmin: false,
      mode: "controlled-beta",
      allowlist: [],
    });
    expect(betaUser.allowed).toBe(false);
    expect(betaUser.reason).toBe("not-on-allowlist");
  });

  it("controlled-beta with allowlisted email allows that user", () => {
    const access = resolveAiLabAccess({
      user: mkUser("beta@example.com"),
      isAdmin: false,
      mode: "controlled-beta",
      allowlist: ["beta@example.com"],
    });
    expect(access.allowed).toBe(true);
    expect(access.reason).toBe("beta-allowlist");
  });

  it("controlled-beta normalizes email case and whitespace", () => {
    expect(normalizeAiLabEmail("  Beta@Example.COM  ")).toBe("beta@example.com");

    const access = resolveAiLabAccess({
      user: mkUser("  Beta@Example.COM  "),
      isAdmin: false,
      mode: "controlled-beta",
      allowlist: ["beta@example.com"],
    });
    expect(access.allowed).toBe(true);
    expect(access.reason).toBe("beta-allowlist");
  });

  it("default sidebar visibility is public for all users", () => {
    expect(canShowAiLabNav({ user: mkUser("admin@example.com"), isAdmin: true })).toBe(true);
    expect(canShowAiLabNav({ user: mkUser("user@example.com"), isAdmin: false })).toBe(true);
    expect(canShowAiLabNav({ user: null, isAdmin: false })).toBe(true);
    expect(canShowAiLabNav({ user: null, isAdmin: true })).toBe(true);
  });

  it("no public nav link is added to mobile Navbar", () => {
    const navbarPath = join(__dirname, "../../components/Navbar.tsx");
    const navbarSource = readFileSync(navbarPath, "utf8");
    expect(navbarSource).not.toMatch(/\/ai-lab/);
    expect(navbarSource).not.toMatch(/AI Lab/);
  });
});
