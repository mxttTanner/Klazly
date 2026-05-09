import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { isDemoEmail } from "@/lib/demo";

export async function DemoBanner({ email }: { email: string | null }) {
  if (!isDemoEmail(email)) return null;
  const t = await getTranslations("demo");

  const links = [
    { href: "/demo/admin", label: t("switchAdmin") },
    { href: "/demo/teacher", label: t("switchTeacher") },
    { href: "/demo/parent", label: t("switchParent") },
  ];

  return (
    <div className="bg-amber-100 text-amber-900 print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs sm:px-6">
        <span className="font-medium tracking-wide">{t("banner")}</span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden text-amber-800 sm:inline">
            {t("switchLabel")}
          </span>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded bg-amber-200 px-2 py-0.5 font-medium text-amber-900 hover:bg-amber-300"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
