import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookOpen, CalendarClock, ChevronRight, GraduationCap, UserCircle2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ParentHomePage() {
  const user = await requireRole("parent");
  const supabase = createClient();
  const t = await getTranslations("parent.home");

  const { data: students } = await supabase
    .from("students")
    .select(
      "id, full_name, age, class_id, class:classes(name, schedule_text, teacher:users!classes_teacher_id_fkey(full_name))",
    )
    .eq("parent_user_id", user.id)
    .order("full_name", { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </div>

      {students && students.length > 0 ? (
        <div className="space-y-3">
          {students.map((s) => {
            const cls = Array.isArray(s.class) ? s.class[0] : s.class;
            const teacher = cls
              ? Array.isArray(cls.teacher)
                ? cls.teacher[0]
                : cls.teacher
              : null;
            return (
              <Link key={s.id} href={`/parent/students/${s.id}`}>
                <Card className="group transition hover:bg-muted/40 hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <GraduationCap className="text-amber-600 size-5" />
                      {s.full_name}
                    </CardTitle>
                    <ChevronRight className="text-muted-foreground group-hover:text-foreground size-4 transition" />
                  </CardHeader>
                  <CardContent className="text-muted-foreground space-y-1.5 text-sm">
                    {cls ? (
                      <>
                        <p className="inline-flex items-center gap-2">
                          <BookOpen className="size-3.5" />
                          <span className="text-foreground font-medium">
                            {cls.name}
                          </span>
                        </p>
                        {teacher ? (
                          <p className="inline-flex items-center gap-2">
                            <UserCircle2 className="size-3.5" />
                            {teacher.full_name}
                          </p>
                        ) : null}
                        {cls.schedule_text ? (
                          <p className="inline-flex items-center gap-2">
                            <CalendarClock className="size-3.5" />
                            {cls.schedule_text}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p>{t("noClass")}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-12 text-center text-sm">
          <GraduationCap className="size-8 opacity-50" />
          <p>{t("empty")}</p>
        </div>
      )}
    </div>
  );
}
