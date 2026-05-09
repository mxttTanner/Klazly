import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

(async () => {
  const c = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  await c.auth.signInWithPassword({
    email: "tu@hoamai.test",
    password: "password123",
  });
  const tid = (await c.auth.getUser()).data.user!.id;
  const myClass = (await c.from("classes").select("id, name").eq("teacher_id", tid))
    .data;
  console.log("teacher class:", myClass);
  const cid = (myClass as { id: string }[])[0].id;

  const roster = await c
    .from("students")
    .select("id, full_name, class_id, parent_user_id")
    .eq("class_id", cid);
  console.log("\nroster AS TEACHER (RLS scoped):", roster.data);

  await c.auth.signOut();
  const sc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const all = await sc
    .from("students")
    .select("id, full_name, class_id")
    .eq("class_id", cid);
  console.log("\nroster VIA SERVICE ROLE:", all.data);
})();
