import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LessonForm } from "./lesson-form";

export const dynamic = "force-dynamic";

export type Template = {
  id: string;
  name: string;
  vocabulary: string | null;
  grammar_point: string | null;
  speaking_activity: string | null;
  homework: string | null;
  general_note: string | null;
};

export default async function NewLessonPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { template?: string };
}) {
  const user = await requireRole("teacher");
  const supabase = createClient();
  const t = await getTranslations("teacher.lessonForm");

  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, teacher_id")
    .eq("id", params.id)
    .single();
  if (!cls || cls.teacher_id !== user.id) notFound();

  const [{ data: students }, { data: templates }, { data: worksheets }] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, full_name")
        .eq("class_id", cls.id)
        .order("full_name", { ascending: true }),
      supabase
        .from("lesson_templates")
        .select(
          "id, name, vocabulary, grammar_point, speaking_activity, homework, general_note",
        )
        .order("name", { ascending: true }),
      supabase
        .from("worksheets")
        .select("id, name, file_type")
        .order("created_at", { ascending: false }),
    ]);

  const allTemplates = (templates ?? []) as Template[];
  const worksheetOptions = (worksheets ?? []) as Array<{
    id: string;
    name: string;
    file_type: string;
  }>;
  const selectedTemplate =
    searchParams.template
      ? allTemplates.find((tpl) => tpl.id === searchParams.template) ?? null
      : null;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const defaultDate = `${yyyy}-${mm}-${dd}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("summary", {
            className: cls.name,
            count: students?.length ?? 0,
          })}
        </p>
      </div>

      {students && students.length > 0 ? (
        <LessonForm
          classId={cls.id}
          className={cls.name}
          students={students}
          defaultDate={defaultDate}
          templates={allTemplates}
          selectedTemplate={selectedTemplate}
          worksheets={worksheetOptions}
        />
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {t("noStudents")}
        </p>
      )}
    </div>
  );
}
