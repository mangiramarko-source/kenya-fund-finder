export type SafeImageExtension = "jpg" | "png" | "gif" | "webp";
export type SafeImageMimeType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export interface ImageValidationOptions {
  /** Maximum allowed file size in bytes (default: 2 MB) */
  maxBytes?: number;
  /** Maximum pixel width/height when re-encoding via canvas (default: 512 for avatars) */
  maxDimension?: number;
  /** Whether to re-encode raster images via HTML5 Canvas when available in browser (default: true) */
  reencodeViaCanvas?: boolean;
}

export type ImageValidationResult =
  | {
      valid: true;
      ext: SafeImageExtension;
      mimeType: SafeImageMimeType;
      sanitizedBlob: Blob;
    }
  | {
      valid: false;
      error: string;
    };

export const SAFE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set<SafeImageMimeType>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const ALLOWED_EXTENSIONS: ReadonlySet<string> = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
]);

const DANGEROUS_EXTENSIONS: ReadonlySet<string> = new Set([
  "svg",
  "svgz",
  "html",
  "htm",
  "xhtml",
  "xml",
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "php",
  "phtml",
  "asp",
  "aspx",
  "jsp",
  "py",
  "rb",
  "sh",
  "bash",
  "bat",
  "cmd",
  "ps1",
  "exe",
  "dll",
  "msi",
  "scr",
  "com",
  "swf",
  "pdf",
  "wasm",
  "htaccess",
]);

const POLYGLOT_SIGNATURES: readonly string[] = [
  "<script",
  "</script",
  "javascript:",
  "vbscript:",
  "data:text/html",
  "<!doctype html",
  "<html",
  "<svg",
  "<iframe",
  "<object",
  "<embed",
  "onload=",
  "onerror=",
  "<?php",
];

/**
 * Reads a Blob/File into a Uint8Array across both modern browsers and test environments (jsdom).
 */
async function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") {
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
  }
  return await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error("Failed to read file bytes"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file bytes"));
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Inspects binary magic bytes to determine the true image format.
 * Returns null if the binary header does not match JPEG, PNG, GIF87a/89a, or RIFF WebP.
 */
export function detectImageMagicBytes(
  bytes: Uint8Array,
): { ext: SafeImageExtension; mimeType: SafeImageMimeType } | null {
  if (bytes.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", mimeType: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { ext: "png", mimeType: "image/png" };
  }

  // GIF87a (47 49 46 38 37 61) or GIF89a (47 49 46 38 39 61)
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return { ext: "gif", mimeType: "image/gif" };
  }

  // WebP: "RIFF" (52 49 46 46) at 0..3 and "WEBP" (57 45 42 50) at 8..11
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ext: "webp", mimeType: "image/webp" };
  }

  return null;
}

/**
 * Scans binary content for embedded HTML/SVG/JS/PHP polyglot payloads.
 */
export function containsPolyglotPayload(bytes: Uint8Array): boolean {
  const decoder = new TextDecoder("latin1");
  // Scan up to first 64 KB and last 16 KB (or full buffer if <= 80 KB)
  const headLimit = Math.min(bytes.length, 65536);
  const headText = decoder.decode(bytes.subarray(0, headLimit)).toLowerCase();

  for (const sig of POLYGLOT_SIGNATURES) {
    if (headText.includes(sig)) {
      return true;
    }
  }

  if (bytes.length > headLimit) {
    const tailStart = Math.max(headLimit - 128, bytes.length - 16384);
    const tailText = decoder.decode(bytes.subarray(tailStart)).toLowerCase();
    for (const sig of POLYGLOT_SIGNATURES) {
      if (tailText.includes(sig)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validates filename for path traversal, null bytes, double extensions, and disallowed extensions.
 */
export function validateImageFilename(fileName: string): { valid: true } | { valid: false; error: string } {
  const trimmed = (fileName || "").trim();
  if (!trimmed) {
    return { valid: false, error: "File name is missing." };
  }

  if (trimmed.includes("\0") || trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("..")) {
    return { valid: false, error: "Invalid file name." };
  }

  const parts = trimmed.toLowerCase().split(".");
  if (parts.length < 2) {
    return { valid: false, error: "File must have a valid image extension (.jpg, .png, .gif, or .webp)." };
  }

  const finalExt = parts[parts.length - 1];
  if (!ALLOWED_EXTENSIONS.has(finalExt)) {
    return {
      valid: false,
      error: "Only JPG, PNG, GIF, and WebP images are allowed. SVG and executable files are blocked.",
    };
  }

  // Block double-extension attacks like "exploit.php.png" or "xss.svg.jpg"
  for (let i = 1; i < parts.length - 1; i += 1) {
    if (DANGEROUS_EXTENSIONS.has(parts[i])) {
      return {
        valid: false,
        error: "Suspicious double file extension detected.",
      };
    }
  }

  return { valid: true };
}

/**
 * Attempts to decode and re-encode a static image on an offscreen HTML5 Canvas,
 * stripping EXIF metadata and any trailing polyglot bytes.
 * In non-browser/test environments without canvas rendering support, falls back to the verified clean Blob.
 */
async function reencodeViaCanvasIfSupported(
  bytes: Uint8Array,
  mimeType: SafeImageMimeType,
  maxDimension: number,
): Promise<Blob> {
  const cleanBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const fallbackBlob = new Blob([cleanBuffer], { type: mimeType });

  // Skip canvas re-encoding for GIFs (to preserve animation) or when running in SSR/jsdom
  if (
    mimeType === "image/gif" ||
    typeof document === "undefined" ||
    typeof createImageBitmap !== "function"
  ) {
    return fallbackBlob;
  }

  try {
    const bitmap = await createImageBitmap(fallbackBlob);
    const width = bitmap.width;
    const height = bitmap.height;

    if (!width || !height || width > 8192 || height > 8192) {
      bitmap.close?.();
      throw new Error("Invalid image dimensions.");
    }

    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return fallbackBlob;
    }

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close?.();

    const reencoded = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), mimeType, 0.92);
    });

    return reencoded ?? fallbackBlob;
  } catch (err) {
    if (err instanceof Error && err.message === "Invalid image dimensions.") {
      throw err;
    }
    return fallbackBlob;
  }
}

/**
 * Full multi-layer security validation and sanitization for uploaded image files.
 */
export async function validateAndSanitizeImageUpload(
  file: File | null | undefined,
  options: ImageValidationOptions = {},
): Promise<ImageValidationResult> {
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
  const maxDimension = options.maxDimension ?? 512;
  const shouldReencode = options.reencodeViaCanvas ?? true;

  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  if (file.size <= 0) {
    return { valid: false, error: "The selected file is empty." };
  }

  if (file.size > maxBytes) {
    const maxMb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
    return { valid: false, error: `File too large. Maximum allowed size is ${maxMb} MB.` };
  }

  const filenameCheck = validateImageFilename(file.name);
  if (!filenameCheck.valid) {
    return filenameCheck;
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.",
    };
  }

  let bytes: Uint8Array;
  try {
    bytes = await readBlobBytes(file);
  } catch {
    return { valid: false, error: "Could not read the selected file." };
  }

  const detected = detectImageMagicBytes(bytes);
  if (!detected) {
    return {
      valid: false,
      error: "File content does not match a valid JPEG, PNG, GIF, or WebP image signature.",
    };
  }

  if (file.type !== detected.mimeType) {
    return {
      valid: false,
      error: "File extension or MIME type does not match the actual image format.",
    };
  }

  if (containsPolyglotPayload(bytes)) {
    return {
      valid: false,
      error: "Rejected image: file contains embedded script or markup content.",
    };
  }

  try {
    const sanitizedBlob = shouldReencode
      ? await reencodeViaCanvasIfSupported(bytes, detected.mimeType, maxDimension)
      : new Blob(
          [bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer],
          { type: detected.mimeType },
        );

    return {
      valid: true,
      ext: detected.ext,
      mimeType: detected.mimeType,
      sanitizedBlob,
    };
  } catch {
    return {
      valid: false,
      error: "Image could not be decoded safely.",
    };
  }
}

/**
 * Ensures an avatar URL is a safe HTTPS URL (blocks javascript:, data:, vbscript:, file:, http:).
 * Returns an empty string if the URL is unsafe or invalid.
 */
export function sanitizeAvatarUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 2048) return "";

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return "";
    if (parsed.username || parsed.password) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

/**
 * Validates and sanitizes a user display name to prevent HTML/script injection.
 */
export function validateDisplayName(
  rawName: string,
): { valid: true; sanitized: string } | { valid: false; error: string } {
  const trimmed = (rawName || "").trim().replace(/\s+/g, " ");
  if (trimmed.length > 80) {
    return { valid: false, error: "Display name must be 80 characters or fewer." };
  }
  if (/[<>]/.test(trimmed) || /javascript:/i.test(trimmed)) {
    return { valid: false, error: "Display name cannot contain HTML tags or script expressions." };
  }
  return { valid: true, sanitized: trimmed };
}
