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
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const sc = createClient(url, svc, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Get center A's id
  const { data: centerA } = await sc
    .from("centers")
    .select("id, name")
    .eq("name", "Trung Tâm Anh Ngữ Hoa Mai")
    .single();
  if (!centerA) {
    console.log("❌ Center A not found — re-seed first");
    return;
  }
  console.log(`Center A: ${centerA.name} (${centerA.id})`);

  // Create center B
  console.log("\nCreating Center B...");
  const { data: centerB, error: cBErr } = await sc
    .from("centers")
    .insert({
      name: "TEST Center B",
      contact_email: "admin@centerb.test",
      subscription_status: "trial",
    })
    .select()
    .single();
  if (cBErr) {
    console.log(`❌ create center B: ${cBErr.message}`);
    return;
  }

  // Cleanup any previous test users
  const allUsers = await sc.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of allUsers.data.users) {
    if (u.email?.endsWith("@centerb.test")) {
      await sc.auth.admin.deleteUser(u.id, false);
    }
  }

  // Create center B's admin
  const { data: bAdmin, error: bErr } = await sc.auth.admin.createUser({
    email: "admin@centerb.test",
    password: "password123",
    email_confirm: true,
  });
  if (bErr) {
    console.log(`❌ create B admin: ${bErr.message}`);
    return;
  }
  await sc.from("users").insert({
    id: bAdmin.user!.id,
    email: "admin@centerb.test",
    full_name: "B Admin",
    role: "admin",
    center_id: centerB.id,
  });

  // Create a teacher and student in center B
  const { data: bTeacher } = await sc.auth.admin.createUser({
    email: "teacher@centerb.test",
    password: "password123",
    email_confirm: true,
  });
  await sc.from("users").insert({
    id: bTeacher.user!.id,
    email: "teacher@centerb.test",
    full_name: "B Teacher",
    role: "teacher",
    center_id: centerB.id,
  });

  const { data: bClass } = await sc
    .from("classes")
    .insert({
      center_id: centerB.id,
      name: "Center B Class",
      teacher_id: bTeacher.user!.id,
    })
    .select()
    .single();

  await sc.from("students").insert({
    center_id: centerB.id,
    class_id: bClass!.id,
    full_name: "B Student",
  });

  console.log("Center B set up. Testing isolation...\n");

  // === Test: Center A admin cannot see Center B data ===
  const aClient = createClient(url, anon);
  await aClient.auth.signInWithPassword({
    email: "admin@hoamai.test",
    password: "password123",
  });

  const aClassesView = await aClient.from("classes").select("id, name, center_id");
  const aSeesB = (aClassesView.data as { center_id: string }[] ?? []).some(
    (c) => c.center_id === centerB.id,
  );
  check(
    "Center A admin CANNOT see Center B classes",
    null,
    aSeesB ? "LEAK ❌" : "isolated",
  );
  if (aSeesB) console.log("  ⚠ LEAK — RLS broken!");

  const aStudentsView = await aClient
    .from("students")
    .select("id, center_id");
  const aSeesBStudent = (aStudentsView.data as { center_id: string }[] ?? []).some(
    (s) => s.center_id === centerB.id,
  );
  check(
    "Center A admin CANNOT see Center B students",
    null,
    aSeesBStudent ? "LEAK ❌" : "isolated",
  );

  const aCentersView = await aClient.from("centers").select("id");
  const aSeesBCenter = (aCentersView.data as { id: string }[] ?? []).some(
    (c) => c.id === centerB.id,
  );
  check(
    "Center A admin CANNOT see Center B itself",
    null,
    aSeesBCenter ? "LEAK ❌" : "isolated",
  );

  // === Test: Center B admin cannot see Center A data ===
  await aClient.auth.signOut();
  const bClient = createClient(url, anon);
  await bClient.auth.signInWithPassword({
    email: "admin@centerb.test",
    password: "password123",
  });

  const bStudents = await bClient.from("students").select("id, center_id");
  const bCount = bStudents.data?.length ?? 0;
  console.log(
    bCount === 1
      ? "✅ Center B admin sees ONLY their 1 student"
      : `❌ Center B admin sees ${bCount} students (expected 1)`,
  );

  const bClasses = await bClient.from("classes").select("id, center_id");
  console.log(
    bClasses.data?.length === 1
      ? "✅ Center B admin sees ONLY their 1 class"
      : `❌ Center B admin sees ${bClasses.data?.length ?? 0} classes (expected 1)`,
  );

  // === Test: Center B parent (mai) cannot see Center A data ===
  // (mai is in Center A, so logging her in should ONLY see her own kids)
  await bClient.auth.signOut();
  const mClient = createClient(url, anon);
  await mClient.auth.signInWithPassword({
    email: "mai@parent.test",
    password: "password123",
  });
  const mStudents = await mClient.from("students").select("id");
  console.log(
    mStudents.data?.length === 2
      ? "✅ Parent sees ONLY their own 2 children (no leak from any center)"
      : `❌ Parent sees ${mStudents.data?.length} students (expected 2)`,
  );

  // === Cleanup Center B ===
  console.log("\nCleaning up Center B...");
  await sc.from("lessons").delete().eq("teacher_id", bTeacher.user!.id);
  await sc.from("centers").delete().eq("id", centerB.id);
  await sc.auth.admin.deleteUser(bAdmin.user!.id, false);
  await sc.auth.admin.deleteUser(bTeacher.user!.id, false);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
