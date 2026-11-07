import { describe, it, expect } from "vitest";
import {
  checkMagicBytes,
  validateMediaFile,
  generateSecureFilename,
  parseExternalVideoEmbed,
} from "./mediaValidation";

describe("Media Validation & Security", () => {
  describe("checkMagicBytes", () => {
    it("detects valid JPEG headers", () => {
      const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const res = checkMagicBytes(jpegHeader);
      expect(res.valid).toBe(true);
      expect(res.detectedMime).toBe("image/jpeg");
      expect(res.ext).toBe("jpg");
    });

    it("detects valid PNG headers", () => {
      const pngHeader = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      const res = checkMagicBytes(pngHeader);
      expect(res.valid).toBe(true);
      expect(res.detectedMime).toBe("image/png");
      expect(res.ext).toBe("png");
    });

    it("detects valid WebP headers", () => {
      const webpHeader = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      const res = checkMagicBytes(webpHeader);
      expect(res.valid).toBe(true);
      expect(res.detectedMime).toBe("image/webp");
      expect(res.ext).toBe("webp");
    });

    it("detects valid MP4 headers (ftyp box)", () => {
      const mp4Header = new Uint8Array([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
      ]);
      const res = checkMagicBytes(mp4Header);
      expect(res.valid).toBe(true);
      expect(res.detectedMime).toBe("video/mp4");
      expect(res.ext).toBe("mp4");
    });

    it("detects valid WebM headers (EBML header)", () => {
      const webmHeader = new Uint8Array([
        0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81,
      ]);
      const res = checkMagicBytes(webmHeader);
      expect(res.valid).toBe(true);
      expect(res.detectedMime).toBe("video/webm");
      expect(res.ext).toBe("webm");
    });

    it("rejects malicious or random non-media headers", () => {
      const textHeader = new TextEncoder().encode("<!DOCTYPE html><html><script>alert(1)</script>");
      const res = checkMagicBytes(new Uint8Array(textHeader));
      expect(res.valid).toBe(false);
    });

    it("rejects headers shorter than 12 bytes", () => {
      const short = new Uint8Array([0xff, 0xd8, 0xff]);
      const res = checkMagicBytes(short);
      expect(res.valid).toBe(false);
    });
  });

  describe("validateMediaFile", () => {
    it("rejects dangerous extensions like SVG and HTML", async () => {
      const fakeSvg = new File(["<svg></svg>"], "malicious.svg", { type: "image/svg+xml" });
      const res = await validateMediaFile(fakeSvg);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/prohibited for security reasons/i);
    });

    it("rejects files exceeding photo size limits (10MB)", async () => {
      // Mock large file
      const largeFile = {
        name: "huge.jpg",
        size: 11 * 1024 * 1024,
        slice: () => new Blob([]),
      } as unknown as File;

      const res = await validateMediaFile(largeFile);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/exceeds maximum allowed size/i);
    });

    it("validates authentic JPEG file", async () => {
      const bytes = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        ...new Array(50).fill(0),
      ]);
      const file = new File([bytes], "test.jpg", { type: "image/jpeg" });
      const res = await validateMediaFile(file);
      expect(res.valid).toBe(true);
      expect(res.mediaType).toBe("image");
      expect(res.detectedMime).toBe("image/jpeg");
      expect(res.safeExtension).toBe("jpg");
    });
  });

  describe("generateSecureFilename", () => {
    it("produces UUID filename with safe extension and strips path traversal", () => {
      const filename = generateSecureFilename("webp");
      expect(filename).toMatch(/^[0-9a-f-]{36}\.webp$/);
      expect(filename).not.toContain("/");
      expect(filename).not.toContain("..");
    });
  });

  describe("parseExternalVideoEmbed", () => {
    it("parses YouTube watch URLs", () => {
      const res = parseExternalVideoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(res.isEmbed).toBe(true);
      expect(res.platform).toBe("youtube");
      expect(res.embedUrl).toContain("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    });

    it("parses YouTube shorts and youtu.be URLs", () => {
      const res = parseExternalVideoEmbed("https://youtu.be/dQw4w9WgXcQ");
      expect(res.isEmbed).toBe(true);
      expect(res.platform).toBe("youtube");
      expect(res.embedUrl).toContain("dQw4w9WgXcQ");
    });

    it("parses Vimeo URLs", () => {
      const res = parseExternalVideoEmbed("https://vimeo.com/123456789");
      expect(res.isEmbed).toBe(true);
      expect(res.platform).toBe("vimeo");
      expect(res.embedUrl).toContain("123456789");
    });

    it("returns isEmbed: false for non-video URLs", () => {
      const res = parseExternalVideoEmbed("https://kenyafundfinder.com/funds");
      expect(res.isEmbed).toBe(false);
    });
  });
});
