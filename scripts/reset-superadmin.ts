import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

(async () => {
  const c = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const email = (process.env.SUPER_ADMIN_EMAIL ?? "").split(",")[0].trim();
  const newPassword = "ChangeMe-" + Date.now().toString().slice(-6);

  let userId: string | null = null;
  let page = 1;
  while (true) {
    const { data } = await c.auth.admin.listUsers({ page, perPage: 1000 });
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) {
      userId = hit.id;
      break;
    }
    if (data.users.length < 1000) break;
    page++;
  }

  if (!userId) {
    console.log(`No user with email ${email} found. Creating one...`);
    const { data, error } = await c.auth.admin.createUser({
      email,
      password: newPassword,
      email_confirm: true,
    });
    if (error) {
      console.error("create error:", error.message);
      process.exit(1);
    }
    userId = data.user!.id;
  } else {
    const { error } = await c.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (error) {
      console.error("update error:", error.message);
      process.exit(1);
    }
  }

  console.log(`\nSuper-admin password reset.\n`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${newPassword}\n`);
  console.log(`Login at https://klazly.com/login`);
})();
