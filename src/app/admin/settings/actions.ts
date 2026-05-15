"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoUser } from "@/lib/demo-guard";

// SVG intentionally excluded: SVG files can carry <script> tags and execute
// as XSS when rendered via <img>+blob or fetched directly. Raster only.
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function uploadCenterLogo(_prev: unknown, formData: FormData) {
  const admin = await requireRole("admin");
  const t = await getTranslations("settings");
  const tc = await getTranslations("common");
  if (isDemoUser(admin)) return { error: tc("demoReadOnly") };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: t("noFile") };
  }
  if (file.size > MAX_BYTES) {
    return { error: t("tooLarge") };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: t("badType") };
  }

  const supabase = createAdminClient();
  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${admin.center_id}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("logos")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "60",
    });
  if (uploadErr) {
    return { error: t("uploadError", { message: uploadErr.message }) };
  }

  const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
  // Cache-bust so the new logo shows immediately after a re-upload.
  const bustedUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  const { error: updateErr } = await supabase
    .from("centers")
    .update({ logo_url: bustedUrl })
    .eq("id", admin.center_id);
  if (updateErr) {
    return { error: t("uploadError", { message: updateErr.message }) };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/parent", "layout");
  // Logo also renders on the teacher topbar + parent printable report.
  revalidatePath("/teacher", "layout");
  revalidatePath("/admin", "layout");
  return { success: t("uploadSuccess") };
}

const reportSettingsSchema = z.object({
  intro: z.string().max(800).optional().nullable(),
  footer: z.string().max(400).optional().nullable(),
  show_summary: z.boolean(),
  show_signatures: z.boolean(),
  sig_left: z.string().max(60).optional().nullable(),
  sig_right: z.string().max(60).optional().nullable(),
  // Branding additions (see db/center-branding.sql). brand_color
  // accepts an empty string (= reset to default) or a strict
  // #RRGGBB hex. Anything else is rejected with the i18n'd error.
  brand_color: z
    .string()
    .regex(/^(#[0-9A-Fa-f]{6})?$/)
    .optional()
    .nullable(),
  show_pdf_credit: z.boolean(),
});

function nullableTrim(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

export async function updateReportSettings(
  _prev: unknown,
  formData: FormData,
) {
  // Admin-only: this writes to center-wide report_* columns which affect
  // every parent's printed PDF in the center. Teachers can preview the
  // current settings on /teacher/report-settings but can't edit them.
  const user = await requireRole("admin");
  const t = await getTranslations("settings");
  const tc = await getTranslations("common");
  if (isDemoUser(user)) return { error: tc("demoReadOnly") };

  const parsed = reportSettingsSchema.safeParse({
    intro: nullableTrim(formData.get("intro")),
    footer: nullableTrim(formData.get("footer")),
    show_summary: formData.get("show_summary") === "on",
    show_signatures: formData.get("show_signatures") === "on",
    sig_left: nullableTrim(formData.get("sig_left")),
    sig_right: nullableTrim(formData.get("sig_right")),
    brand_color: nullableTrim(formData.get("brand_color")),
    show_pdf_credit: formData.get("show_pdf_credit") === "on",
  });
  if (!parsed.success) return { error: t("reportValidation") };

  const supabase = createAdminClient();
  // Build the patch in two passes so an unmigrated DB (no
  // brand_color / show_pdf_credit columns yet) still saves the
  // legacy fields successfully. We attempt the full patch first,
  // and on a recognisable column-missing error, retry without the
  // branding-only columns.
  const fullPatch = {
    report_intro_text: parsed.data.intro,
    report_footer_text: parsed.data.footer,
    report_show_summary: parsed.data.show_summary,
    report_show_signatures: parsed.data.show_signatures,
    report_signature_label_left: parsed.data.sig_left,
    report_signature_label_right: parsed.data.sig_right,
    brand_color: parsed.data.brand_color || null,
    show_pdf_credit: parsed.data.show_pdf_credit,
  };
  let { error } = await supabase
    .from("centers")
    .update(fullPatch)
    .eq("id", user.center_id);
  if (error && /brand_color|show_pdf_credit/i.test(error.message)) {
    const legacy = await supabase
      .from("centers")
      .update({
        report_intro_text: parsed.data.intro,
        report_footer_text: parsed.data.footer,
        report_show_summary: parsed.data.show_summary,
        report_show_signatures: parsed.data.show_signatures,
        report_signature_label_left: parsed.data.sig_left,
        report_signature_label_right: parsed.data.sig_right,
      })
      .eq("id", user.center_id);
    error = legacy.error;
  }
  if (error) return { error: t("reportSaveError", { message: error.message }) };

  revalidatePath("/admin/settings");
  revalidatePath("/teacher/report-settings");
  revalidatePath("/parent", "layout");
  return { success: t("reportSaveSuccess") };
}

export async function removeCenterLogo() {
  const admin = await requireRole("admin");
  if (isDemoUser(admin)) return;
  const supabase = createAdminClient();

  // Best-effort delete every plausible extension; we don't know what was uploaded.
  for (const ext of ["png", "jpeg", "jpg", "webp", "svg"]) {
    await supabase.storage.from("logos").remove([`${admin.center_id}.${ext}`]);
  }

  const { error } = await supabase
    .from("centers")
    .update({ logo_url: null })
    .eq("id", admin.center_id);
  if (error) throw new Error(`removeCenterLogo failed: ${error.message}`);

  revalidatePath("/admin/settings");
  revalidatePath("/parent", "layout");
  revalidatePath("/teacher", "layout");
  revalidatePath("/admin", "layout");
}
