import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { BrandLogo } from "@/components/brand-logo";

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tc = await getTranslations("common");

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <BrandLogo size="sm" showText={false} />
            <span className="text-sm font-semibold">Cổng Phụ Huynh</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
            >
              <ArrowLeft className="size-3.5" />
              {tc("back")}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </main>
    </div>
  );
}
