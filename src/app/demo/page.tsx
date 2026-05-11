import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { GraduationCap, Heart, UserSquare2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { BrandLogo } from "@/components/brand-logo";

export default async function DemoChooserPage() {
  const t = await getTranslations("demo");
  const tLanding = await getTranslations("landing");

  const roles = [
    {
      key: "admin",
      icon: UserSquare2,
      title: t("roleAdminTitle"),
      desc: t("roleAdminDesc"),
      tone: "bg-sky-50 text-sky-700",
      href: "/demo/admin",
    },
    {
      key: "teacher",
      icon: GraduationCap,
      title: t("roleTeacherTitle"),
      desc: t("roleTeacherDesc"),
      tone: "bg-violet-50 text-violet-700",
      href: "/demo/teacher",
    },
    {
      key: "parent",
      icon: Heart,
      title: t("roleParentTitle"),
      desc: t("roleParentDesc"),
      tone: "bg-rose-50 text-rose-700",
      href: "/demo/parent",
    },
  ];

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" aria-label={tLanding("brandAriaLabel")}>
            <BrandLogo size="md" />
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("chooserTitle")}
          </h1>
          <p className="text-muted-foreground">{t("chooserSubtitle")}</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {roles.map((r) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.key}
                href={r.href}
                className="bg-card group flex flex-col rounded-xl border p-6 shadow-sm transition hover:shadow-lg hover:-translate-y-0.5"
              >
                <div
                  className={`flex size-11 items-center justify-center rounded-lg ${r.tone}`}
                >
                  <Icon className="size-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">{r.title}</h2>
                <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
                  {r.desc}
                </p>
                <span
                  className={`${buttonVariants({ size: "sm" })} mt-4 self-start`}
                >
                  {t("enterAs")}
                </span>
              </Link>
            );
          })}
        </div>

        <p className="text-muted-foreground mt-12 text-center text-sm">
          {t("chooserHint")}{" "}
          <Link href="/" className="underline hover:text-foreground">
            {t("backHome")}
          </Link>
        </p>
      </main>
    </div>
  );
}
