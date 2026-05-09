import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

function check(label: string, error: { message: string } | null, count?: unknown) {
  if (error) console.log(`❌ ${label}: ${error.message}`);
  else
    console.log(
      `✅ ${label}${count !== undefined ? ` (${count})` : ""}`,
    );
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, anon);

  console.log("\n=== TEACHER (tu@hoamai.test) ===\n");
  await client.auth.signInWithPassword({
    email: "tu@hoamai.test",
    password: "password123",
  });
  const teacherId = (await client.auth.getUser()).data.user!.id;
  const teacherCenter = (
    await client
      .from("users")
      .select("center_id")
      .eq("id", teacherId)
      .single()
  ).data!.center_id;

  const myClasses = await client
    .from("classes")
    .select("id, name")
    .eq("teacher_id", teacherId);
  check("list my classes", myClasses.error, myClasses.data?.length);
  const classId = (myClasses.data as { id: string }[])?.[0]?.id;
  if (!classId) {
    console.log("(no class — skipping rest)");
    return;
  }

  const roster = await client
    .from("students")
    .select("id, full_name")
    .eq("class_id", classId);
  check("class roster", roster.error, roster.data?.length);

  const lessonsRead = await client
    .from("lessons")
    .select(
      "id, lesson_date, vocabulary, grammar_point, speaking_activity, homework, general_note, worksheet:worksheets(id, name, public_url)",
    )
    .eq("class_id", classId);
  check("class lessons (with worksheet join)", lessonsRead.error, lessonsRead.data?.length);

  const tpls = await client
    .from("lesson_templates")
    .select("id, name, vocabulary, grammar_point");
  check("templates picker", tpls.error, tpls.data?.length);

  const ws = await client.from("worksheets").select("id, name, file_type");
  check("worksheets picker", ws.error, ws.data?.length);

  // CREATE lesson + per-student updates
  const lesson = await client
    .from("lessons")
    .insert({
      class_id: classId,
      teacher_id: teacherId,
      lesson_date: "2026-05-09",
      vocabulary: "TEST",
    })
    .select()
    .single();
  check("create lesson", lesson.error);

  const sid = (roster.data as { id: string }[])?.[0]?.id;
  if (lesson.data && sid) {
    const slu = await client.from("student_lesson_updates").insert({
      lesson_id: (lesson.data as { id: string }).id,
      student_id: sid,
      behavior_rating: "great",
      homework_completed: true,
    });
    check("create student update", slu.error);

    // UPDATE lesson
    const upd = await client
      .from("lessons")
      .update({ vocabulary: "UPDATED" })
      .eq("id", (lesson.data as { id: string }).id);
    check("update lesson", upd.error);

    // Save a template
    const tpl = await client.from("lesson_templates").insert({
      center_id: teacherCenter,
      created_by: teacherId,
      name: "TestTpl-" + Date.now(),
      vocabulary: "v",
    });
    check("save template", tpl.error);

    // CLEANUP test lesson + template
    await client.from("lessons").delete().eq("id", (lesson.data as { id: string }).id);
    await client.from("lesson_templates").delete().like("name", "TestTpl-%");
  }

  console.log("\n=== ADMIN (admin@hoamai.test) ===\n");
  await client.auth.signOut();
  await client.auth.signInWithPassword({
    email: "admin@hoamai.test",
    password: "password123",
  });

  const adminClasses = await client
    .from("classes")
    .select("id, name, teacher:users!classes_teacher_id_fkey(full_name)");
  check("admin classes (teacher join)", adminClasses.error, adminClasses.data?.length);

  const adminStudents = await client
    .from("students")
    .select("id, full_name, class_id, parent_user_id");
  check("admin students", adminStudents.error, adminStudents.data?.length);

  const adminWS = await client
    .from("worksheets")
    .select(
      "id, name, file_type, size_bytes, public_url, created_at, uploader:users!worksheets_uploaded_by_fkey(full_name)",
    );
  check("admin worksheets (uploader join)", adminWS.error, adminWS.data?.length);

  const adminRecent = await client
    .from("lessons")
    .select(
      "id, lesson_date, class:classes(name), teacher:users!lessons_teacher_id_fkey(full_name)",
    )
    .order("lesson_date", { ascending: false })
    .limit(5);
  check("admin recent lessons (joins)", adminRecent.error, adminRecent.data?.length);

  const adminUserId = (await client.auth.getUser()).data.user!.id;
  const adminCenterId = (
    await client.from("users").select("center_id").eq("id", adminUserId).single()
  ).data!.center_id;
  const adminCenter = await client
    .from("centers")
    .select("name, logo_url, subscription_status, trial_ends_at")
    .eq("id", adminCenterId)
    .single();
  check("admin center settings (incl trial_ends_at)", adminCenter.error);

  console.log("\n=== PARENT (mai@parent.test) ===\n");
  await client.auth.signOut();
  await client.auth.signInWithPassword({
    email: "mai@parent.test",
    password: "password123",
  });

  const parentKids = await client
    .from("students")
    .select(
      "id, full_name, class:classes(name, teacher:users!classes_teacher_id_fkey(full_name))",
    );
  check("parent children (class+teacher join)", parentKids.error, parentKids.data?.length);

  const firstChild = (parentKids.data as { id: string; class: { id?: string }[] | { id?: string } }[])?.[0];
  const childClass = firstChild
    ? Array.isArray(firstChild.class)
      ? firstChild.class[0]
      : firstChild.class
    : null;
  void childClass;

  const parentLessons = await client
    .from("lessons")
    .select(
      "id, lesson_date, vocabulary, worksheet:worksheets(id, name, public_url)",
    );
  check("parent lessons (worksheet join)", parentLessons.error, parentLessons.data?.length);

  const parentSLU = await client
    .from("student_lesson_updates")
    .select("lesson_id, behavior_rating, individual_note, homework_completed")
    .in("lesson_id", (parentLessons.data as { id: string }[] ?? []).map((l) => l.id));
  check("parent student updates", parentSLU.error, parentSLU.data?.length);

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
