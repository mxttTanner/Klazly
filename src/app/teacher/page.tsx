import { requireRole } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function TeacherHomePage() {
  const user = await requireRole("teacher");

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Trang giáo viên
          </h1>
          <p className="text-muted-foreground text-sm">
            Xin chào {user.full_name}.
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        Danh sách lớp và biểu mẫu cập nhật bài học sẽ xuất hiện ở đây.
      </section>
    </main>
  );
}
