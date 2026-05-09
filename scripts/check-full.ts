import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

(async () => {
  const c = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const centers = await c.from("centers").select("id, name");
  console.log("centers:");
  console.table(centers.data);

  const users = await c
    .from("users")
    .select("id, email, full_name, role, center_id");
  console.log("\nusers:");
  console.table(users.data);

  const students = await c
    .from("students")
    .select("id, full_name, class_id, parent_user_id, center_id");
  console.log("\nstudents:");
  console.table(students.data);

  const classes = await c
    .from("classes")
    .select("id, name, teacher_id, center_id");
  console.log("\nclasses:");
  console.table(classes.data);

  const lessons = await c.from("lessons").select("id, class_id, lesson_date");
  console.log("\nlessons by class:");
  const byClass: Record<string, number> = {};
  for (const l of lessons.data ?? [])
    byClass[(l as { class_id: string }).class_id] =
      (byClass[(l as { class_id: string }).class_id] ?? 0) + 1;
  console.table(byClass);
})();
