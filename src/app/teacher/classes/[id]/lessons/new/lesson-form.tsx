"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { createLesson } from "./actions";

const initialState: { error?: string } = {};

const BEHAVIOR_OPTIONS = [
  { value: "great", label: "Xuất sắc" },
  { value: "good", label: "Tốt" },
  { value: "okay", label: "Khá" },
  { value: "needs_attention", label: "Cần lưu ý" },
];

export function LessonForm({
  classId,
  className,
  students,
  defaultDate,
}: {
  classId: string;
  className: string;
  students: { id: string; full_name: string }[];
  defaultDate: string;
}) {
  const [state, action] = useFormState(createLesson, initialState);

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="class_id" value={classId} />

      <section className="space-y-4 rounded-lg border p-6">
        <div>
          <h2 className="text-lg font-medium">Thông tin chung</h2>
          <p className="text-muted-foreground text-sm">
            Áp dụng cho cả lớp {className}.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lesson_date">Ngày học</Label>
            <Input
              id="lesson_date"
              name="lesson_date"
              type="date"
              required
              defaultValue={defaultDate}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vocabulary">Từ vựng</Label>
          <Textarea
            id="vocabulary"
            name="vocabulary"
            rows={2}
            placeholder="VD: family, mother, father, sister, brother"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="grammar_point">Ngữ pháp</Label>
          <Textarea
            id="grammar_point"
            name="grammar_point"
            rows={2}
            placeholder="VD: Present perfect — Have you ever ___?"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="speaking_activity">Hoạt động luyện nói</Label>
          <Textarea
            id="speaking_activity"
            name="speaking_activity"
            rows={2}
            placeholder="VD: Pair-work giới thiệu gia đình."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="homework">Bài tập về nhà</Label>
          <Textarea
            id="homework"
            name="homework"
            rows={2}
            placeholder="VD: Workbook trang 14, bài 1-3."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="general_note">Ghi chú chung cho cả lớp</Label>
          <Textarea
            id="general_note"
            name="general_note"
            rows={3}
            placeholder="VD: Lớp tham gia tích cực, một số bạn cần luyện thêm phát âm."
          />
        </div>
      </section>

      <section className="space-y-4 rounded-lg border p-6">
        <div>
          <h2 className="text-lg font-medium">Nhận xét từng học sinh</h2>
          <p className="text-muted-foreground text-sm">
            Đánh giá thái độ, ghi chú và đánh dấu bài tập về nhà cho mỗi học
            sinh.
          </p>
        </div>

        <div className="space-y-6">
          {students.map((s) => (
            <div
              key={s.id}
              className="grid gap-4 rounded-md border p-4 sm:grid-cols-[1fr_1fr_auto]"
            >
              <input type="hidden" name="student_id" value={s.id} />

              <div className="space-y-2 sm:col-span-3">
                <p className="font-medium">{s.full_name}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`behavior_${s.id}`}>Thái độ</Label>
                <select
                  id={`behavior_${s.id}`}
                  name={`behavior_${s.id}`}
                  defaultValue="none"
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="none">— Chưa đánh giá —</option>
                  {BEHAVIOR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`note_${s.id}`}>Ghi chú riêng</Label>
                <Textarea
                  id={`note_${s.id}`}
                  name={`note_${s.id}`}
                  rows={2}
                  placeholder="Nhận xét cho phụ huynh"
                />
              </div>

              <div className="flex items-end gap-2">
                <Checkbox id={`homework_${s.id}`} name={`homework_${s.id}`} />
                <Label htmlFor={`homework_${s.id}`} className="font-normal">
                  Đã làm bài tập
                </Label>
              </div>
            </div>
          ))}
        </div>
      </section>

      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3">
        <Link
          href={`/teacher/classes/${classId}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Huỷ
        </Link>
        <SubmitButton idleLabel="Lưu bài học" pendingLabel="Đang lưu..." />
      </div>
    </form>
  );
}
