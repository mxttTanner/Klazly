import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

const navLinks = [
  { href: "/admin/teachers", label: "Giáo viên" },
  { href: "/admin/parents", label: "Phụ huynh" },
  { href: "/admin/classes", label: "Lớp học" },
  { href: "/admin/students", label: "Học sinh" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("admin");

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-semibold">
              Quản trị
            </Link>
            <nav className="hidden gap-4 text-sm md:flex">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {user.full_name}
            </span>
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-6 pb-3 text-sm md:hidden">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-muted-foreground hover:text-foreground whitespace-nowrap"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
