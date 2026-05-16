import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { ForgotPasswordForm } from "./forgot-password-form";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const t = await getTranslations("forgotPassword");
  const tc = await getTranslations("common");

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <BrandLogo size="sm" showText={false} />
            <span className="text-sm font-semibold">Klazly</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
            >
              <ArrowLeft className="size-3.5" />
              {tc("back")}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-md flex-col px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t("subtitle")}</p>
        <div className="mt-8">
          <ForgotPasswordForm />
        </div>
      </main>
    </div>
  );
}
