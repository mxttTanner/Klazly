"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoUser } from "@/lib/demo-guard";
import {
  isSyntheticEmail,
  normalizeVnPhone,
  syntheticEmailForPhone,
} from "@/lib/phone";

const profileSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
});

/**
 * Update the current user's own contact methods (email and/or phone).
 * Rules:
 *   - At least one of email/phone must remain set after the update.
 *   - Phone is normalized to canonical +84… form.
 *   - Per-center uniqueness is checked the same way as create flows.
 *   - If the user's Supabase Auth email is currently a synthetic
 *     phone-only email and they're adding a real email, we update the
 *     auth email so future password resets land in their inbox.
 *   - If the user is removing their email entirely (leaving phone-only),
 *     we swap the auth email back to the synthetic form derived from
 *     their phone so the auth account stays addressable.
 */
export async function updateMyProfile(_prev: unknown, formData: FormData) {
  const user = await requireUser();
  const tco = await getTranslations("contact");
  const tp = await getTranslations("profile");
  const tc = await getTranslations("common");
  if (isDemoUser(user)) return { error: tc("demoReadOnly") };

  const parsed = profileSchema.safeParse({
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { error: tp("validation") };

  const rawEmail = (parsed.data.email ?? "").trim().toLowerCase();
  const rawPhone = (parsed.data.phone ?? "").trim();

  if (!rawEmail && !rawPhone) return { error: tco("required") };

  let nextEmail: string | null = null;
  if (rawEmail) {
    if (!z.string().email().safeParse(rawEmail).success) {
      return { error: tco("invalidEmail") };
    }
    nextEmail = rawEmail;
  }

  let nextPhone: string | null = null;
  if (rawPhone) {
    nextPhone = normalizeVnPhone(rawPhone);
    if (!nextPhone) return { error: tco("invalidPhone") };
  }

  const supabase = createAdminClient();

  // Uniqueness pre-checks scoped to this user's center, ignoring the
  // current user's own row so they can re-save without "already in use".
  if (nextEmail && nextEmail !== user.email) {
    const dup = await supabase
      .from("users")
      .select("id")
      .eq("center_id", user.center_id)
      .ilike("email", nextEmail)
      .neq("id", user.id)
      .maybeSingle();
    if (dup.data) return { error: tco("emailAlreadyUsed") };
  }
  if (nextPhone && nextPhone !== user.phone) {
    const dup = await supabase
      .from("users")
      .select("id")
      .eq("center_id", user.center_id)
      .eq("phone", nextPhone)
      .neq("id", user.id)
      .maybeSingle();
    if (dup.data) return { error: tco("phoneAlreadyUsed") };
  }

  // Determine the auth email this update should land on:
  //   - Real email provided → use real email (move auth off synthetic
  //     if applicable).
  //   - No real email, phone present → synthetic email for the new phone.
  // Then patch auth.users.email if it changed.
  const targetAuthEmail = nextEmail ?? syntheticEmailForPhone(nextPhone!);
  const currentAuthIsSynthetic = isSyntheticEmail(user.email);
  const currentAuthEmail =
    user.email ?? (user.phone ? syntheticEmailForPhone(user.phone) : null);

  if (targetAuthEmail !== currentAuthEmail) {
    const { error: authErr } = await supabase.auth.admin.updateUserById(
      user.id,
      { email: targetAuthEmail, email_confirm: true },
    );
    if (authErr) {
      return { error: tp("authUpdateError", { message: authErr.message }) };
    }
  }

  // Update the public.users row. Note: when the user is moving from a
  // synthetic email to a real one (or vice-versa), we always store the
  // real email or null — never the synthetic — so the rest of the app
  // never has to know about the synthetic-email workaround.
  const { error: profileErr } = await supabase
    .from("users")
    .update({ email: nextEmail, phone: nextPhone })
    .eq("id", user.id);
  if (profileErr) {
    return { error: tp("saveError", { message: profileErr.message }) };
  }

  // Mark unused.
  void currentAuthIsSynthetic;

  revalidatePath("/profile");
  return { success: tp("saved") };
}
