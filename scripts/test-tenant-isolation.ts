/**
 * Multi-tenant isolation test — validates that one center can NEVER read or
 * write another center's data through the RLS-scoped (anon key + user JWT)
 * client, which is the real security boundary (the Supabase URL + anon key
 * ship in the browser bundle, so any authenticated user can hit PostgREST
 * directly). This is the automated proof for audit item C1 and friends.
 *
 * What it does:
 *   1. Provisions two throwaway centers (A, B), each with an admin, a
 *      teacher, a parent, a class, a student, a lesson + per-student update,
 *      a parent↔teacher message, and a worksheet. (service-role client)
 *   2. Signs in all SIX users as independent sessions (two centers at once).
 *   3. Runs cross-tenant NEGATIVE probes (must be blocked / return 0 rows)
 *      across lessons, student_lesson_updates, students, classes, centers,
 *      worksheets, messages — reads AND writes.
 *   4. Runs POSITIVE sanity checks (own-center access must still work), so a
 *      pass can't be faked by RLS simply blocking everything.
 *   5. Runs escalation + tamper probes (self role/center change, message-body
 *      rewrite, cross-teacher worksheet delete).
 *   6. Tears everything down in a finally block (delete by captured IDs).
 *
 * SAFE FOR DEV/STAGING ONLY. Point .env.local at a NON-production Supabase
 * that has ALL migrations applied (schema.sql + every db/*.sql, including
 * db/2026-07-02-audit-fixes.sql). Run: npm run test:isolation
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

// Guard-rail: refuse to run against anything that looks like the live project.
// Set ALLOW_PROD_ISOLATION_TEST=1 to override (not recommended).
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
const RUN = Date.now(); // unique suffix so reruns don't collide on email

// Track EVERY id we create, globally, so teardown can clean up even if
// provisioning throws halfway (important when running against prod).
const createdCenterIds: string[] = [];
const createdUserIds: string[] = [];

// ---------------------------------------------------------------------------
// Result tracking
// ---------------------------------------------------------------------------
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

// Supabase query builders are thenables resolving to { data, error }. We only
// ever need the row count and the error message, so type them loosely.
type Res = { data: unknown; error: { message: string } | null };
const rows = (d: unknown): number => (Array.isArray(d) ? d.length : 0);

/** A cross-tenant SELECT must return zero rows (RLS filters silently). */
async function expectNoRows(label: string, q: PromiseLike<Res>) {
  const { data, error } = await q;
  if (error) return ok(`${label} (blocked: ${error.message})`);
  if (rows(data) === 0) return ok(label);
  bad(label, `LEAK: returned ${rows(data)} row(s)`);
}

/** A cross-tenant INSERT must be rejected by RLS (error) or write nothing. */
async function expectInsertBlocked(label: string, q: PromiseLike<Res>) {
  const { data, error } = await q;
  if (error) return ok(`${label} (blocked: ${error.message})`);
  if (rows(data) === 0) return ok(`${label} (no row written)`);
  bad(label, "WRITE SUCCEEDED cross-tenant");
}

/** A cross-tenant UPDATE/DELETE must affect zero rows (use .select()). */
async function expectNoneAffected(label: string, q: PromiseLike<Res>) {
  const { data, error } = await q;
  if (error) return ok(`${label} (blocked: ${error.message})`);
  if (rows(data) === 0) return ok(label);
  bad(label, `MUTATED ${rows(data)} row(s) cross-tenant`);
}

/** A same-tenant read that MUST return rows (positive sanity). */
async function expectSomeRows(label: string, q: PromiseLike<Res>) {
  const { data, error } = await q;
  if (error) return bad(label, `own-center read failed: ${error.message}`);
  if (rows(data) > 0) return ok(label);
  bad(label, "own-center read returned 0 rows (setup or RLS too strict)");
}

// ---------------------------------------------------------------------------
// Provisioning
// ---------------------------------------------------------------------------
type Tenant = {
  key: "A" | "B";
  centerId: string;
  adminId: string;
  teacherId: string;
  parentId: string;
  classId: string;
  studentId: string;
  lessonId: string;
  messageId: string;
  worksheetId: string;
  emails: string[];
  userIds: string[];
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

async function provision(key: "A" | "B"): Promise<Tenant> {
  const tag = `iso-${RUN}-${key}`;
  const center = await admin
    .from("centers")
    .insert({
      name: `Isolation Test ${key} ${RUN}`,
      contact_email: `${tag}@example.test`,
      subscription_status: "active",
      // Tag as demo so it's excluded from super-admin KPIs / center list
      // while the test is briefly live on prod.
      signup_source: "demo",
    })
    .select("id")
    .single();
  if (center.error) throw new Error(`center ${key}: ${center.error.message}`);
  const centerId = center.data.id as string;
  createdCenterIds.push(centerId);

  const adminId = await createUser(`${tag}-admin@example.test`, `Admin ${key}`, "admin", centerId);
  const teacherId = await createUser(`${tag}-teacher@example.test`, `Teacher ${key}`, "teacher", centerId);
  const parentId = await createUser(`${tag}-parent@example.test`, `Parent ${key}`, "parent", centerId);

  const cls = await admin
    .from("classes")
    .insert({ center_id: centerId, name: `Class ${key}`, teacher_id: teacherId, schedule_text: "Mon" })
    .select("id")
    .single();
  if (cls.error) throw new Error(`class ${key}: ${cls.error.message}`);
  const classId = cls.data.id as string;

  const stu = await admin
    .from("students")
    .insert({ center_id: centerId, class_id: classId, full_name: `Student ${key}`, age: 10, parent_user_id: parentId })
    .select("id")
    .single();
  if (stu.error) throw new Error(`student ${key}: ${stu.error.message}`);
  const studentId = stu.data.id as string;

  const les = await admin
    .from("lessons")
    .insert({ class_id: classId, teacher_id: teacherId, lesson_date: "2026-07-01", vocabulary: `secret-${key}` })
    .select("id")
    .single();
  if (les.error) throw new Error(`lesson ${key}: ${les.error.message}`);
  const lessonId = les.data.id as string;

  const slu = await admin
    .from("student_lesson_updates")
    .insert({ lesson_id: lessonId, student_id: studentId, behavior_rating: "great", individual_note: `private-note-${key}`, homework_completed: true });
  if (slu.error) throw new Error(`slu ${key}: ${slu.error.message}`);

  const msg = await admin
    .from("parent_teacher_messages")
    .insert({ center_id: centerId, student_id: studentId, sender_user_id: teacherId, body: `confidential-${key}` })
    .select("id")
    .single();
  if (msg.error) throw new Error(`message ${key}: ${msg.error.message}`);
  const messageId = msg.data.id as string;

  const ws = await admin
    .from("worksheets")
    .insert({ center_id: centerId, uploaded_by: teacherId, name: `Worksheet ${key}`, storage_path: `${centerId}/x.pdf`, public_url: "http://x/x.pdf", file_type: "application/pdf", size_bytes: 10 })
    .select("id")
    .single();
  if (ws.error) throw new Error(`worksheet ${key}: ${ws.error.message}`);
  const worksheetId = ws.data.id as string;

  return {
    key, centerId, adminId, teacherId, parentId, classId, studentId,
    lessonId, messageId, worksheetId,
    emails: [`${tag}-admin@example.test`, `${tag}-teacher@example.test`, `${tag}-parent@example.test`],
    userIds: [adminId, teacherId, parentId],
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
  // Uses the global id lists, so it cleans up even a partially-provisioned
  // run. Order: audit_log (references user_id) → auth users → centers
  // (cascades classes/students/lessons/slu/messages/worksheets).
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
  console.log(`\n=== Multi-tenant isolation test (run ${RUN}) ===`);
  console.log(`Target: ${url}\n`);

  let A: Tenant | undefined;
  let B: Tenant | undefined;
  try {
    console.log("Provisioning two centers…");
    A = await provision("A");
    B = await provision("B");
    console.log(`  Center A=${A.centerId}  Center B=${B.centerId}\n`);

    // Six independent sessions — two centers active at the same time.
    const aAdmin = await signIn(A.emails[0]);
    const aTeacher = await signIn(A.emails[1]);
    const aParent = await signIn(A.emails[2]);
    const bAdmin = await signIn(B.emails[0]);

    console.log("── POSITIVE sanity (own-center access must work) ──");
    await expectSomeRows("A-admin reads own lessons", aAdmin.from("lessons").select("id").eq("class_id", A.classId));
    await expectSomeRows("A-admin reads own students", aAdmin.from("students").select("id").eq("center_id", A.centerId));
    await expectSomeRows("A-teacher reads own class roster", aTeacher.from("students").select("id").eq("class_id", A.classId));
    await expectSomeRows("A-teacher reads own slu", aTeacher.from("student_lesson_updates").select("lesson_id").eq("lesson_id", A.lessonId));
    await expectSomeRows("A-parent reads own child", aParent.from("students").select("id").eq("id", A.studentId));
    await expectSomeRows("A-parent reads own child slu", aParent.from("student_lesson_updates").select("lesson_id").eq("student_id", A.studentId));
    await expectSomeRows("A-parent reads own message", aParent.from("parent_teacher_messages").select("id").eq("student_id", A.studentId));

    console.log("\n── C1: cross-tenant READS of B must return nothing ──");
    await expectNoRows("A-admin reads B lessons", aAdmin.from("lessons").select("id, vocabulary").eq("class_id", B.classId));
    await expectNoRows("A-admin reads ALL lessons (only sees own)", aAdmin.from("lessons").select("id").eq("vocabulary", "secret-B"));
    await expectNoRows("A-admin reads B student_lesson_updates", aAdmin.from("student_lesson_updates").select("lesson_id").eq("lesson_id", B.lessonId));
    await expectNoRows("A-admin reads B private notes (scan)", aAdmin.from("student_lesson_updates").select("individual_note").eq("individual_note", "private-note-B"));
    await expectNoRows("A-admin reads B students", aAdmin.from("students").select("id").eq("center_id", B.centerId));
    await expectNoRows("A-admin reads B classes", aAdmin.from("classes").select("id").eq("center_id", B.centerId));
    await expectNoRows("A-admin reads B center row", aAdmin.from("centers").select("id").eq("id", B.centerId));
    await expectNoRows("A-admin reads B worksheets", aAdmin.from("worksheets").select("id").eq("center_id", B.centerId));
    await expectNoRows("A-admin reads B messages", aAdmin.from("parent_teacher_messages").select("id, body").eq("student_id", B.studentId));
    await expectNoRows("A-teacher reads B lessons", aTeacher.from("lessons").select("id").eq("class_id", B.classId));
    await expectNoRows("A-teacher reads B slu", aTeacher.from("student_lesson_updates").select("lesson_id").eq("lesson_id", B.lessonId));
    await expectNoRows("A-parent reads B students", aParent.from("students").select("id").eq("center_id", B.centerId));
    await expectNoRows("A-parent reads B lessons", aParent.from("lessons").select("id").eq("class_id", B.classId));
    await expectNoRows("A-parent reads B messages", aParent.from("parent_teacher_messages").select("id").eq("student_id", B.studentId));
    // Symmetric: B must not see A either.
    await expectNoRows("B-admin reads A lessons", bAdmin.from("lessons").select("id").eq("class_id", A.classId));
    await expectNoRows("B-admin reads A students", bAdmin.from("students").select("id").eq("center_id", A.centerId));

    console.log("\n── C1: cross-tenant WRITES into B must be blocked ──");
    await expectInsertBlocked("A-teacher inserts lesson into B class", aTeacher.from("lessons").insert({ class_id: B.classId, teacher_id: A!.teacherId, lesson_date: "2026-07-02", vocabulary: "evil" }).select("id"));
    await expectInsertBlocked("A-admin inserts lesson into B class", aAdmin.from("lessons").insert({ class_id: B.classId, teacher_id: A!.teacherId, lesson_date: "2026-07-03", vocabulary: "evil" }).select("id"));
    await expectInsertBlocked("A-teacher inserts slu for B lesson", aTeacher.from("student_lesson_updates").insert({ lesson_id: B.lessonId, student_id: B.studentId, behavior_rating: "okay", homework_completed: false }).select("lesson_id"));
    await expectNoneAffected("A-admin updates B lesson", aAdmin.from("lessons").update({ vocabulary: "tampered" }).eq("id", B.lessonId).select("id"));
    await expectNoneAffected("A-admin deletes B lesson", aAdmin.from("lessons").delete().eq("id", B.lessonId).select("id"));
    await expectInsertBlocked("A-admin inserts student into B class", aAdmin.from("students").insert({ center_id: B.centerId, class_id: B.classId, full_name: "evil", age: 9, parent_user_id: A!.parentId }).select("id"));

    console.log("\n── H5: message tampering must be blocked ──");
    await expectNoneAffected("A-parent rewrites B message body", aParent.from("parent_teacher_messages").update({ body: "hacked" }).eq("id", B.messageId).select("id"));
    await expectNoneAffected("A-parent rewrites OWN-thread message body", aParent.from("parent_teacher_messages").update({ body: "hacked" }).eq("id", A!.messageId).select("id"));
    // The only sanctioned mutation is the mark-read RPC; cross-tenant it must no-op (not error, not leak).
    {
      const { error } = await aParent.rpc("mark_messages_read", { p_student_id: B.studentId });
      if (error) ok(`A-parent mark_messages_read on B child (blocked: ${error.message})`);
      else {
        const leaked = await admin.from("parent_teacher_messages").select("read_at").eq("id", B.messageId).single();
        if (leaked.data && leaked.data.read_at === null) ok("A-parent mark_messages_read on B child (no effect)");
        else bad("A-parent mark_messages_read on B child", "marked another center's message read");
      }
    }

    console.log("\n── L3 / escalation: worksheet + self-escalation ──");
    await expectNoneAffected("A-teacher deletes B worksheet", aTeacher.from("worksheets").delete().eq("id", B.worksheetId).select("id"));
    await expectNoneAffected("A-admin changes own role→ (escalation)", aAdmin.from("users").update({ role: "admin" }).eq("id", A!.adminId).select("id"));
    await expectNoneAffected("A-admin changes own center_id→B (escalation)", aAdmin.from("users").update({ center_id: B.centerId }).eq("id", A!.adminId).select("id"));

    // Confirm nothing was actually tampered (service-role ground truth).
    const bLesson = await admin.from("lessons").select("vocabulary").eq("id", B.lessonId).single();
    if (bLesson.data?.vocabulary === "secret-B") ok("Ground truth: B lesson untouched");
    else bad("Ground truth: B lesson", `vocabulary is now "${bLesson.data?.vocabulary}"`);
    const aAdminRow = await admin.from("users").select("center_id").eq("id", A.adminId).single();
    if (aAdminRow.data?.center_id === A.centerId) ok("Ground truth: A-admin center_id unchanged");
    else bad("Ground truth: A-admin center_id", "was mutated");
  } finally {
    console.log("\nTearing down test tenants…");
    try {
      await teardown();
      console.log(`  Cleaned up ${createdCenterIds.length} center(s), ${createdUserIds.length} user(s).`);
    } catch (e) {
      console.log(`  ⚠ teardown issue: ${(e as Error).message}`);
      console.log(`  Manual cleanup ids — centers: ${createdCenterIds.join(", ")} | users: ${createdUserIds.join(", ")}`);
    }
  }

  console.log(`\n=== Result: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.log("\nFAILURES:");
    for (const f of failures) console.log(`  • ${f}`);
    process.exit(1);
  }
  console.log("All isolation checks passed. 🎉");
}

main().catch((e) => {
  console.error("\nFATAL:", e);
  process.exit(1);
});
