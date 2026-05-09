import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, anon);

  await client.auth.signInWithPassword({
    email: "mai@parent.test",
    password: "password123",
  });

  // Find a child first
  const { data: students } = await client
    .from("students")
    .select(
      "id, full_name, class_id, class:classes(id, name, teacher:users!classes_teacher_id_fkey(full_name))",
    );
  console.log("students:", JSON.stringify(students, null, 2));

  const child = students?.[0];
  if (!child) return;

  const cls = Array.isArray(child.class) ? child.class[0] : child.class;
  console.log("\nclass:", cls);

  // EXACT query from the parent page
  const { data: lessons, error } = await client
    .from("lessons")
    .select(
      "id, lesson_date, vocabulary, grammar_point, speaking_activity, homework, general_note, worksheet:worksheets(id, name, public_url)",
    )
    .eq("class_id", cls!.id)
    .order("lesson_date", { ascending: false })
    .limit(20);

  console.log("\nlessons (with worksheet join):");
  console.log({ lessons, error });

  // Try without the worksheet join
  const { data: l2, error: e2 } = await client
    .from("lessons")
    .select(
      "id, lesson_date, vocabulary, grammar_point, speaking_activity, homework, general_note",
    )
    .eq("class_id", cls!.id)
    .order("lesson_date", { ascending: false })
    .limit(20);
  console.log("\nlessons (no worksheet join):");
  console.log({ lessons: l2, error: e2 });
}

main();
