import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const client = createClient(url, anon);

  console.log("Signing in as mai@parent.test ...");
  const { data: signIn, error: signInErr } =
    await client.auth.signInWithPassword({
      email: "mai@parent.test",
      password: "password123",
    });
  if (signInErr) {
    console.error("Sign-in failed:", signInErr.message);
    process.exit(1);
  }
  console.log("Signed in as user id:", signIn.user!.id);

  const { data: profile, error: profErr } = await client
    .from("users")
    .select("id, full_name, role, center_id")
    .single();
  console.log("\n--- public.users SELECT (own row via RLS) ---");
  console.log({ profile, profErr });

  const { data: students, error: stuErr } = await client
    .from("students")
    .select("id, full_name, parent_user_id, class_id, center_id");
  console.log("\n--- students SELECT (via RLS) ---");
  console.log({ students, stuErr });

  const { data: lessons, error: lessonErr } = await client
    .from("lessons")
    .select("id, lesson_date, vocabulary");
  console.log("\n--- lessons SELECT (via RLS) ---");
  console.log({ lessons, lessonErr });
}

main();
