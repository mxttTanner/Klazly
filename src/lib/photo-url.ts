import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Signed URLs for the PRIVATE student-photos bucket.
 *
 * SECURITY: unlike worksheets there is no public_url fallback — the bucket
 * was born private and a photo is reachable ONLY through a signature minted
 * here. Callers must pass rows they obtained through an RLS-scoped table
 * read (the anon server client), so entitlement is already proven before a
 * URL is ever signed. Never call this with ids/paths taken from user input.
 *
 * Signing fails soft: on error the photo is simply absent from the map and
 * the UI skips or placeholder-renders it (no broken images).
 */
export const PHOTO_URL_TTL = 60 * 60; // 1 hour

export async function signPhotoUrls(
  rows: Array<{ id: string; storage_path: string }>,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (rows.length === 0) return result;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from("student-photos")
      .createSignedUrls(
        rows.map((r) => r.storage_path),
        PHOTO_URL_TTL,
      );
    if (error || !data) {
      console.warn("[photo-url] batch signing failed:", error?.message);
      return result;
    }
    const byPath = new Map<string, string>();
    for (const item of data) {
      if (item.signedUrl && item.path) byPath.set(item.path, item.signedUrl);
    }
    for (const row of rows) {
      const url = byPath.get(row.storage_path);
      if (url) result.set(row.id, url);
    }
  } catch (e) {
    console.warn("[photo-url] signing threw, photos will be hidden:", e);
  }
  return result;
}
