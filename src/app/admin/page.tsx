import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  AlertTriangle,
  BookOpen,
  Check,
  GraduationCap,
  Rocket,
  User,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** "6 days ago" in local time as YYYY-MM-DD (the week window). */
function weekAgoIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Initial = first letter of the last word (the given name in VN order). */
function initialOf(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return (parts[parts.length - 1]?.[0] ?? "?").toUpperCase();
}

const AVATAR_GRADIENTS = [
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-indigo-600",
  "from-orange-400 to-rose-500",
  "from-violet-500 to-fuchsia-600",
  "from-amber-400 to-orange-600",
];
function gradientFor(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

type TeacherRow = { id: string; full_name: string };
type LessonLite = { teacher_id: string | null; lesson_date: string };
type RecentLesson = {
  id: string;
  created_at: string | null;
  unit: string | null;
  lesson_number: string | null;
  topic: string | null;
  class: { name: string } | { name: string }[] | null;
  teacher: { full_name: string } | { full_name: string }[] | null;
};

export default async function AdminHomePage() {
  const supabase = createClient();
  const t = await getTranslations("admin.dashboard");
  const weekStart = weekAgoIsoDate();

  const [
    { count: teacherCount },
    { count: parentCount },
    { count: classCount },
    { count: studentCount },
    { data: teachers },
    { data: lessons },
    { data: recentLessons },
  ] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "teacher"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "parent"),
    supabase.from("classes").select("id", { count: "exact", head: true }),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase
      .from("users")
      .select("id, full_name")
      .eq("role", "teacher")
      .order("full_name", { ascending: true }),
    supabase.from("lessons").select("teacher_id, lesson_date"),
    supabase
      .from("lessons")
      .select(
        "id, created_at, unit, lesson_number, topic, class:classes(name), teacher:users!lessons_teacher_id_fkey(full_name)",
      )
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const allLessons = (lessons ?? []) as LessonLite[];
  const teacherList = (teachers ?? []) as TeacherRow[];

  // Per-teacher week / total lesson counts.
  const weekByTeacher = new Map<string, number>();
  const totalByTeacher = new Map<string, number>();
  for (const l of allLessons) {
    if (!l.teacher_id) continue;
    totalByTeacher.set(l.teacher_id, (totalByTeacher.get(l.teacher_id) ?? 0) + 1);
    if (l.lesson_date >= weekStart) {
      weekByTeacher.set(l.teacher_id, (weekByTeacher.get(l.teacher_id) ?? 0) + 1);
    }
  }
  const maxWeek = Math.max(1, ...teacherList.map((tr) => weekByTeacher.get(tr.id) ?? 0));
  const analytics = teacherList
    .map((tr) => {
      const week = weekByTeacher.get(tr.id) ?? 0;
      const total = totalByTeacher.get(tr.id) ?? 0;
      const pct = Math.round((week / maxWeek) * 100);
      return { id: tr.id, name: tr.full_name, week, total, pct };
    })
    .sort((a, b) => b.week - a.week || b.total - a.total || a.name.localeCompare(b.name));
  const loggedThisWeek = analytics.filter((a) => a.week > 0).length;
  const nonLoggingCount = teacherList.length - loggedThisWeek;

  const cards = [
    { label: t("teachers"), href: "/admin/teachers", count: teacherCount ?? 0, Icon: User },
    { label: t("parents"), href: "/admin/parents", count: parentCount ?? 0, Icon: Users },
    { label: t("classes"), href: "/admin/classes", count: classCount ?? 0, Icon: BookOpen },
    { label: t("students"), href: "/admin/students", count: studentCount ?? 0, Icon: GraduationCap },
  ];

  const onboarding = [
    { done: (teacherCount ?? 0) > 0, label: t("onboardingStep1"), href: "/admin/teachers" },
    { done: (classCount ?? 0) > 0, label: t("onboardingStep2"), href: "/admin/classes" },
    { done: (parentCount ?? 0) > 0, label: t("onboardingStep3"), href: "/admin/parents" },
    { done: (studentCount ?? 0) > 0, label: t("onboardingStep4"), href: "/admin/students" },
  ];
  const showOnboarding = onboarding.some((s) => !s.done);

  function relTime(iso: string | null): string {
    if (!iso) return "";
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return t("relNow");
    if (min < 60) return t("relMin", { n: min });
    const hr = Math.floor(min / 60);
    if (hr < 24) return t("relHour", { n: hr });
    return t("relDay", { n: Math.floor(hr / 24) });
  }

  const recent = (recentLessons ?? []) as RecentLesson[];

  return (
    // Full-bleed dark canvas: negative margins cancel the light main
    // padding so the dashboard reads as one navy surface under the
    // sub-nav, matching admin.png.
    <div className="-mx-4 -my-8 min-h-[calc(100dvh-9rem)] bg-navy px-4 py-8 text-white sm:-mx-6 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map(({ label, href, count, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-brand-line-dark bg-gradient-to-br from-navy-2 to-navy p-5 transition hover:border-emerald/40"
            >
              <div className="flex items-start justify-between">
                <span className="text-[34px] font-black leading-none tabular-nums text-emerald-light sm:text-[40px]">
                  {count}
                </span>
                <Icon className="size-5 text-brand-mut transition group-hover:text-emerald-light" />
              </div>
              <p className="mt-3 text-sm text-brand-mut-2">{label}</p>
            </Link>
          ))}
        </div>

        {/* New-center onboarding (sparse-data state) */}
        {showOnboarding ? (
          <section className="rounded-2xl border border-brand-line-dark bg-navy-2 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald/15 text-emerald-light">
                <Rocket className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-white">{t("onboardingTitle")}</h2>
                <p className="text-sm text-brand-mut">
                  {t("onboardingSubtitle", {
                    done: onboarding.filter((s) => s.done).length,
                    total: onboarding.length,
                  })}
                </p>
              </div>
            </div>
            <ol className="mt-4 grid gap-2 sm:grid-cols-2">
              {onboarding.map((step, i) => (
                <li key={step.href}>
                  <Link
                    href={step.href}
                    className={`flex min-h-12 items-center gap-3 rounded-xl border border-brand-line-dark p-3 transition hover:border-emerald/40 ${
                      step.done ? "opacity-50" : "bg-white/[0.03]"
                    }`}
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        step.done
                          ? "bg-emerald/20 text-emerald-light"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      {step.done ? <Check className="size-4" /> : i + 1}
                    </span>
                    <span
                      className={`text-sm ${step.done ? "text-brand-mut line-through" : "text-brand-mut-2"}`}
                    >
                      {step.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Two-panel row */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recent activity */}
          <section className="rounded-2xl border border-brand-line-dark bg-navy-2 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-mut">
                {t("activityHeader")}
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/15 px-2.5 py-1 text-[11px] font-bold text-emerald-light">
                <span className="size-1.5 rounded-full bg-emerald-light" />
                {t("live")}
              </span>
            </div>
            {recent.length > 0 ? (
              <ul className="mt-4 divide-y divide-brand-line-dark/60">
                {recent.map((l) => {
                  const cls = Array.isArray(l.class) ? l.class[0] : l.class;
                  const tr = Array.isArray(l.teacher) ? l.teacher[0] : l.teacher;
                  const title =
                    [l.unit, l.lesson_number, l.topic].filter(Boolean).join(" — ") || "—";
                  const who = tr?.full_name ?? "—";
                  return (
                    <li key={l.id} className="flex items-center gap-3 py-3">
                      <span
                        className={`flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradientFor(
                          who,
                        )} text-base font-bold text-white`}
                      >
                        {initialOf(who)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">
                          {who}
                          {cls?.name ? <span className="text-brand-mut"> · {cls.name}</span> : null}
                        </p>
                        <p className="truncate text-sm text-brand-mut">{title}</p>
                      </div>
                      <span className="shrink-0 text-sm text-brand-mut">{relTime(l.created_at)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-6 text-sm text-brand-mut">{t("activityEmpty")}</p>
            )}
          </section>

          {/* Teacher logging analytics */}
          <section className="rounded-2xl border border-brand-line-dark bg-navy-2 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-mut">
                {t("teacherActivityHeader")}
              </h2>
              <span className="rounded-full bg-emerald/15 px-2.5 py-1 text-[11px] font-bold text-emerald-light">
                {t("weekPill", { logged: loggedThisWeek, total: teacherList.length })}
              </span>
            </div>
            {analytics.length > 0 ? (
              <ul className="mt-4 space-y-3.5">
                {analytics.slice(0, 6).map((a) => {
                  const barColor =
                    a.week === 0 ? "bg-white/15" : a.pct < 50 ? "bg-amber" : "bg-emerald";
                  return (
                    <li key={a.id} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 truncate text-sm text-brand-mut-2">
                        {a.name}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${a.pct}%` }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-sm tabular-nums text-brand-mut">
                        {a.week}/{a.total}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-6 text-sm text-brand-mut">{t("activityEmpty")}</p>
            )}

            {nonLoggingCount > 0 ? (
              <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3">
                <AlertTriangle className="size-4 shrink-0 text-amber-light" />
                <p className="text-sm text-amber-light">
                  {t("notLoggedAlert", { n: nonLoggingCount })} — {t("remindZalo")}
                </p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
