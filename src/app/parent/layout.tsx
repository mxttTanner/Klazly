import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("parent");

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/parent" className="text-lg font-semibold">
            Cổng phụ huynh
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {user.full_name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </div>
    </div>
  );
}
