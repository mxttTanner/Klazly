/**
 * Cross-center isolation (multi-tenancy) integration test.
 *
 * This is the single most important safety net for the product: it proves
 * one center's admin cannot read another center's centers / classes / students
 * through the RLS-enforced anon API. It creates two throwaway centers
 * (prefixed RLS_TEST_), checks isolation in both directions, then cleans up.
 *
 * It talks to a REAL Supabase project, so it self-skips unless all three
 * Supabase env vars are present (e.g. it runs locally with .env.local, or in
 * CI when the secrets are configured, and is skipped otherwise — keeping the
 * default `npm test` green without a database).
 *
 * Run locally:  npm test
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

config({ path: resolve(process.cwd(), ".env.local") });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasEnv = !!(URL && ANON && SERVICE);

const PASSWORD = "rls-test-password-123";
const SUFFIX = "@rls-test.local";

type Tenant = {
  centerId: string;
  adminEmail: string;
  classId: string;
  studentId: string;
};

let admin: SupabaseClient;
const tenants: Record<"A" | "B", Tenant> = {
  A: { centerId: "", adminEmail: "", classId: "", studentId: "" },
  B: { centerId: "", adminEmail: "", classId: "", studentId: "" },
};

async function createTenant(label: "A" | "B"): Promise<Tenant> {
  const adminEmail = `admin-${label.toLowerCase()}${SUFFIX}`;

  const { data: center, error: cErr } = await admin
    .from("centers")
    .insert({
      name: `RLS_TEST_Center_${label}`,
      contact_email: adminEmail,
      subscription_status: "trial",
    })
    .select("id")
    .single();
  if (cErr || !center) throw new Error(`create center ${label}: ${cErr?.message}`);

  const { data: authUser, error: uErr } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: PASSWORD,
    email_confirm: true,
  });
  if (uErr || !authUser.user) throw new Error(`create admin ${label}: ${uErr?.message}`);

  await admin.from("users").insert({
    id: authUser.user.id,
    email: adminEmail,
    full_name: `Admin ${label}`,
    role: "admin",
    center_id: center.id,
  });

  const { data: cls } = await admin
    .from("classes")
    .insert({ center_id: center.id, name: `RLS_TEST_Class_${label}` })
    .select("id")
    .single();

  const { data: student } = await admin
    .from("students")
    .insert({
      center_id: center.id,
      class_id: cls!.id,
      full_name: `RLS_TEST_Student_${label}`,
    })
    .select("id")
    .single();

  return {
    centerId: center.id,
    adminEmail,
    classId: cls!.id,
    studentId: student!.id,
  };
}

async function signInAs(email: string): Promise<SupabaseClient> {
  const client = createClient(URL!, ANON!);
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return client;
}

async function cleanup() {
  if (!admin) return;
  // Delete centers (cascades to classes/students/lessons). Then auth users.
  for (const t of Object.values(tenants)) {
    if (t.centerId) await admin.from("centers").delete().eq("id", t.centerId);
  }
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of list.data.users) {
    if (u.email?.endsWith(SUFFIX)) await admin.auth.admin.deleteUser(u.id, false);
  }
}

describe.skipIf(!hasEnv)("multi-tenant RLS isolation", () => {
  beforeAll(async () => {
    admin = createClient(URL!, SERVICE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await cleanup(); // clear any leftovers from a previous aborted run
    tenants.A = await createTenant("A");
    tenants.B = await createTenant("B");
  }, 60_000);

  afterAll(async () => {
    await cleanup();
  }, 60_000);

  it("admin A cannot see center B's center row", async () => {
    const a = await signInAs(tenants.A.adminEmail);
    const { data } = await a.from("centers").select("id");
    const ids = (data ?? []).map((c) => c.id);
    expect(ids).toContain(tenants.A.centerId);
    expect(ids).not.toContain(tenants.B.centerId);
  });

  it("admin A cannot see center B's classes", async () => {
    const a = await signInAs(tenants.A.adminEmail);
    const { data } = await a.from("classes").select("id, center_id");
    const foreign = (data ?? []).filter((c) => c.center_id === tenants.B.centerId);
    expect(foreign).toHaveLength(0);
  });

  it("admin A cannot see center B's students", async () => {
    const a = await signInAs(tenants.A.adminEmail);
    const { data } = await a.from("students").select("id, center_id");
    const foreign = (data ?? []).filter((s) => s.center_id === tenants.B.centerId);
    expect(foreign).toHaveLength(0);
  });

  it("admin A cannot read center B's student by id (direct .eq probe)", async () => {
    const a = await signInAs(tenants.A.adminEmail);
    const { data } = await a
      .from("students")
      .select("id")
      .eq("id", tenants.B.studentId);
    expect(data ?? []).toHaveLength(0);
  });

  it("admin B is symmetrically isolated from center A", async () => {
    const b = await signInAs(tenants.B.adminEmail);
    const { data: students } = await b.from("students").select("id, center_id");
    expect((students ?? []).every((s) => s.center_id === tenants.B.centerId)).toBe(true);
    const { data: classes } = await b.from("classes").select("id, center_id");
    expect((classes ?? []).every((c) => c.center_id === tenants.B.centerId)).toBe(true);
  });
});
