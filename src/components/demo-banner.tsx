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

  // Map each role to its palette color so the active pill reflects
  // the role identity (sky=admin, violet=teacher, rose=parent).
  const roles = [
    {
      href: "/demo/admin",
      label: t("switchAdmin"),
      icon: UserCog,
      key: "admin",
      activeBg: "bg-sky-500",
      activeRing: "ring-sky-400/60",
    },
    {
      href: "/demo/teacher",
      label: t("switchTeacher"),
      icon: GraduationCap,
      key: "teacher",
      activeBg: "bg-violet-500",
      activeRing: "ring-violet-400/60",
    },
    {
      href: "/demo/parent",
      label: t("switchParent"),
      icon: Heart,
      key: "parent",
      activeBg: "bg-rose-500",
      activeRing: "ring-rose-400/60",
    },
  ] as const;

  return (
    <div className="relative border-b border-amber-200/60 bg-gradient-to-r from-amber-50/80 via-amber-50/70 to-amber-50/80 text-amber-900 print:hidden">
      {/* Hairline at the bottom — ties to the page chrome's gradient
          accent so the demo strip feels like a coherent layer. */}
      <div
        aria-hidden="true"
        className="from-sky-400 via-primary to-amber-400 absolute inset-x-0 bottom-0 h-px bg-gradient-to-r opacity-40"
      />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="inline-flex items-center gap-2">
          <span className="bg-amber-100 ring-amber-200 inline-flex size-7 items-center justify-center rounded-full shadow-sm ring-1">
            <Eye className="text-amber-700 size-3.5" />
          </span>
          <span className="text-amber-800 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
            <span className="relative inline-flex size-1.5">
              <span className="bg-amber-500 absolute inset-0 rounded-full motion-safe:animate-ping motion-safe:opacity-75" />
              <span className="bg-amber-500 relative inline-block size-1.5 rounded-full" />
            </span>
            {t("banner")}
          </span>
        </div>

        {/* Role pill switcher — inactive pills are white with hover
            tint; active pill is solid in the role's palette color
            with a glow ring so the user always knows where they are. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-amber-700/70 hidden text-xs sm:inline">
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
                  "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all " +
                  (active
                    ? `text-white shadow-md ring-2 ${r.activeBg} ${r.activeRing}`
                    : "bg-white/80 text-amber-800 shadow-sm ring-1 ring-amber-200/70 hover:scale-[1.03] hover:bg-white hover:shadow-md")
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
