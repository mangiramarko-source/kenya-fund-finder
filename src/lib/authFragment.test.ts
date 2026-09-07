import { describe, it, expect, beforeEach } from "vitest";
import {
  scrubAuthTokensFromUrl,
  getCapturedAuthHash,
  _resetCapturedAuthHashForTesting,
} from "./authFragment";

function setUrl(url: string): void {
  window.history.replaceState(null, "", url);
}

describe("authFragment — OAuth token scrubbing", () => {
  beforeEach(() => {
    _resetCapturedAuthHashForTesting();
    setUrl("/");
  });

  it("removes access_token, refresh_token, and provider_token from the URL", () => {
    setUrl(
      "/#access_token=aaa&refresh_token=bbb&provider_token=ccc&token_type=bearer&expires_in=3600"
    );

    scrubAuthTokensFromUrl();

    expect(window.location.hash).toBe("");
    expect(window.location.href).not.toContain("access_token");
    expect(window.location.href).not.toContain("refresh_token");
    expect(window.location.href).not.toContain("provider_token");
  });

  it("keeps the token fragment in memory so the auth flow can use it", () => {
    setUrl("/#access_token=aaa&refresh_token=bbb");

    scrubAuthTokensFromUrl();

    const captured = getCapturedAuthHash();
    expect(captured).toContain("access_token=aaa");
    expect(captured).toContain("refresh_token=bbb");
  });

  it("preserves the path and query while removing the token fragment", () => {
    setUrl("/auth/callback?next=/dashboard#access_token=aaa&refresh_token=bbb");

    scrubAuthTokensFromUrl();

    expect(window.location.pathname).toBe("/auth/callback");
    expect(window.location.search).toBe("?next=/dashboard");
    expect(window.location.hash).toBe("");
  });

  it("scrubs the password-recovery fragment but keeps type=recovery in memory", () => {
    setUrl("/reset-password#access_token=aaa&refresh_token=bbb&type=recovery");

    scrubAuthTokensFromUrl();

    expect(window.location.hash).toBe("");
    expect(window.location.href).not.toContain("access_token");
    expect(getCapturedAuthHash()).toContain("type=recovery");
  });

  it("leaves a non-token fragment untouched", () => {
    setUrl("/page#section-2");

    scrubAuthTokensFromUrl();

    expect(window.location.hash).toBe("#section-2");
    expect(getCapturedAuthHash()).toBe("#section-2");
  });
});
