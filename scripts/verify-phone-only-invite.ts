/**
 * End-to-end verification of the phone-first invite flow.
 *
 * Creates a phone-only parent and a phone-only teacher row using the
 * service-role client (mirrors what inviteParent / inviteTeacher do
 * internally), then cleans them up. Verifies that the underlying
 * auth.admin.createUser + public.users insert pattern still works
 * for rows where `email IS NULL` and the auth email is the synthetic
 * `+84xxx@phone.parent-portal.local` form.
 *
 * Run:
 *   npx tsx scripts/verify-phone-only-invite.ts
 *
 * Touches one real center (Mỹ Hảo / Myha English). Both test rows
 * are named "TEST-PhoneFirst-*" and explicitly deleted at the end.
 * If the script crashes mid-way, the orphan auth user is still
 * deleted by the centers cascade or can be manually removed via the
 * Supabase dashboard.
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeVnPhone, syntheticEmailForPhone } from "../src/lib/phone";

config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// "Trung Tâm Anh Ngữ Hoa Mai" — the demo center, safe to write
// throwaway rows into. Mỹ Hảo's real center stays untouched.
// Hardcoded to keep the script arg-free.
const TEST_CENTER_ID = "85f6b629-5013-4925-918f-c837feb91e26";

type Case = {
  label: string;
  rawPhone: string;
  fullName: string;
  role: "parent" | "teacher";
};

const cases: Case[] = [
  {
    label: "Parent — phone only, no email",
    rawPhone: "0398765432",
    fullName: "TEST-PhoneFirst-Parent",
    role: "parent",
  },
  {
    label: "Teacher — phone only, no email",
    rawPhone: "0398765433",
    fullName: "TEST-PhoneFirst-Teacher",
    role: "teacher",
  },
];

let failures = 0;

async function runCase(c: Case): Promise<void> {
  const canonical = normalizeVnPhone(c.rawPhone);
  if (!canonical) {
    console.error(`✗ ${c.label}: normalizeVnPhone rejected ${c.rawPhone}`);
    failures += 1;
    return;
  }
  const authEmail = syntheticEmailForPhone(canonical);

  // Create the auth user.
  const { data: created, error: authErr } = await supabase.auth.admin.createUser(
    {
      email: authEmail,
      password: "verify-phone-first-pwd-2026",
      email_confirm: true,
    },
  );
  if (authErr || !created.user) {
    console.error(
      `✗ ${c.label}: auth.admin.createUser failed — ${authErr?.message ?? "no user returned"}`,
    );
    failures += 1;
    return;
  }
  const authUserId = created.user.id;

  // Insert the public.users row with phone, null email.
  const { error: profErr } = await supabase.from("users").insert({
    id: authUserId,
    email: null,
    phone: canonical,
    full_name: c.fullName,
    role: c.role,
    center_id: TEST_CENTER_ID,
  });
  if (profErr) {
    console.error(
      `✗ ${c.label}: public.users insert failed — ${profErr.message}`,
    );
    // Roll back the auth user so we don't leave an orphan.
    await supabase.auth.admin.deleteUser(authUserId);
    failures += 1;
    return;
  }

  console.log(
    `✓ ${c.label} — created (auth user ${authUserId}, phone ${canonical})`,
  );

  // Read it back to confirm the row is visible.
  const { data: readBack, error: readErr } = await supabase
    .from("users")
    .select("id, phone, email, full_name, role, center_id")
    .eq("id", authUserId)
    .single();
  if (readErr || !readBack) {
    console.error(`✗ ${c.label}: read-back failed — ${readErr?.message ?? ""}`);
    failures += 1;
  } else {
    if (readBack.phone !== canonical) {
      console.error(
        `✗ ${c.label}: phone mismatch — stored '${readBack.phone}', expected '${canonical}'`,
      );
      failures += 1;
    }
    if (readBack.email !== null) {
      console.error(
        `✗ ${c.label}: email expected null, got '${readBack.email}'`,
      );
      failures += 1;
    }
    if (readBack.role !== c.role) {
      console.error(
        `✗ ${c.label}: role mismatch — stored '${readBack.role}', expected '${c.role}'`,
      );
      failures += 1;
    }
    console.log(
      `✓ ${c.label} — read-back ok (phone=${readBack.phone}, email=${readBack.email}, role=${readBack.role})`,
    );
  }

  // Clean up: deleting the auth user cascades to public.users via the
  // FK ON DELETE CASCADE (see db/schema.sql).
  const { error: delErr } = await supabase.auth.admin.deleteUser(authUserId);
  if (delErr) {
    console.error(`✗ ${c.label}: cleanup deleteUser failed — ${delErr.message}`);
    failures += 1;
  } else {
    console.log(`✓ ${c.label} — cleaned up`);
  }

  // Confirm the public.users row is gone too.
  const { data: afterDelete } = await supabase
    .from("users")
    .select("id")
    .eq("id", authUserId)
    .maybeSingle();
  if (afterDelete) {
    console.error(
      `✗ ${c.label}: public.users row ${authUserId} still exists after cascade delete`,
    );
    failures += 1;
  } else {
    console.log(`✓ ${c.label} — cascade delete confirmed`);
  }
}

(async () => {
  for (const c of cases) {
    await runCase(c);
  }
  console.log("");
  if (failures > 0) {
    console.error(`FAIL — ${failures} assertion(s) failed`);
    process.exit(1);
  }
  console.log(
    "PASS — phone-only invite path works end-to-end (create + read + cleanup)",
  );
})();
