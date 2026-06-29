import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Signed-URL lifetime. Long enough for a parent to open or print the file,
// short enough that a copied URL stops working soon after. Each page render
// mints fresh URLs, so this never needs to outlive a single visit.
const WORKSHEET_URL_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Mint short-lived signed URLs for worksheet files.
 *
 * The `worksheets` storage bucket is PRIVATE — files must never be reachable by
 * a guessed or leaked public URL, or one center could open another center's
 * lesson materials. We sign on read with the service-role client (which
 * bypasses storage RLS) ONLY after the caller has already been authorized and
 * center-scoped by RLS on the `worksheets` table.
 *
 * Returns a map of storage_path -> signed URL. Paths that fail to sign are
 * simply omitted, so callers should treat a missing entry as "no link".
 */
export async function signWorksheetUrls(
  storagePaths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = Array.from(
    new Set(storagePaths.filter((p): p is string => !!p)),
  );
  if (unique.length === 0) return out;

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from("worksheets")
    .createSignedUrls(unique, WORKSHEET_URL_TTL_SECONDS);
  if (error || !data) return out;

  for (const item of data) {
    if (item.signedUrl && item.path) out.set(item.path, item.signedUrl);
  }
  return out;
}
