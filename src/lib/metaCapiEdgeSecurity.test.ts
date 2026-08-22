import { describe, it, expect } from "vitest";

// Recreate the pure security validation rules from supabase/functions/meta-conversion/index.ts to test in Vitest
const ALLOWED_ORIGINS = [
  "https://kenya-fund-finder.lovable.app",
  "https://kenyafundfinder.com",
  "https://www.kenyafundfinder.com",
  "https://id-preview--e72d5937-d879-434f-ab8d-95e8c43f9adf.lovable.app",
  "https://e72d5937-d879-434f-ab8d-95e8c43f9adf.lovableproject.com",
];

const ALLOWED_CAPI_EVENTS = [
  "CompleteRegistration",
  "PortfolioAssetAdded",
  "WatchlistItemAdded",
  "PriceAlertCreated",
] as const;

function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function isValidEventName(eventName: string): boolean {
  return (ALLOWED_CAPI_EVENTS as readonly string[]).includes(eventName);
}

function isValidEventId(eventId: string): boolean {
  return typeof eventId === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(eventId);
}

function extractBearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

describe("Meta Conversions API Edge Function Security Verification", () => {
  it("rejects missing origin", () => {
    expect(isOriginAllowed(null)).toBe(false);
    expect(isOriginAllowed("")).toBe(false);
    expect(isOriginAllowed(undefined)).toBe(false);
  });

  it("rejects spoofed origin (e.g. kenyafundfinder.com.attacker.com)", () => {
    expect(isOriginAllowed("https://kenyafundfinder.com.attacker.com")).toBe(false);
    expect(isOriginAllowed("https://attacker.com?origin=https://kenyafundfinder.com")).toBe(false);
    expect(isOriginAllowed("http://kenyafundfinder.com")).toBe(false);
  });

  it("accepts only exact allowed production origins", () => {
    expect(isOriginAllowed("https://kenyafundfinder.com")).toBe(true);
    expect(isOriginAllowed("https://www.kenyafundfinder.com")).toBe(true);
    expect(isOriginAllowed("https://kenya-fund-finder.lovable.app")).toBe(true);
  });

  it("rejects missing or malformed Authorization header", () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken("")).toBeNull();
    expect(extractBearerToken("Basic user:pass")).toBeNull();
    expect(extractBearerToken("Token 12345")).toBeNull();
    expect(extractBearerToken("Bearer ")).toBeNull();
  });

  it("extracts valid Bearer token correctly for cryptographic verification", () => {
    expect(extractBearerToken("Bearer my_jwt_token_here")).toBe("my_jwt_token_here");
    expect(extractBearerToken("bearer my_jwt_token_here")).toBe("my_jwt_token_here");
  });

  it("rejects anonymous and unauthorized event names in CAPI", () => {
    expect(isValidEventName("PageView")).toBe(false);
    expect(isValidEventName("Lead")).toBe(false);
    expect(isValidEventName("InitiateCheckout")).toBe(false);
    expect(isValidEventName("ArbitraryInjectedEvent")).toBe(false);
  });

  it("accepts only authorized authenticated conversion milestone events", () => {
    expect(isValidEventName("CompleteRegistration")).toBe(true);
    expect(isValidEventName("PortfolioAssetAdded")).toBe(true);
    expect(isValidEventName("WatchlistItemAdded")).toBe(true);
    expect(isValidEventName("PriceAlertCreated")).toBe(true);
  });

  it("validates event_id format and rejects malformed/dangerous inputs", () => {
    expect(isValidEventId("kff_evt_123_abc")).toBe(true);
    expect(isValidEventId("kff-evt-123_ABC")).toBe(true);
    expect(isValidEventId("")).toBe(false);
    expect(isValidEventId("<script>alert(1)</script>")).toBe(false);
    expect(isValidEventId("a".repeat(129))).toBe(false);
  });
});
