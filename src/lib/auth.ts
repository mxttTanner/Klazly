import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AppUser = {
  id: string;
  // email is nullable now that phone-only accounts exist (see
  // db/users-phone.sql). When null, the user signs in by phone — the
  // synthetic Supabase Auth email is hidden from the app.
  email: string | null;
  phone: string | null;
  full_name: string;
  role: "admin" | "teacher" | "parent";
  center_id: string;
};

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Try the full select with phone; fall back without phone if the
  // db/users-phone.sql migration hasn't been applied yet so the rest
  // of the app keeps rendering on an older DB.
  const withPhone = await supabase
    .from("users")
    .select("id, email, phone, full_name, role, center_id")
    .eq("id", user.id)
    .single();
  if (!withPhone.error) {
    return (withPhone.data as AppUser) ?? null;
  }
  const fallback = await supabase
    .from("users")
    .select("id, email, full_name, role, center_id")
    .eq("id", user.id)
    .single();
  if (fallback.error || !fallback.data) return null;
  return { ...(fallback.data as Omit<AppUser, "phone">), phone: null };
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Center lock-out: bounce expired / past-grace-period centers to
  // /locked before any authed page renders. Data is preserved; the
  // lock just prevents access until the center pays. Uses the admin
  // client so we can read centers regardless of the user's RLS
  // context.
  //
  // Lock rules:
  //   expired                         → always locked
  //   paused                          → always locked (operator suspended
  //                                     access; the whole point of pausing)
  //   canceled + ends_at <= now       → locked (grace expired)
  //   canceled + ends_at > now / null → still allowed (within grace)
  //   trial  + trial_ends_at <= now   → locked IF standard tier. Founding
  //                                     trials auto-convert to 'active' (see
  //                                     expireOverdueTrials), so we never
  //                                     lock them here even before the lazy
  //                                     converter has flipped the row.
  //   past_due / pending_renewal      → still allowed. These are the
  //                                     "collect payment out of band" grace
  //                                     states; Klazly bills by bank transfer,
  //                                     so cutting a paying center mid-renewal
  //                                     would be wrong. The operator sees the
  //                                     amber nudge and renews manually.
  //   anything else                   → allowed
  //
  // Enforcing trial expiry here (not only on the super-admin dashboard's
  // lazy pass) closes the gap where a center kept full access for days
  // until the operator happened to open /super-admin.
  //
  // We swallow errors quietly — better to let a transient DB blip pass
  // through and render the dashboard than block legitimate users on
  // every request. next/navigation's redirect() throws a special
  // signal internally, so we only catch real Errors and let redirect
  // propagate.
  let shouldRedirect = false;
  try {
    const supabase = createAdminClient();
    // Try the full select first; fall back if the lifecycle columns
    // haven't been migrated yet so older DBs still load.
    const full = await supabase
      .from("centers")
      .select(
        "subscription_status, subscription_ends_at, trial_ends_at, plan_tier",
      )
      .eq("id", user.center_id)
      .single();
    let status: string | null = null;
    let endsAt: string | null = null;
    let trialEndsAt: string | null = null;
    let planTier: string | null = null;
    if (!full.error && full.data) {
      const d = full.data as {
        subscription_status: string;
        subscription_ends_at: string | null;
        trial_ends_at: string | null;
        plan_tier: string | null;
      };
      status = d.subscription_status;
      endsAt = d.subscription_ends_at;
      trialEndsAt = d.trial_ends_at;
      planTier = d.plan_tier;
    } else {
      const fb = await supabase
        .from("centers")
        .select("subscription_status")
        .eq("id", user.center_id)
        .single();
      if (!fb.error && fb.data) {
        status = (fb.data as { subscription_status: string }).subscription_status;
      }
    }
    if (status === "expired" || status === "paused") {
      shouldRedirect = true;
    } else if (status === "canceled") {
      // Past grace if no end date set, or end date already passed.
      if (!endsAt || new Date(endsAt).getTime() <= Date.now()) {
        shouldRedirect = true;
      }
    } else if (status === "trial") {
      // Standard trial that has run past its end date but hasn't been
      // flipped to 'expired' yet. Founding trials are excluded — they
      // convert to a paid 'active' state instead of expiring.
      if (
        trialEndsAt &&
        new Date(trialEndsAt).getTime() <= Date.now() &&
        planTier !== "founding"
      ) {
        shouldRedirect = true;
      }
    }
  } catch {
    // proceed — transient DB blip shouldn't lock anyone out
  }
  if (shouldRedirect) redirect("/locked");

  return user;
}

export async function requireRole(
  role: AppUser["role"] | AppUser["role"][],
): Promise<AppUser> {
  const user = await requireUser();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.role)) redirect(dashboardPathFor(user.role));
  return user;
}

export function dashboardPathFor(role: AppUser["role"]): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "teacher":
      return "/teacher";
    case "parent":
      return "/parent";
  }
}
