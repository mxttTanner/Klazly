import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Eye, UserCog, GraduationCap, Heart } from "lucide-react";
import { isDemoEmail } from "@/lib/demo";

export async function DemoBanner({ email }: { email: string | null }) {
  if (!isDemoEmail(email)) return null;
  const t = await getTranslations("demo");

  // Highlight the active role so the viewer always knows where they are.
  const activeRole = email?.toLowerCase().includes("admin")
    ? "admin"
    : email?.toLowerCase().includes("huong") || email?.toLowerCase().includes("teacher")
      ? "teacher"
      : "parent";

  const roles = [
    { href: "/demo/admin", label: t("switchAdmin"), icon: UserCog, key: "admin" },
    { href: "/demo/teacher", label: t("switchTeacher"), icon: GraduationCap, key: "teacher" },
    { href: "/demo/parent", label: t("switchParent"), icon: Heart, key: "parent" },
  ] as const;

  return (
    <div className="border-amber-200 bg-gradient-to-r from-amber-50 via-amber-100 to-amber-50 text-amber-900 border-b print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-amber-200 ring-1 ring-amber-300">
            <Eye className="size-3.5 text-amber-900" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("banner")}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-amber-800/80 hidden text-xs sm:inline">
            {t("switchLabel")}
          </span>
          {roles.map((r) => {
            const Icon = r.icon;
            const active = r.key === activeRole;
            return (
              <Link
                key={r.href}
                href={r.href}
                className={
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition " +
                  (active
                    ? "bg-amber-900 text-amber-50 shadow-sm"
                    : "bg-amber-200/60 text-amber-900 hover:bg-amber-200")
                }
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-3" />
                {r.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
