import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * How long a signed worksheet URL stays valid, in seconds. One hour is
 * plenty for a parent/teacher to open the file after the page loads, and
 * short enough that a leaked URL expires quickly once the bucket is private.
 */
export const WORKSHEET_URL_TTL = 60 * 60; // 1 hour

/**
 * Turn worksheet rows into short-lived signed download URLs, keyed by row id.
 *
 * Why: worksheet files live in the "worksheets" Storage bucket. Today the
 * bucket is still PUBLIC, but we want to serve files through signed URLs so we
 * can later flip the bucket to private with zero downtime. `createSignedUrls`
 * works on a public bucket too, so shipping this now changes nothing visible.
 *
 * The returned Map goes id -> best URL to use for that row:
 *  - the freshly signed URL when signing succeeds, otherwise
 *  - the row's stored `public_url` as a fallback (so worksheets NEVER break,
 *    even before the bucket flip and even if the signing call errors out).
 *
 * This function fails soft: it never throws. Any error is caught and every row
 * falls back to its `public_url`.
 */
export async function signWorksheetUrls(
  rows: {
    id: string;
    storage_path?: string | null;
    public_url?: string | null;
  }[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  // Seed every row with its public_url fallback up front. If signing fails
  // wholesale (or partially), these values simply stay in place.
  for (const row of rows) {
    if (row.public_url) result.set(row.id, row.public_url);
  }

  // Collect the storage paths we can actually sign. Rows without a
  // storage_path keep their public_url fallback from above.
  const rowsWithPath = rows.filter(
    (r): r is typeof r & { storage_path: string } => !!r.storage_path,
  );
  if (rowsWithPath.length === 0) return result;

  try {
    const paths = rowsWithPath.map((r) => r.storage_path);
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from("worksheets")
      .createSignedUrls(paths, WORKSHEET_URL_TTL);

    // Batch signing failed entirely — leave the public_url fallbacks in place.
    if (error || !data) return result;

    // Map signed URLs back by storage path, then onto each row's id. Any
    // individual entry that errored (per-file `error`) is skipped, so that
    // row keeps its public_url fallback.
    const signedByPath = new Map<string, string>();
    for (const entry of data) {
      if (!entry.error && entry.path && entry.signedUrl) {
        signedByPath.set(entry.path, entry.signedUrl);
      }
    }
    for (const row of rowsWithPath) {
      const signed = signedByPath.get(row.storage_path);
      if (signed) result.set(row.id, signed);
    }
  } catch (e) {
    // Never let a signing failure take down the page — the public_url
    // fallbacks seeded above are already in the Map.
    console.warn("[worksheet-url] signWorksheetUrls failed, using fallbacks:", e);
  }

  return result;
}

/**
 * Convenience wrapper for single-row callers. Returns the best URL for one
 * worksheet row (signed if possible, else its public_url, else null),
 * delegating to the batch {@link signWorksheetUrls}.
 */
export async function signOneWorksheetUrl(row: {
  id: string;
  storage_path?: string | null;
  public_url?: string | null;
}): Promise<string | null> {
  const map = await signWorksheetUrls([row]);
  return map.get(row.id) ?? row.public_url ?? null;
}
