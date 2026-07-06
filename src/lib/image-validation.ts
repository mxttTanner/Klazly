/**
 * Shared validation for student-photo uploads. Pure functions so both the
 * server action and the unit tests (scripts/test-photo-validation.ts) use
 * exactly the same logic.
 *
 * The MIME type a browser sends is derived from the file EXTENSION, so a
 * renamed file (evil.exe → evil.jpg) arrives as "image/jpeg". The server
 * therefore never trusts file.type alone — it sniffs the leading bytes and
 * only accepts files whose actual magic numbers are JPEG/PNG/WebP.
 */

export const PHOTO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
/** Client-side downscale target (long edge, px) before upload. */
export const PHOTO_MAX_DIMENSION = 1600;

export type SniffedImageType = "image/jpeg" | "image/png" | "image/webp";

/**
 * Identify a JPEG/PNG/WebP by its magic bytes. Returns null for anything
 * else (including images we don't accept, like GIF/BMP/HEIC).
 */
export function sniffImageType(bytes: Uint8Array): SniffedImageType | null {
  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return "image/webp";
  }
  return null;
}

export type PhotoValidationError = "noFile" | "tooLarge" | "badType";

/**
 * Validate a photo upload from size + leading bytes. The declared MIME type
 * is not consulted — only what the bytes actually are.
 */
export function validatePhotoBytes(
  bytes: Uint8Array,
  sizeBytes: number,
):
  | { ok: true; type: SniffedImageType; ext: "jpg" | "png" | "webp" }
  | { ok: false; error: PhotoValidationError } {
  if (sizeBytes <= 0) return { ok: false, error: "noFile" };
  if (sizeBytes > PHOTO_MAX_BYTES) return { ok: false, error: "tooLarge" };
  const type = sniffImageType(bytes);
  if (!type) return { ok: false, error: "badType" };
  const ext = type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp";
  return { ok: true, type, ext };
}
