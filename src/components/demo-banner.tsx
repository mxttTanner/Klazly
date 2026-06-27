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

  // Roles are distinguished by label + icon, not hue — the design system
  // is single-accent, so the active pill is simply the primary colour.
  const roles = [
    {
      href: "/demo/admin",
      label: t("switchAdmin"),
      icon: UserCog,
      key: "admin",
    },
    {
      href: "/demo/teacher",
      label: t("switchTeacher"),
      icon: GraduationCap,
      key: "teacher",
    },
    {
      href: "/demo/parent",
      label: t("switchParent"),
      icon: Heart,
      key: "parent",
    },
  ] as const;

  return (
    <div className="border-border bg-muted text-foreground border-b print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="inline-flex items-center gap-2">
          <span className="bg-background ring-border inline-flex size-7 items-center justify-center rounded-full ring-1">
            <Eye className="text-muted-foreground size-3.5" />
          </span>
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
            <span className="bg-primary inline-block size-1.5 rounded-full" />
            {t("banner")}
          </span>
        </div>

        {/* Role pill switcher — inactive pills are neutral with a hover
            tint; the active pill is solid primary so the user always knows
            which role they're viewing. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground hidden text-xs sm:inline">
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
                  "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-150 " +
                  (active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-background text-muted-foreground ring-border hover:bg-accent hover:text-foreground shadow-sm ring-1")
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
