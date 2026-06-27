import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  BookOpen,
  CalendarClock,
  ChevronRight,
  FileText,
  GraduationCap,
  MessageSquareText,
} from "lucide-react";
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

  // Unread message counts per class (so each card can show a badge). One
  // hop: find all students in these classes, then count their unread msgs.
  const classIds = (classes ?? []).map((c) => c.id);
  const unreadByClass = new Map<string, number>();
  if (classIds.length > 0) {
    const { data: classStudents } = await supabase
      .from("students")
      .select("id, class_id")
      .in("class_id", classIds);
    type CS = { id: string; class_id: string };
    const sIds = ((classStudents ?? []) as CS[]).map((s) => s.id);
    const studentToClass = new Map(
      ((classStudents ?? []) as CS[]).map((s) => [s.id, s.class_id]),
    );
    if (sIds.length > 0) {
      const unreadRes = await supabase
        .from("parent_teacher_messages")
        .select("student_id")
        .in("student_id", sIds)
        .neq("sender_user_id", user.id)
        .is("read_at", null);
      if (!unreadRes.error && unreadRes.data) {
        for (const row of unreadRes.data as Array<{ student_id: string }>) {
          const cid = studentToClass.get(row.student_id);
          if (!cid) continue;
          unreadByClass.set(cid, (unreadByClass.get(cid) ?? 0) + 1);
        }
      }
    }
  }

  const classCount = classes?.length ?? 0;
  const totalUnread = Array.from(unreadByClass.values()).reduce(
    (sum, n) => sum + n,
    0,
  );
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";
  const firstInitial = (user.full_name?.trim()?.split(/\s+/).slice(-1)[0]?.charAt(0) ?? "T").toUpperCase();

  return (
    <div className="space-y-8">
      {/* Greeting card — large name headline + date + class count
          summary on the left; a quiet initials avatar on the right. */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm sm:p-8 lg:p-10">
        <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <p className="text-primary inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
              <GraduationCap className="size-3.5" />
              {t("title")}
            </p>
            <h1 className="text-balance text-xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              {user.full_name ?? t("title")}
            </h1>
            <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs sm:text-sm">
              <CalendarClock className="size-3.5 shrink-0" />
              <span className="truncate">
                {new Date().toLocaleDateString(dateLocale, {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </p>
            <p className="text-foreground text-sm">
              {classCount === 0
                ? t("subtitle")
                : totalUnread > 0
                  ? t("subtitleWithUnread", { n: classCount, unread: totalUnread })
                  : t("subtitleWithCount", { n: classCount })}
            </p>
            <div className="pt-2">
              <Link
                href="/teacher/report-settings"
                className={`${buttonVariants({ variant: "outline", size: "sm" })} inline-flex items-center gap-1.5`}
              >
                <FileText className="size-4" />
                {tSettings("reportSection")}
              </Link>
            </div>
          </div>
          {/* Initials avatar — quiet single-accent tile. Reads as a
              personal greeting. Hidden on mobile where the name +
              classes already carry the page. */}
          <div className="hidden items-center gap-3 sm:flex">
            <div className="bg-primary text-primary-foreground flex size-24 items-center justify-center rounded-3xl text-4xl font-bold shadow-sm">
              {firstInitial}
            </div>
          </div>
        </div>
      </div>

      {classes && classes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {classes.map((c, i) => {
            const teacherName = Array.isArray(c.teacher)
              ? c.teacher[0]?.full_name
              : (c.teacher as { full_name: string } | null)?.full_name;
            const unread = unreadByClass.get(c.id) ?? 0;
            return (
              <Link
                key={c.id}
                href={`/teacher/classes/${c.id}`}
                style={{ animationDelay: `${i * 80}ms` }}
                className="group motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:fill-mode-backwards"
              >
                <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                      <BookOpen className="text-primary size-5" />
                      {c.name}
                      {unread > 0 ? (
                        <span className="bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold">
                          <MessageSquareText className="size-3" />
                          {unread}
                        </span>
                      ) : null}
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
        <div className="bg-muted/30 flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-12 text-center">
          <div className="bg-background flex size-14 items-center justify-center rounded-full border">
            <BookOpen className="text-muted-foreground size-6" />
          </div>
          <p className="text-muted-foreground max-w-sm text-sm">{t("empty")}</p>
        </div>
      )}
    </div>
  );
}
