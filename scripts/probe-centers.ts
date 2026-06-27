import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

async function main() {
  config({ path: ".env.local" });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  console.log(
    "url:",
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https:\/\/([^.]+)\..*/, "$1"),
  );
  const { data, error } = await supabase
    .from("centers")
    .select("id, name")
    .limit(5);
  console.log("error:", error?.message ?? "none");
  console.log("centers:", JSON.stringify(data, null, 2));
}

main();
