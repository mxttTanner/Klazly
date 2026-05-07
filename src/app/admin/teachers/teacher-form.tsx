"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { inviteTeacher } from "./actions";

const initialState: { error?: string; success?: string } = {};

export function TeacherForm() {
  const [state, action] = useFormState(inviteTeacher, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={action}
      className="grid gap-4 rounded-lg border p-4 sm:grid-cols-4"
    >
      <div className="space-y-2">
        <Label htmlFor="full_name">Họ và tên</Label>
        <Input id="full_name" name="full_name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Mật khẩu khởi tạo</Label>
        <Input
          id="password"
          name="password"
          type="text"
          minLength={8}
          required
          placeholder="Tối thiểu 8 ký tự"
        />
      </div>
      <div className="flex items-end">
        <SubmitButton
          idleLabel="Thêm giáo viên"
          pendingLabel="Đang thêm..."
          className="w-full"
        />
      </div>
      {state.error ? (
        <p className="text-destructive sm:col-span-4 text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="sm:col-span-4 text-sm text-emerald-600">
          {state.success} Vui lòng chuyển mật khẩu cho giáo viên qua kênh riêng.
        </p>
      ) : null}
    </form>
  );
}
