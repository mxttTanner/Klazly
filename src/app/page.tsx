import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";

export default async function HomePage() {
  const t = await getTranslations("landing");

  return (
    <>
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-16">
        <div className="max-w-xl space-y-4 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-balance">{t("tagline")}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className={buttonVariants({ size: "lg" })}>
            {t("login")}
          </Link>
          <Link
            href="/demo"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            {t("demo")}
          </Link>
        </div>
      </main>
    </>
  );
}
