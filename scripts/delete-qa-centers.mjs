/**
 * One-off cleanup: remove the two "QA Test —" centers created for the
 * 2026-07-03 live QA run, including their auth users, audit_log rows,
 * and worksheet storage objects. Strictly scoped: refuses to touch any
 * center whose name isn't in the allow-list below.
 *
 * Run: node scripts/delete-qa-centers.mjs        (dry run — prints plan)
 *      node scripts/delete-qa-centers.mjs --yes  (actually deletes)
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

const ALLOWED_NAMES = ["QA Test — Sao Việt", "QA Test — Biển Xanh"];
const APPLY = process.argv.includes("--yes");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing Supabase env in .env.local");
  process.exit(1);
}
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Match on TRIMMED names — the Biển Xanh center was created with a
// leading space in its name, so an exact .in() filter misses it.
const { data: allCenters, error } = await admin
  .from("centers")
  .select("id, name");
if (error) throw error;
const centers = (allCenters ?? []).filter((c) =>
  ALLOWED_NAMES.includes(c.name.trim()),
);
if (!centers?.length) {
  console.log("No QA Test centers found — nothing to do.");
  process.exit(0);
}
console.log("Centers to delete:");
for (const c of centers) console.log(`  ${c.name}  (${c.id})`);
const centerIds = centers.map((c) => c.id);

const { data: users } = await admin
  .from("users")
  .select("id, email, phone, role")
  .in("center_id", centerIds);
console.log(`Users to delete: ${users?.length ?? 0}`);
for (const u of users ?? []) console.log(`  ${u.role}: ${u.email ?? u.phone}`);

// Worksheet storage objects live at worksheets/{center_id}/...
const storagePlans = [];
for (const id of centerIds) {
  const { data: files } = await admin.storage.from("worksheets").list(id);
  if (files?.length) storagePlans.push({ id, files: files.map((f) => `${id}/${f.name}`) });
}
console.log(`Storage objects to delete: ${storagePlans.reduce((n, p) => n + p.files.length, 0)}`);

if (!APPLY) {
  console.log("\nDry run only. Re-run with --yes to delete.");
  process.exit(0);
}

for (const p of storagePlans) {
  const { error: e } = await admin.storage.from("worksheets").remove(p.files);
  if (e) console.warn("storage remove:", e.message);
}
const userIds = (users ?? []).map((u) => u.id);
if (userIds.length) {
  await admin.from("audit_log").delete().in("user_id", userIds);
  for (const id of userIds) {
    const { error: e } = await admin.auth.admin.deleteUser(id, false);
    if (e) console.warn("auth delete", id, e.message);
  }
}
const { error: ce } = await admin.from("centers").delete().in("id", centerIds);
if (ce) throw ce;

// Verify
const { data: left } = await admin.from("centers").select("id").in("name", ALLOWED_NAMES);
console.log(`\n✓ done. Remaining QA centers: ${left?.length ?? 0}`);
