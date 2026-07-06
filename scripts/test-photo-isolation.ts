/**
 * Student-photos isolation test — the automated proof that the photo RLS +
 * private-bucket design holds at the PostgREST/Storage layer (anon key +
 * user JWT, i.e. what any authenticated user can hit directly from a
 * browser console).
 *
 * REQUIRES db/student-photos.sql to be applied first. Mirrors
 * scripts/test-tenant-isolation.ts: provisions throwaway centers, signs in
 * real sessions, probes, and tears everything down (including storage
 * objects) in a finally block.
 *
 * What must hold:
 *   • parent sees ONLY photos tagged to their own child — a same-center
 *     parent of an UNTAGGED child gets nothing, by id or by enumeration
 *   • parents can never insert/update/delete photos or tags
 *   • teachers see/manage only photos THEY uploaded; can only tag students
 *     of classes they teach
 *   • nothing crosses centers in either direction
 *   • the storage bucket is unreachable without a valid signed URL:
 *     direct download/list with a user JWT fails, the public-URL form
 *     fails, a tampered signature fails
 *
 * SAFE FOR DEV/STAGING ONLY (same prod guard as test-tenant-isolation.ts).
 * Run: npm run test:photo-isolation
 */

import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

if (
  /klazly|prj_zpVqTIQeObyD3F5wafperz6sz4jO/i.test(url) &&
  process.env.ALLOW_PROD_ISOLATION_TEST !== "1"
) {
  console.error(
    "Refusing to run: NEXT_PUBLIC_SUPABASE_URL looks like production.\n" +
      "Point .env.local at a local/staging Supabase, or set " +
      "ALLOW_PROD_ISOLATION_TEST=1 if you REALLY mean it.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PW = "password123!Aa";
const RUN = Date.now();
const BUCKET = "student-photos";

// A real 1×1 PNG so storage probes exercise genuine image bytes.
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const createdCenterIds: string[] = [];
const createdUserIds: string[] = [];
const uploadedPaths: string[] = [];

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(label: string) {
  passed++;
  console.log(`  ✅ ${label}`);
}
function bad(label: string, detail?: string) {
  failed++;
  failures.push(label + (detail ? ` — ${detail}` : ""));
  console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
}

type Res = { data: unknown; error: { message: string } | null };
const rows = (d: unknown): number => (Array.isArray(d) ? d.length : 0);

async function expectNoRows(label: string, q: PromiseLike<Res>) {
  const { data, error } = await q;
  if (error) return ok(`${label} (blocked: ${error.message})`);
  if (rows(data) === 0) return ok(label);
  bad(label, `LEAK: returned ${rows(data)} row(s)`);
}

async function expectInsertBlocked(label: string, q: PromiseLike<Res>) {
  const { data, error } = await q;
  if (error) return ok(`${label} (blocked: ${error.message})`);
  if (rows(data) === 0) return ok(`${label} (no row written)`);
  bad(label, "WRITE SUCCEEDED");
}

async function expectNoneAffected(label: string, q: PromiseLike<Res>) {
  const { data, error } = await q;
  if (error) return ok(`${label} (blocked: ${error.message})`);
  if (rows(data) === 0) return ok(label);
  bad(label, `MUTATED ${rows(data)} row(s)`);
}

async function expectSomeRows(label: string, q: PromiseLike<Res>) {
  const { data, error } = await q;
  if (error) return bad(label, `read failed: ${error.message}`);
  if (rows(data) > 0) return ok(label);
  bad(label, "returned 0 rows (setup or RLS too strict)");
}

// ---------------------------------------------------------------------------
// Provisioning
// ---------------------------------------------------------------------------
type Tenant = {
  key: "A" | "B";
  centerId: string;
  adminId: string;
  teacherId: string;
  teacher2Id: string;
  parent1Id: string; // parent of student1 (tagged)
  parent2Id: string; // parent of student2 (NOT tagged)
  classId: string;
  class2Id: string; // taught by teacher2
  student1Id: string; // tagged on the photo
  student2Id: string; // same class, untagged
  student3Id: string; // teacher2's class
  photoId: string; // uploaded by teacher, tagged → student1
  photoPath: string;
  adminPhotoId: string; // uploaded by admin (teacher must not see it)
  emails: {
    admin: string;
    teacher: string;
    teacher2: string;
    parent1: string;
    parent2: string;
  };
};

async function createUser(
  email: string,
  fullName: string,
  role: "admin" | "teacher" | "parent",
  centerId: string,
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PW,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  const id = data.user!.id;
  createdUserIds.push(id);
  const { error: pErr } = await admin
    .from("users")
    .insert({ id, email, full_name: fullName, role, center_id: centerId });
  if (pErr) throw new Error(`profile ${email}: ${pErr.message}`);
  return id;
}

async function insertPhoto(
  centerId: string,
  uploadedBy: string,
  key: string,
  suffix: string,
): Promise<{ id: string; path: string }> {
  // Id generated up-front so the row can be inserted with its final
  // storage_path (the table CHECK requires the {center_id}/ prefix).
  const id = crypto.randomUUID();
  const path = `${centerId}/${id}.png`;
  const up = await admin.storage.from(BUCKET).upload(path, PNG_1PX, {
    contentType: "image/png",
    upsert: false,
  });
  if (up.error) throw new Error(`upload ${key}: ${up.error.message}`);
  uploadedPaths.push(path);
  const photo = await admin.from("student_photos").insert({
    id,
    center_id: centerId,
    uploaded_by: uploadedBy,
    storage_path: path,
    caption: `photo-${key}-${suffix}`,
    taken_at: "2026-07-01",
  });
  if (photo.error) throw new Error(`photo ${key}: ${photo.error.message}`);
  return { id, path };
}

async function provision(key: "A" | "B"): Promise<Tenant> {
  const tag = `photo-iso-${RUN}-${key}`;
  const center = await admin
    .from("centers")
    .insert({
      name: `Photo Isolation ${key} ${RUN}`,
      contact_email: `${tag}@example.test`,
      subscription_status: "active",
      signup_source: "demo",
    })
    .select("id")
    .single();
  if (center.error) throw new Error(`center ${key}: ${center.error.message}`);
  const centerId = center.data.id as string;
  createdCenterIds.push(centerId);

  const emails = {
    admin: `${tag}-admin@example.test`,
    teacher: `${tag}-teacher@example.test`,
    teacher2: `${tag}-teacher2@example.test`,
    parent1: `${tag}-parent1@example.test`,
    parent2: `${tag}-parent2@example.test`,
  };
  const adminId = await createUser(emails.admin, `Admin ${key}`, "admin", centerId);
  const teacherId = await createUser(emails.teacher, `Teacher ${key}`, "teacher", centerId);
  const teacher2Id = await createUser(emails.teacher2, `Teacher2 ${key}`, "teacher", centerId);
  const parent1Id = await createUser(emails.parent1, `Parent1 ${key}`, "parent", centerId);
  const parent2Id = await createUser(emails.parent2, `Parent2 ${key}`, "parent", centerId);

  const mkClass = async (name: string, tId: string) => {
    const c = await admin
      .from("classes")
      .insert({ center_id: centerId, name, teacher_id: tId, schedule_text: "Mon" })
      .select("id")
      .single();
    if (c.error) throw new Error(`class ${name}: ${c.error.message}`);
    return c.data.id as string;
  };
  const classId = await mkClass(`Class ${key}`, teacherId);
  const class2Id = await mkClass(`Class2 ${key}`, teacher2Id);

  const mkStudent = async (name: string, cId: string, pId: string | null) => {
    const s = await admin
      .from("students")
      .insert({ center_id: centerId, class_id: cId, full_name: name, age: 10, parent_user_id: pId })
      .select("id")
      .single();
    if (s.error) throw new Error(`student ${name}: ${s.error.message}`);
    return s.data.id as string;
  };
  const student1Id = await mkStudent(`Tagged ${key}`, classId, parent1Id);
  const student2Id = await mkStudent(`Untagged ${key}`, classId, parent2Id);
  const student3Id = await mkStudent(`OtherClass ${key}`, class2Id, null);

  const photo = await insertPhoto(centerId, teacherId, key, "teacher");
  const tagRes = await admin
    .from("student_photo_tags")
    .insert({ photo_id: photo.id, student_id: student1Id });
  if (tagRes.error) throw new Error(`tag ${key}: ${tagRes.error.message}`);

  const adminPhoto = await insertPhoto(centerId, adminId, key, "admin");
  const tag2Res = await admin
    .from("student_photo_tags")
    .insert({ photo_id: adminPhoto.id, student_id: student2Id });
  if (tag2Res.error) throw new Error(`tag2 ${key}: ${tag2Res.error.message}`);

  return {
    key, centerId, adminId, teacherId, teacher2Id, parent1Id, parent2Id,
    classId, class2Id, student1Id, student2Id, student3Id,
    photoId: photo.id, photoPath: photo.path, adminPhotoId: adminPhoto.id,
    emails,
  };
}

async function signIn(email: string): Promise<SupabaseClient> {
  const c = createClient(url!, anon!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return c;
}

async function teardown() {
  if (uploadedPaths.length > 0) {
    // Storage objects do NOT cascade with the center delete.
    await admin.storage.from(BUCKET).remove(uploadedPaths);
  }
  if (createdUserIds.length > 0) {
    await admin.from("audit_log").delete().in("user_id", createdUserIds);
    for (const id of createdUserIds) await admin.auth.admin.deleteUser(id, false);
  }
  if (createdCenterIds.length > 0) {
    await admin.from("centers").delete().in("id", createdCenterIds);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n=== Student-photos isolation test (run ${RUN}) ===`);
  console.log(`Target: ${url}\n`);

  let A: Tenant | undefined;
  let B: Tenant | undefined;
  try {
    console.log("Provisioning two centers…");
    A = await provision("A");
    B = await provision("B");
    console.log(`  Center A=${A.centerId}  Center B=${B.centerId}\n`);

    const aAdmin = await signIn(A.emails.admin);
    const aTeacher = await signIn(A.emails.teacher);
    const aTeacher2 = await signIn(A.emails.teacher2);
    const aParent1 = await signIn(A.emails.parent1);
    const aParent2 = await signIn(A.emails.parent2);
    const bAdmin = await signIn(B.emails.admin);

    console.log("── POSITIVE sanity (intended access must work) ──");
    await expectSomeRows("A-teacher reads own photo", aTeacher.from("student_photos").select("id").eq("id", A.photoId));
    await expectSomeRows("A-teacher reads own photo's tags", aTeacher.from("student_photo_tags").select("student_id").eq("photo_id", A.photoId));
    await expectSomeRows("A-admin reads teacher's photo (center-wide)", aAdmin.from("student_photos").select("id").eq("id", A.photoId));
    await expectSomeRows("A-admin reads admin-uploaded photo", aAdmin.from("student_photos").select("id").eq("id", A.adminPhotoId));
    await expectSomeRows("A-parent1 reads photo tagged to own child", aParent1.from("student_photos").select("id, caption").eq("id", A.photoId));
    await expectSomeRows("A-parent1 reads own child's tag row", aParent1.from("student_photo_tags").select("photo_id").eq("student_id", A.student1Id));

    console.log("\n── THE rule: a parent of an UNTAGGED child sees nothing ──");
    await expectNoRows("A-parent2 reads the photo by id", aParent2.from("student_photos").select("id, caption, storage_path").eq("id", A.photoId));
    await expectNoRows("A-parent2 reads the photo's tags", aParent2.from("student_photo_tags").select("student_id").eq("photo_id", A.photoId));
    await expectNoRows("A-parent1 enumerates → other photos invisible", aParent1.from("student_photos").select("id").eq("id", A.adminPhotoId));
    {
      // Full enumeration: parent1 must see EXACTLY their child's photo(s).
      const { data, error } = await aParent1.from("student_photos").select("id");
      if (error) bad("A-parent1 full enumeration", error.message);
      else {
        const ids = (data ?? []).map((r: { id: string }) => r.id);
        if (ids.length === 1 && ids[0] === A.photoId) ok("A-parent1 full enumeration returns only own child's photo");
        else bad("A-parent1 full enumeration", `saw ${ids.length} photo(s): ${ids.join(", ")}`);
      }
    }

    console.log("\n── Parents are strictly read-only ──");
    await expectInsertBlocked("A-parent1 inserts a photo", aParent1.from("student_photos").insert({ center_id: A.centerId, uploaded_by: A.parent1Id, storage_path: `${A.centerId}/evil.png`, taken_at: "2026-07-01" }).select("id"));
    await expectInsertBlocked("A-parent1 tags own child on admin photo", aParent1.from("student_photo_tags").insert({ photo_id: A.adminPhotoId, student_id: A.student1Id }).select("photo_id"));
    await expectNoneAffected("A-parent1 rewrites caption", aParent1.from("student_photos").update({ caption: "hacked" }).eq("id", A.photoId).select("id"));
    await expectNoneAffected("A-parent1 deletes photo", aParent1.from("student_photos").delete().eq("id", A.photoId).select("id"));
    await expectNoneAffected("A-parent1 deletes tag", aParent1.from("student_photo_tags").delete().eq("photo_id", A.photoId).select("photo_id"));

    console.log("\n── Teacher scoping (own uploads; own classes only) ──");
    await expectNoRows("A-teacher reads admin-uploaded photo", aTeacher.from("student_photos").select("id").eq("id", A.adminPhotoId));
    await expectNoneAffected("A-teacher2 deletes teacher1's photo", aTeacher2.from("student_photos").delete().eq("id", A.photoId).select("id"));
    await expectInsertBlocked("A-teacher2 tags own student on teacher1's photo", aTeacher2.from("student_photo_tags").insert({ photo_id: A.photoId, student_id: A.student3Id }).select("photo_id"));
    await expectInsertBlocked("A-teacher tags a student of ANOTHER teacher's class", aTeacher.from("student_photo_tags").insert({ photo_id: A.photoId, student_id: A.student3Id }).select("photo_id"));
    await expectNoneAffected("A-teacher2 rewrites teacher1's caption", aTeacher2.from("student_photos").update({ caption: "hacked" }).eq("id", A.photoId).select("id"));
    await expectNoneAffected("A-teacher reassigns own photo's uploaded_by", aTeacher.from("student_photos").update({ uploaded_by: A.teacher2Id }).eq("id", A.photoId).select("id"));
    await expectNoneAffected("A-teacher repoints own photo's storage_path across centers", aTeacher.from("student_photos").update({ storage_path: `${B.centerId}/evil.png` }).eq("id", A.photoId).select("id"));

    console.log("\n── Cross-center isolation ──");
    await expectNoRows("B-admin reads A photos", bAdmin.from("student_photos").select("id").eq("center_id", A.centerId));
    await expectNoRows("B-admin reads A photo by id", bAdmin.from("student_photos").select("id").eq("id", A.photoId));
    await expectNoRows("B-admin reads A tags", bAdmin.from("student_photo_tags").select("student_id").eq("photo_id", A.photoId));
    await expectNoRows("A-parent1 reads B photos", aParent1.from("student_photos").select("id").eq("center_id", B.centerId));
    await expectInsertBlocked("A-teacher inserts photo into center B", aTeacher.from("student_photos").insert({ center_id: B.centerId, uploaded_by: A.teacherId, storage_path: `${B.centerId}/evil.png`, taken_at: "2026-07-01" }).select("id"));
    await expectInsertBlocked("A-admin tags B student on A photo", aAdmin.from("student_photo_tags").insert({ photo_id: A.adminPhotoId, student_id: B.student1Id }).select("photo_id"));
    await expectNoneAffected("B-admin deletes A photo", bAdmin.from("student_photos").delete().eq("id", A.photoId).select("id"));

    console.log("\n── Storage: private bucket, signed URLs only ──");
    {
      const dl = await aParent2.storage.from(BUCKET).download(A.photoPath);
      if (dl.error) ok(`parent2 direct storage download (blocked: ${dl.error.message})`);
      else bad("parent2 direct storage download", "DOWNLOAD SUCCEEDED without a signed URL");
    }
    {
      const dl = await bAdmin.storage.from(BUCKET).download(A.photoPath);
      if (dl.error) ok(`B-admin direct storage download of A object (blocked)`);
      else bad("B-admin direct storage download of A object", "DOWNLOAD SUCCEEDED");
    }
    {
      const ls = await aParent1.storage.from(BUCKET).list(A.centerId);
      if (ls.error || (ls.data ?? []).length === 0) ok("parent1 cannot list the bucket (no storage policies)");
      else bad("parent1 cannot list the bucket", `listed ${ls.data!.length} object(s)`);
    }
    {
      // Path guessing via the public-URL form must fail on a private bucket.
      const res = await fetch(`${url}/storage/v1/object/public/${BUCKET}/${A.photoPath}`);
      if (res.status >= 400) ok(`public-URL path guess fails (${res.status})`);
      else bad("public-URL path guess", `HTTP ${res.status}`);
    }
    {
      // The sanctioned path: a server-minted signed URL works…
      const signed = await admin.storage.from(BUCKET).createSignedUrl(A.photoPath, 60);
      if (signed.error || !signed.data) {
        bad("service-role signs URL", signed.error?.message);
      } else {
        const okRes = await fetch(signed.data.signedUrl);
        if (okRes.ok) ok("valid signed URL serves the photo");
        else bad("valid signed URL serves the photo", `HTTP ${okRes.status}`);
        // …and a tampered signature does not.
        const tampered = await fetch(signed.data.signedUrl.replace(/token=/, "token=x"));
        if (tampered.status >= 400) ok(`tampered signature rejected (${tampered.status})`);
        else bad("tampered signature rejected", `HTTP ${tampered.status}`);
      }
    }

    console.log("\n── Ground truth (service role): nothing was tampered ──");
    const photoRow = await admin.from("student_photos").select("caption").eq("id", A.photoId).single();
    if (photoRow.data?.caption === "photo-A-teacher") ok("A photo caption untouched");
    else bad("A photo caption", `now "${photoRow.data?.caption}"`);
    const tagCount = await admin.from("student_photo_tags").select("student_id").eq("photo_id", A.photoId);
    if (rows(tagCount.data) === 1) ok("A photo still has exactly its original tag");
    else bad("A photo tags", `now ${rows(tagCount.data)} tag(s)`);
  } finally {
    console.log("\nTearing down test tenants…");
    try {
      await teardown();
      console.log(`  Cleaned up ${createdCenterIds.length} center(s), ${createdUserIds.length} user(s), ${uploadedPaths.length} storage object(s).`);
    } catch (e) {
      console.log(`  ⚠ teardown issue: ${(e as Error).message}`);
      console.log(`  Manual cleanup — centers: ${createdCenterIds.join(", ")} | users: ${createdUserIds.join(", ")} | paths: ${uploadedPaths.join(", ")}`);
    }
  }

  console.log(`\n=== Result: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.log("\nFAILURES:");
    for (const f of failures) console.log(`  • ${f}`);
    process.exit(1);
  }
  console.log("All photo isolation checks passed. 🎉");
}

main().catch((e) => {
  console.error("\nFATAL:", e);
  process.exit(1);
});
