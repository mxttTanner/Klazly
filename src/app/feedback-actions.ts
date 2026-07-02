"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdminEmail } from "@/lib/super-admin";

const schema = z.object({
  rating: z.enum(["sad", "meh", "happy"]),
  comment: z.string().trim().max(2000).optional().nullable(),
  page: z.string().trim().max(500).optional().nullable(),
});

/**
 * Submit feedback from the floating widget. Open to any authenticated
 * user (admin / teacher / parent / super-admin). Anonymous submission
 * isn't allowed yet — the widget only renders inside the authed shell.
 *
 * Best-effort: a failure here shouldn't break the page the user is on,
 * so we return { error } and let the widget surface a soft message.
 */
export async function submitFeedback(formData: FormData) {
  const user = await getCurrentUser();
  // The widget only renders inside the authed shell, so a null user here
  // means an unauthenticated caller hitting the action directly. Reject it
  // rather than let it write to the super-admin inbox via the service role.
  if (!user) return { error: "unauthorized" };

  const parsed = schema.safeParse({
    rating: formData.get("rating"),
    comment: formData.get("comment") || null,
    page: formData.get("page") || null,
  });
  if (!parsed.success) return { error: "invalid" };

  const headerList = headers();
  const userAgent = headerList.get("user-agent") ?? null;

  const supabase = createAdminClient();
  const isSuper = user ? isSuperAdminEmail(user.email) : false;
  // Super-admins don't have a public.users row, so user_id stays null
  // for them. Real users have both a center_id and user_id.
  const { error } = await supabase.from("feedback").insert({
    center_id: user?.center_id ?? null,
    user_id: isSuper ? null : (user?.id ?? null),
    role: isSuper ? "super_admin" : (user?.role ?? null),
    rating: parsed.data.rating,
    comment: parsed.data.comment,
    page: parsed.data.page,
    user_agent: userAgent,
  });
  if (error) {
    Sentry.captureMessage(`feedback insert failed: ${error.message}`, {
      level: "warning",
    });
    return { error: "generic" };
  }

  revalidatePath("/super-admin/feedback");
  return { ok: true };
}
