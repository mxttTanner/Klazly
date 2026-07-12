import Link from "next/link";
import { ArrowLeft, UserCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser, dashboardPathFor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSyntheticEmail } from "@/lib/phone";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

/**
 * Shared "My profile" page — same route works for admin, teacher, and
 * parent. Users can update their own email + phone; password reset
 * still flows through /forgot-password.
 *
 * The "back" link routes them home to their own dashboard since the
 * profile page is reached from the topbar avatar, not from a specific
 * sub-section.
 */
export default async function ProfilePage() {
  const user = await requireUser();
  const tp = await getTranslations("profile");
  const tco = await getTranslations("contact");

  // Email changes go through the confirmation-link flow (see actions.ts):
  // the auth email switches only after the user clicks the link, at which
  // point public.users.email is stale until this sync runs. Best-effort —
  // a failure just means it heals on the next visit.
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const authEmail = authUser?.email?.toLowerCase() ?? null;
  if (
    authEmail &&
    !isSyntheticEmail(authEmail) &&
    authEmail !== (user.email ?? "").toLowerCase()
  ) {
    const admin = createAdminClient();
    const { error: syncErr } = await admin
      .from("users")
      .update({ email: authEmail })
      .eq("id", user.id);
    if (!syncErr) user.email = authEmail;
  }

  // The user may have a synthetic auth email (phone-only account). The
  // public.users.email column is null in that case — show empty in the
  // form so they can add a real email, not the synthetic one.
  const visibleEmail = isSyntheticEmail(user.email) ? null : user.email;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <Link
        href={dashboardPathFor(user.role)}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-3.5" />
        {tp("back")}
      </Link>

      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-full">
          <UserCircle className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {tp("title")}
          </h1>
          <p className="text-muted-foreground text-sm">{user.full_name}</p>
        </div>
      </div>

      <ProfileForm defaults={{ email: visibleEmail, phone: user.phone }} />

      {/* Phone-only accounts can't currently self-reset their password.
          Surface this so they know to add an email if they want that
          ability. When SMS OTP ships, drop this note. */}
      {!visibleEmail && user.phone ? (
        <div className="bg-warning/10 text-foreground rounded-lg border border-warning/30 p-3 text-sm">
          {tco("phoneOnlyResetNote")}
        </div>
      ) : null}
    </div>
  );
}
