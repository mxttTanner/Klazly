import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="max-w-xl space-y-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Cổng Phụ Huynh
        </h1>
        <p className="text-muted-foreground text-balance">
          Nền tảng kết nối trung tâm tiếng Anh, giáo viên và phụ huynh — theo dõi
          tiến trình học tập của con sau mỗi buổi học.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          Đăng nhập
        </Link>
        <Link
          href="/demo"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Xem bản demo
        </Link>
      </div>
    </main>
  );
}
