import { describe, it, expect } from "vitest";
import {
  validateSupabaseUrl,
  validateSupabasePublishableKey,
  extractProjectRefFromUrl,
  validateSupabaseProjectId,
} from "./supabase-config";

describe("validateSupabaseUrl", () => {
  it("accepts valid https supabase.co URLs", () => {
    expect(validateSupabaseUrl("https://test-project.supabase.co")).toBe(
      "https://test-project.supabase.co"
    );
    expect(validateSupabaseUrl("https://test-project.supabase.co/")).toBe(
      "https://test-project.supabase.co"
    );
  });

  it("rejects empty or undefined URL", () => {
    expect(() => validateSupabaseUrl("")).toThrowError(/Missing VITE_SUPABASE_URL/);
    expect(() => validateSupabaseUrl(undefined)).toThrowError(/Missing VITE_SUPABASE_URL/);
    expect(() => validateSupabaseUrl("   ")).toThrowError(/Missing VITE_SUPABASE_URL/);
  });

  it("rejects non-https or non-supabase URLs without leaking value", () => {
    expect(() => validateSupabaseUrl("http://test-project.supabase.co")).toThrowError(
      "[Supabase Config] Invalid VITE_SUPABASE_URL. Expected a valid HTTPS Supabase URL (e.g. https://<project>.supabase.co)."
    );
    expect(() => validateSupabaseUrl("https://malicious-site.com")).toThrowError(
      "[Supabase Config] Invalid VITE_SUPABASE_URL. Expected a valid HTTPS Supabase URL (e.g. https://<project>.supabase.co)."
    );
    expect(() => validateSupabaseUrl("ftp://supabase.co")).toThrowError(
      "[Supabase Config] Invalid VITE_SUPABASE_URL. Expected a valid HTTPS Supabase URL (e.g. https://<project>.supabase.co)."
    );
  });

  it("rejects ciphertext or tokens passed as URL", () => {
    expect(() => validateSupabaseUrl("eyJ2IjoidjIiLCJjIjoi...")).toThrowError(/Received ciphertext/);
    expect(() => validateSupabaseUrl('{"v":"v2"}')).toThrowError(/Received ciphertext/);
  });
});

describe("Project ID validation & derivation", () => {
  const url = "https://test-project.supabase.co";

  it("extracts project reference from URL", () => {
    expect(extractProjectRefFromUrl(url)).toBe("test-project");
  });

  it("derives project ID when VITE_SUPABASE_PROJECT_ID is absent or empty", () => {
    expect(validateSupabaseProjectId(undefined, url)).toBe("test-project");
    expect(validateSupabaseProjectId("", url)).toBe("test-project");
    expect(validateSupabaseProjectId("   ", url)).toBe("test-project");
  });

  it("accepts matching project ID", () => {
    expect(validateSupabaseProjectId("test-project", url)).toBe("test-project");
    expect(validateSupabaseProjectId("TEST-PROJECT", url)).toBe("test-project");
  });

  it("fails closed on project ID mismatch", () => {
    expect(() => validateSupabaseProjectId("different-project", url)).toThrowError(
      /VITE_SUPABASE_PROJECT_ID mismatch/
    );
  });
});

describe("validateSupabasePublishableKey", () => {
  it("accepts valid modern publishable key starting with sb_publishable_", () => {
    const validTestKey = "sb_publishable_test_value_for_unit_tests_only";
    expect(validateSupabasePublishableKey(validTestKey)).toBe(validTestKey);
  });

  it("rejects legacy JWT keys starting with eyJ", () => {
    const legacyKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.fake";
    expect(() => validateSupabasePublishableKey(legacyKey)).toThrowError(
      /Rejected legacy JWT or encrypted envelope key/
    );
  });

  it("rejects encrypted envelope strings starting with eyJ", () => {
    const ciphertext = "eyJ2IjoidjIiLCJjIjoiUXBk...";
    expect(() => validateSupabasePublishableKey(ciphertext)).toThrowError(
      /Rejected legacy JWT or encrypted envelope key/
    );
  });

  it("rejects secret or service_role keys", () => {
    expect(() => validateSupabasePublishableKey("sb_secret_123456789")).toThrowError(
      /Security violation: Service role or secret key detected/
    );
    expect(() => validateSupabasePublishableKey("service_role_secret_key")).toThrowError(
      /Security violation: Service role or secret key detected/
    );
  });

  it("rejects empty, undefined, or malformed keys", () => {
    expect(() => validateSupabasePublishableKey("")).toThrowError(/Missing VITE_SUPABASE_PUBLISHABLE_KEY/);
    expect(() => validateSupabasePublishableKey(undefined)).toThrowError(/Missing VITE_SUPABASE_PUBLISHABLE_KEY/);
    expect(() => validateSupabasePublishableKey("random_string_123")).toThrowError(
      /Invalid publishable key format/
    );
  });
});
