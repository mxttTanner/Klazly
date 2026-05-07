"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { createStudent } from "./actions";

const initialState: { error?: string; success?: string } = {};

export function StudentForm({
  classes,
  parents,
}: {
  classes: { id: string; name: string }[];
  parents: { id: string; full_name: string }[];
}) {
  const [state, action] = useFormState(createStudent, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={action}
      className="grid gap-4 rounded-lg border p-4 sm:grid-cols-5"
    >
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="full_name">Họ và tên học sinh</Label>
        <Input id="full_name" name="full_name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="age">Tuổi</Label>
        <Input id="age" name="age" type="number" min={0} max={30} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="class_id">Lớp</Label>
        <select
          id="class_id"
          name="class_id"
          defaultValue="none"
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="none">Chưa xếp lớp</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="parent_user_id">Phụ huynh</Label>
        <select
          id="parent_user_id"
          name="parent_user_id"
          defaultValue="none"
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="none">Chưa liên kết</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end sm:col-span-5">
        <SubmitButton
          idleLabel="Thêm học sinh"
          pendingLabel="Đang thêm..."
        />
      </div>
      {state.error ? (
        <p className="text-destructive sm:col-span-5 text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="sm:col-span-5 text-sm text-emerald-600">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
