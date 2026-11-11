import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("Post Comments Hardening Migration & Validation", () => {
  const migrationPath = resolve(__dirname, "../../supabase/migrations/20261111124500_harden_post_comments.sql");

  it("migration file exists and contains all required security guards", () => {
    expect(existsSync(migrationPath)).toBe(true);
    const sql = readFileSync(migrationPath, "utf8");

    // Pre-clean checks
    expect(sql).toContain("char_length(btrim(content)) = 0");
    expect(sql).toContain("left(btrim(content), 1000)");

    // Table check constraints
    expect(sql).toContain("post_comments_content_length_check");
    expect(sql).toContain("CHECK (char_length(btrim(content)) BETWEEN 1 AND 1000)");
    expect(sql).toContain("post_comments_author_name_length_check");
    expect(sql).toContain("CHECK (author_name IS NULL OR char_length(btrim(author_name)) BETWEEN 1 AND 80)");
    expect(sql).toContain("post_comments_post_id_length_check");
    expect(sql).toContain("CHECK (char_length(btrim(post_id)) BETWEEN 1 AND 120)");

    // Immutable update fields lock
    expect(sql).toContain("NEW.post_id := OLD.post_id;");
    expect(sql).toContain("NEW.user_id := OLD.user_id;");
    expect(sql).toContain("NEW.created_at := OLD.created_at;");

    // Trigger and function
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.enforce_post_comment_security()");
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = public");
    expect(sql).toContain("convert_to(v_client_ip, 'UTF8')");
    expect(sql).toContain("Links are not allowed in guest comments");
    expect(sql).toContain("Rate limit exceeded: Please wait before posting another comment");
    expect(sql).toContain("CREATE TRIGGER trg_enforce_post_comment_security");
    expect(sql).toContain("BEFORE INSERT OR UPDATE ON public.post_comments");
  });

  const guestLinkRegex = /(https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|io|xyz|co\.ke|or\.ke|ac\.ke)(\/|$|[\s?!,;:])|[a-z0-9-]+\.(me|co|ke|ly)\/)/i;

  it("blocks phishing URLs, suspicious TLDs, and shortlinks for guest comments", () => {
    const maliciousGuestComments = [
      "Check this out: https://phishing.com/scam",
      "Visit http://insecure-site.xyz for high returns",
      "Go to www.fakeinvest.com",
      "Earn free tokens at scam.io/airdrop",
      "Visit crypto-doubler.xyz today!",
      "Visit my site at test.com now",
      "safaricom.co.ke",
      "Check our deals at safaricom-promo.co.ke/free",
      "bit.ly/xyz",
      "Join our channel at t.me/group",
      "Check this link out now.ly/free",
    ];

    for (const comment of maliciousGuestComments) {
      expect(guestLinkRegex.test(comment)).toBe(true);
    }
  });

  it("allows standard comments with legitimate financial discussion and punctuation without false positives", () => {
    const legitimateComments = [
      "Great insights on Safaricom's H1 earnings!",
      "I bought KCB shares at 32.50 KES yesterday.",
      "The market closed higher today with 12.5% increase.",
      "Co-operative Bank announced dividends.",
      "What do you think about the CBK interest rate announcement?",
      "Thanks for sharing this report.",
      "In my opinion, inflation trends will stabilize next quarter.",
      "Invested in Equity.Co-op Bank",
      "Good returns.Me too",
    ];

    for (const comment of legitimateComments) {
      expect(guestLinkRegex.test(comment)).toBe(false);
    }
  });
});
