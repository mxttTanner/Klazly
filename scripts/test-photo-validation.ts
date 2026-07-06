/**
 * Unit tests for student-photo upload validation
 * (src/lib/image-validation.ts). Pure functions, no DB.
 *
 * The key property under test: a file renamed to .jpg does NOT pass —
 * validation reads the actual leading bytes, never the declared MIME type
 * or extension. (RLS/tag permission enforcement is integration-tested by
 * scripts/test-photo-isolation.ts against a real database.)
 *
 * Run: npm run test:photo-validation
 */

import assert from "node:assert/strict";
import {
  PHOTO_MAX_BYTES,
  sniffImageType,
  validatePhotoBytes,
} from "../src/lib/image-validation";

let passed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);
const WEBP = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const GIF = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a
const EXE = Uint8Array.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]); // MZ
const PDF = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
const HTML = new TextEncoder().encode("<script>alert(1)</script>");

test("sniffs JPEG magic bytes", () => {
  assert.equal(sniffImageType(JPEG), "image/jpeg");
});

test("sniffs PNG magic bytes", () => {
  assert.equal(sniffImageType(PNG), "image/png");
});

test("sniffs WebP magic bytes (RIFF....WEBP)", () => {
  assert.equal(sniffImageType(WEBP), "image/webp");
});

test("rejects a RIFF file that is not WebP (e.g. WAV)", () => {
  const wav = Uint8Array.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
  ]);
  assert.equal(sniffImageType(wav), null);
});

test("rejects GIF, EXE, PDF, HTML payloads regardless of claimed type", () => {
  for (const bytes of [GIF, EXE, PDF, HTML]) {
    assert.equal(sniffImageType(bytes), null);
  }
});

test("rejects empty / truncated files", () => {
  assert.equal(sniffImageType(new Uint8Array()), null);
  assert.equal(sniffImageType(Uint8Array.from([0xff, 0xd8])), null);
});

test("validatePhotoBytes: renamed .exe → badType (rename bypass fails)", () => {
  // The browser would send this as image/jpeg because of the .jpg name;
  // validation never sees or trusts that.
  const verdict = validatePhotoBytes(EXE, EXE.length);
  assert.deepEqual(verdict, { ok: false, error: "badType" });
});

test("validatePhotoBytes: real JPEG passes with jpg extension", () => {
  const verdict = validatePhotoBytes(JPEG, 100_000);
  assert.deepEqual(verdict, { ok: true, type: "image/jpeg", ext: "jpg" });
});

test("validatePhotoBytes: png/webp map to their extensions", () => {
  assert.deepEqual(validatePhotoBytes(PNG, 1000), {
    ok: true,
    type: "image/png",
    ext: "png",
  });
  assert.deepEqual(validatePhotoBytes(WEBP, 1000), {
    ok: true,
    type: "image/webp",
    ext: "webp",
  });
});

test("validatePhotoBytes: over 5MB → tooLarge (even for a real image)", () => {
  const verdict = validatePhotoBytes(JPEG, PHOTO_MAX_BYTES + 1);
  assert.deepEqual(verdict, { ok: false, error: "tooLarge" });
});

test("validatePhotoBytes: exactly 5MB passes the size gate", () => {
  const verdict = validatePhotoBytes(JPEG, PHOTO_MAX_BYTES);
  assert.equal(verdict.ok, true);
});

test("validatePhotoBytes: zero-byte file → noFile", () => {
  assert.deepEqual(validatePhotoBytes(new Uint8Array(), 0), {
    ok: false,
    error: "noFile",
  });
});

if (process.exitCode === 1) {
  console.error("\nSome photo-validation tests FAILED.");
} else {
  console.log(`\nAll ${passed} photo-validation tests passed.`);
}
