import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-4">
      <div className="bg-card max-w-md space-y-5 rounded-2xl border p-6 shadow-sm text-center">
        <div className="bg-primary/10 text-primary mx-auto inline-flex size-12 items-center justify-center rounded-full">
          <Compass className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            404
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Page not found
          </h1>
          <p className="text-muted-foreground text-sm">
            Trang bạn đang tìm không tồn tại hoặc đã bị di chuyển. Có thể bạn
            đã đăng xuất hoặc liên kết đã thay đổi.
          </p>
          <p className="text-muted-foreground text-sm">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <div className="flex justify-center">
          <Link
            href="/"
            className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            <Home className="size-4" />
            Back to home / Về trang chủ
          </Link>
        </div>
        <div className="border-t pt-4">
          <BrandLogo size="sm" />
        </div>
      </div>
    </div>
  );
}
