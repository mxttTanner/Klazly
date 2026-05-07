import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const BEHAVIOR_LABELS: Record<string, { text: string; tone: string }> = {
  great: { text: "Xuất sắc", tone: "bg-emerald-100 text-emerald-800" },
  good: { text: "Tốt", tone: "bg-sky-100 text-sky-800" },
  okay: { text: "Khá", tone: "bg-amber-100 text-amber-800" },
  needs_attention: {
    text: "Cần lưu ý",
    tone: "bg-rose-100 text-rose-800",
  },
};

type LessonRow = {
  id: string;
  lesson_date: string;
  vocabulary: string | null;
  grammar_point: string | null;
  speaking_activity: string | null;
  homework: string | null;
  general_note: string | null;
};

type UpdateRow = {
  lesson_id: string;
  behavior_rating: keyof typeof BEHAVIOR_LABELS | null;
  individual_note: string | null;
  homework_completed: boolean;
};

export default async function StudentProgressPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole("parent");
  const supabase = createClient();

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, full_name, age, parent_user_id, class:classes(id, name, teacher:users!classes_teacher_id_fkey(full_name))",
    )
    .eq("id", params.id)
    .single();

  if (!student || student.parent_user_id !== user.id) notFound();

  const cls = Array.isArray(student.class) ? student.class[0] : student.class;
  const teacher = cls
    ? Array.isArray(cls.teacher)
      ? cls.teacher[0]
      : cls.teacher
    : null;

  const lessonsRes = cls
    ? await supabase
        .from("lessons")
        .select(
          "id, lesson_date, vocabulary, grammar_point, speaking_activity, homework, general_note",
        )
        .eq("class_id", cls.id)
        .order("lesson_date", { ascending: false })
        .limit(20)
    : { data: [] as LessonRow[] };

  const lessons = (lessonsRes.data ?? []) as LessonRow[];

  const updatesRes = await supabase
    .from("student_lesson_updates")
    .select("lesson_id, behavior_rating, individual_note, homework_completed")
    .eq("student_id", student.id)
    .in(
      "lesson_id",
      lessons.map((l) => l.id),
    );

  const updateByLesson = new Map<string, UpdateRow>();
  for (const u of (updatesRes.data ?? []) as UpdateRow[]) {
    updateByLesson.set(u.lesson_id, u);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/parent"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Tất cả các con
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {student.full_name}
        </h1>
        <p className="text-muted-foreground text-sm">
          {cls ? (
            <>
              Lớp {cls.name}
              {teacher ? ` • Giáo viên ${teacher.full_name}` : null}
            </>
          ) : (
            "Chưa được xếp lớp."
          )}
        </p>
      </div>

      {lessons.length > 0 ? (
        <ul className="space-y-4">
          {lessons.map((l) => {
            const u = updateByLesson.get(l.id);
            const ratingMeta = u?.behavior_rating
              ? BEHAVIOR_LABELS[u.behavior_rating]
              : null;
            return (
              <li
                key={l.id}
                className="rounded-lg border bg-card p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-semibold">
                    {new Date(l.lesson_date).toLocaleDateString("vi-VN", {
                      weekday: "long",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </h2>
                  {ratingMeta ? (
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${ratingMeta.tone}`}
                    >
                      {ratingMeta.text}
                    </span>
                  ) : null}
                </div>

                <dl className="mt-3 space-y-2 text-sm">
                  {l.vocabulary ? (
                    <Field label="Từ vựng" value={l.vocabulary} />
                  ) : null}
                  {l.grammar_point ? (
                    <Field label="Ngữ pháp" value={l.grammar_point} />
                  ) : null}
                  {l.speaking_activity ? (
                    <Field
                      label="Luyện nói / nghe"
                      value={l.speaking_activity}
                    />
                  ) : null}
                  {l.homework ? (
                    <Field label="Bài tập về nhà" value={l.homework} />
                  ) : null}
                  {l.general_note ? (
                    <Field label="Ghi chú lớp" value={l.general_note} />
                  ) : null}
                </dl>

                {u ? (
                  <div className="mt-4 rounded-md bg-muted/40 p-3 text-sm">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Nhận xét cho con bạn
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant={u.homework_completed ? "default" : "outline"}>
                        {u.homework_completed
                          ? "Đã làm bài tập"
                          : "Chưa làm bài tập"}
                      </Badge>
                    </div>
                    {u.individual_note ? (
                      <p className="mt-2">{u.individual_note}</p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Chưa có bài học nào được ghi nhận cho con bạn.
        </p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 sm:grid-cols-[8rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
