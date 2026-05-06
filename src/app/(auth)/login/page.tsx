import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getCurrentUser, dashboardPathFor } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(dashboardPathFor(user.role));

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Đăng nhập</h1>
          <p className="text-muted-foreground text-sm">
            Cổng phụ huynh dành cho trung tâm tiếng Anh.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
