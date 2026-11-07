/**
 * Security & Media Validation Pipeline
 * - Enforces magic-byte binary header verification for photos & native videos
 * - Blocks malicious file types, script polyglots, and SVGs
 * - Sanitizes filenames to cryptographic UUIDs
 * - Client-side video thumbnail generator for stories and previews
 */

export type AllowedMediaType = "image" | "video";
export type AllowedImageExt = "jpg" | "jpeg" | "png" | "webp";
export type AllowedVideoExt = "mp4" | "webm";

export interface MediaItem {
  type: "image" | "video" | "embed";
  url: string;
  thumbnail_url?: string;
  mime_type?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

const DANGEROUS_EXTENSIONS: ReadonlySet<string> = new Set([
  "svg", "svgz", "html", "htm", "xhtml", "xml", "js", "mjs", "cjs", "ts", "tsx", "jsx",
  "php", "phtml", "asp", "aspx", "jsp", "py", "rb", "sh", "bash", "bat", "cmd", "ps1",
  "exe", "dll", "msi", "scr", "com", "swf", "wasm", "htaccess"
]);

const ALLOWED_IMAGE_MIMES: ReadonlySet<string> = new Set([
  "image/jpeg", "image/png", "image/webp"
]);

const ALLOWED_VIDEO_MIMES: ReadonlySet<string> = new Set([
  "video/mp4", "video/webm"
]);

/**
 * Checks magic byte binary signatures to verify real file type.
 */
export function checkMagicBytes(header: Uint8Array): { valid: boolean; detectedMime?: string; ext?: string } {
  if (header.length < 12) {
    return { valid: false };
  }

  // 1. JPEG: FF D8 FF
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return { valid: true, detectedMime: "image/jpeg", ext: "jpg" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) {
    return { valid: true, detectedMime: "image/png", ext: "png" };
  }

  // 3. WebP: RIFF at 0..3 and WEBP at 8..11
  const isRiff =
    header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46;
  const isWebp =
    header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
  if (isRiff && isWebp) {
    return { valid: true, detectedMime: "image/webp", ext: "webp" };
  }

  // 4. WebM: 1A 45 DF A3 (Matroska / EBML header)
  if (header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3) {
    return { valid: true, detectedMime: "video/webm", ext: "webm" };
  }

  // 5. MP4: bytes 4..7 == 'ftyp' (0x66, 0x74, 0x79, 0x70)
  if (header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) {
    return { valid: true, detectedMime: "video/mp4", ext: "mp4" };
  }

  return { valid: false };
}

/**
 * Reads bytes from a Blob/File reliably across browser and test (jsdom) environments.
 */
async function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") {
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
  }
  return await new Promise<Uint8Array>((resolve, reject) => {
    if (typeof FileReader === "undefined") {
      resolve(new Uint8Array(0));
      return;
    }
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
 * Validates file size, extension, MIME type, and binary header.
 */
export async function validateMediaFile(file: File): Promise<{
  valid: boolean;
  error?: string;
  mediaType?: "image" | "video";
  detectedMime?: string;
  safeExtension?: string;
}> {
  if (!file || typeof file.slice !== "function") {
    return { valid: false, error: "Invalid file object provided" };
  }

  const rawExt = file.name.split(".").pop()?.toLowerCase() || "";

  if (DANGEROUS_EXTENSIONS.has(rawExt)) {
    return { valid: false, error: `File type .${rawExt} is prohibited for security reasons.` };
  }

  const isVideoExt = rawExt === "mp4" || rawExt === "webm";
  const maxBytes = isVideoExt ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;

  if (file.size > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    return { valid: false, error: `File exceeds maximum allowed size of ${limitMb} MB.` };
  }

  // Read first 64 bytes for header magic-bytes checking
  let headerBytes: Uint8Array;
  try {
    const slice = file.slice(0, 64);
    headerBytes = await readBlobBytes(slice);
  } catch {
    return { valid: false, error: "Failed to read file binary header." };
  }

  const magic = checkMagicBytes(headerBytes);
  if (!magic.valid || !magic.detectedMime || !magic.ext) {
    return {
      valid: false,
      error: "File content does not match allowed media formats (JPEG, PNG, WebP, MP4, WebM).",
    };
  }

  const isImageMime = ALLOWED_IMAGE_MIMES.has(magic.detectedMime);
  const isVideoMime = ALLOWED_VIDEO_MIMES.has(magic.detectedMime);

  if (!isImageMime && !isVideoMime) {
    return { valid: false, error: `MIME type ${magic.detectedMime} is not allowed.` };
  }

  return {
    valid: true,
    mediaType: isImageMime ? "image" : "video",
    detectedMime: magic.detectedMime,
    safeExtension: magic.ext,
  };
}

/**
 * Generates a sanitized UUID filename preventing path-traversal attacks.
 */
export function generateSecureFilename(safeExt: string): string {
  const uuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  return `${uuid}.${safeExt}`;
}

/**
 * Client-Side Video Thumbnail Capture:
 * Loads native video (.mp4/.webm) into an offscreen element, seeks to 0.5s,
 * captures frame to canvas, and exports a lightweight WebP/JPEG thumbnail blob.
 */
export async function generateVideoThumbnail(
  file: File | Blob,
  seekTimeSeconds = 0.5
): Promise<{ thumbnailBlob: Blob | null; duration: number; width: number; height: number }> {
  if (typeof window === "undefined" || typeof document === "undefined" || typeof document.createElement !== "function") {
    return { thumbnailBlob: null, duration: 0, width: 0, height: 0 };
  }

  return new Promise((resolve) => {
    let video: HTMLVideoElement | null = null;
    let objectUrl = "";

    try {
      video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.preload = "metadata";
      objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;

      const cleanup = () => {
        if (objectUrl) {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {
            // ignore
          }
        }
        if (video) {
          video.removeAttribute("src");
          video.load();
        }
      };

      const timeoutId = setTimeout(() => {
        cleanup();
        resolve({ thumbnailBlob: null, duration: 0, width: 0, height: 0 });
      }, 7000);

      video.onloadedmetadata = () => {
        if (!video) return;
        const duration = video.duration || 0;
        const seekTarget = Math.min(seekTimeSeconds, duration > 1 ? duration / 2 : 0.1);
        try {
          video.currentTime = seekTarget;
        } catch {
          // If seeking fails, attempt draw immediately
          drawFrame();
        }
      };

      const drawFrame = () => {
        clearTimeout(timeoutId);
        if (!video) {
          cleanup();
          return resolve({ thumbnailBlob: null, duration: 0, width: 0, height: 0 });
        }

        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;
        const duration = video.duration || 0;

        try {
          const canvas = document.createElement("canvas");
          // Max thumbnail dimension: 720px
          const maxDim = 720;
          let drawW = width;
          let drawH = height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              drawW = maxDim;
              drawH = Math.round((height * maxDim) / width);
            } else {
              drawH = maxDim;
              drawW = Math.round((width * maxDim) / height);
            }
          }

          canvas.width = drawW;
          canvas.height = drawH;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            cleanup();
            return resolve({ thumbnailBlob: null, duration, width, height });
          }

          ctx.drawImage(video, 0, 0, drawW, drawH);

          canvas.toBlob(
            (blob) => {
              cleanup();
              resolve({ thumbnailBlob: blob, duration, width, height });
            },
            "image/webp",
            0.82
          );
        } catch {
          cleanup();
          resolve({ thumbnailBlob: null, duration, width, height });
        }
      };

      video.onseeked = drawFrame;

      video.onerror = () => {
        clearTimeout(timeoutId);
        cleanup();
        resolve({ thumbnailBlob: null, duration: 0, width: 0, height: 0 });
      };
    } catch {
      resolve({ thumbnailBlob: null, duration: 0, width: 0, height: 0 });
    }
  });
}

/**
 * Checks if a string is a recognized external video URL (YouTube / Vimeo / Loom).
 */
export function parseExternalVideoEmbed(url: string): { isEmbed: boolean; embedUrl?: string; platform?: "youtube" | "vimeo" | "loom" } {
  if (!url || typeof url !== "string") return { isEmbed: false };
  const trimmed = url.trim();

  // YouTube
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      isEmbed: true,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&mute=1&playsinline=1&rel=0`,
      platform: "youtube",
    };
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:video\/)?)([0-9]+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      isEmbed: true,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1`,
      platform: "vimeo",
    };
  }

  // Loom
  const loomMatch = trimmed.match(/(?:loom\.com\/(?:share|embed)\/)([a-zA-Z0-9]+)/);
  if (loomMatch && loomMatch[1]) {
    return {
      isEmbed: true,
      embedUrl: `https://www.loom.com/embed/${loomMatch[1]}?autoplay=1&muted=1`,
      platform: "loom",
    };
  }

  return { isEmbed: false };
}
