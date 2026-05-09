import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookOpen, CalendarClock, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function TeacherHomePage() {
  const user = await requireRole("teacher");
  const supabase = createClient();
  const t = await getTranslations("teacher.home");

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, schedule_text")
    .eq("teacher_id", user.id)
    .order("name", { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </div>

      {classes && classes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {classes.map((c) => (
            <Link key={c.id} href={`/teacher/classes/${c.id}`}>
              <Card className="group h-full transition hover:bg-muted/40 hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="text-violet-600 size-5" />
                    {c.name}
                  </CardTitle>
                  <ChevronRight className="text-muted-foreground group-hover:text-foreground size-4 transition" />
                </CardHeader>
                <CardContent className="text-muted-foreground flex items-center gap-2 text-sm">
                  <CalendarClock className="size-3.5" />
                  {c.schedule_text ?? t("noSchedule")}
                </CardContent>
              </Card>
            </Link>
          ))}
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
