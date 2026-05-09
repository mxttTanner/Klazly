import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const [centers, users, classes, students, lessons, authUsers] =
    await Promise.all([
      supabase.from("centers").select("id, name, subscription_status"),
      supabase.from("users").select("id, email, full_name, role, center_id"),
      supabase.from("classes").select("id, name, center_id, teacher_id"),
      supabase
        .from("students")
        .select("id, full_name, center_id, class_id, parent_user_id"),
      supabase.from("lessons").select("id"),
      supabase.auth.admin.listUsers({ page: 1, perPage: 100 }),
    ]);

  console.log("=== centers ===");
  console.log(centers.data);
  console.log("\n=== auth users ===");
  console.log(
    authUsers.data?.users.map((u) => ({ id: u.id, email: u.email })),
  );
  console.log("\n=== public.users ===");
  console.log(users.data);
  console.log("\n=== classes ===");
  console.log(classes.data);
  console.log("\n=== students ===");
  console.log(students.data);
  console.log("\n=== lessons count ===", lessons.data?.length ?? 0);
}

main();
