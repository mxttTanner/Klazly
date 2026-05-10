import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookOpen, CalendarClock, ChevronRight, FileText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function TeacherHomePage() {
  const user = await requireRole(["teacher", "admin"]);
  const supabase = createClient();
  const t = await getTranslations("teacher.home");

  // Teachers see only their own classes; admins see every class in the center
  // so they can fill in for absent teachers.
  let query = supabase
    .from("classes")
    .select("id, name, schedule_text, teacher:users!classes_teacher_id_fkey(full_name)")
    .order("name", { ascending: true });
  if (user.role === "teacher") {
    query = query.eq("teacher_id", user.id);
  } else {
    query = query.eq("center_id", user.center_id);
  }
  const { data: classes } = await query;

  const tSettings = await getTranslations("settings");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
        </div>
        <Link
          href="/teacher/report-settings"
          className={`${buttonVariants({ variant: "outline", size: "sm" })} inline-flex items-center gap-1.5`}
        >
          <FileText className="size-4" />
          {tSettings("reportSection")}
        </Link>
      </div>

      {classes && classes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {classes.map((c) => {
            const teacherName = Array.isArray(c.teacher)
              ? c.teacher[0]?.full_name
              : (c.teacher as { full_name: string } | null)?.full_name;
            return (
              <Link key={c.id} href={`/teacher/classes/${c.id}`}>
                <Card className="group h-full transition hover:bg-muted/40 hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BookOpen className="text-violet-600 size-5" />
                      {c.name}
                    </CardTitle>
                    <ChevronRight className="text-muted-foreground group-hover:text-foreground size-4 transition" />
                  </CardHeader>
                  <CardContent className="text-muted-foreground space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="size-3.5" />
                      {c.schedule_text ?? t("noSchedule")}
                    </div>
                    {user.role === "admin" && teacherName ? (
                      <p className="text-xs">{t("taughtBy", { name: teacherName })}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-12 text-center text-sm">
          <BookOpen className="size-8 opacity-50" />
          <p>{t("empty")}</p>
        </div>
      )}
    </div>
  );
}
