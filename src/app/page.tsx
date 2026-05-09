import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  BarChart3,
  Check,
  ClipboardList,
  Globe,
  GraduationCap,
  Heart,
  Lock,
  Printer,
  ScrollText,
  Sparkles,
  UserCog,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { BrandLogo } from "@/components/brand-logo";

export default async function HomePage() {
  const t = await getTranslations("landing");
  const year = new Date().getFullYear();

  const audiences = [
    {
      icon: UserCog,
      title: t("audienceOwnerTitle"),
      desc: t("audienceOwnerDesc"),
      tone: "bg-sky-50 text-sky-700",
    },
    {
      icon: GraduationCap,
      title: t("audienceTeacherTitle"),
      desc: t("audienceTeacherDesc"),
      tone: "bg-violet-50 text-violet-700",
    },
    {
      icon: Heart,
      title: t("audienceParentTitle"),
      desc: t("audienceParentDesc"),
      tone: "bg-rose-50 text-rose-700",
    },
  ];

  const features = [
    { icon: ClipboardList, label: t("feature1") },
    { icon: Sparkles, label: t("feature2") },
    { icon: Printer, label: t("feature3") },
    { icon: BarChart3, label: t("feature4") },
    { icon: Globe, label: t("feature5") },
    { icon: Lock, label: t("feature6") },
  ];

  const pricingItems = [
    t("pricingItem1"),
    t("pricingItem2"),
    t("pricingItem3"),
    t("pricingItem4"),
  ];

  return (
    <div className="min-h-dvh bg-background">
      {/* Top bar */}
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Cổng Phụ Huynh">
            <BrandLogo size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/login"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("heroLoginCta")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="from-primary/5 absolute inset-0 -z-10 bg-gradient-to-b to-transparent" />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl space-y-6 text-center">
            <p className="text-primary inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide">
              {t("heroEyebrow")}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="text-muted-foreground mx-auto max-w-2xl text-balance text-lg leading-relaxed">
              {t("heroSubtitle")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/demo"
                className={buttonVariants({ size: "lg" })}
              >
                {t("heroDemoCta")}
              </Link>
              <Link
                href="/login"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                {t("heroLoginCta")}
              </Link>
            </div>
          </div>

          {/* Mock product card */}
          <div className="mx-auto mt-16 max-w-3xl">
            <div className="bg-card overflow-hidden rounded-xl border shadow-2xl shadow-primary/10">
              <div className="bg-muted/40 flex items-center gap-1.5 border-b px-4 py-2.5">
                <span className="size-2.5 rounded-full bg-rose-400" />
                <span className="size-2.5 rounded-full bg-amber-400" />
                <span className="size-2.5 rounded-full bg-emerald-400" />
                <span className="text-muted-foreground ml-3 text-xs">
                  congphuhuynh.com
                </span>
              </div>
              <div className="space-y-4 p-6 text-left">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-semibold">Phạm Minh An</h3>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Xuất sắc
                  </span>
                </div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">
                  Thứ năm, 22/04/2026
                </p>
                <dl className="text-muted-foreground space-y-2 text-sm">
                  <Field label={t("feature1").split(":")[0].split(" ")[0]} icon="từ vựng" value="family, mother, father, sister, brother" />
                </dl>
                <p className="text-foreground border-t pt-3 text-sm">
                  Tham gia tích cực, phát biểu nhiều. Đã làm bài tập ✓
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Audience */}
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            {t("audienceTitle")}
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {audiences.map((a) => {
              const Icon = a.icon;
              return (
                <div
                  key={a.title}
                  className="bg-card rounded-xl border p-6 shadow-sm"
                >
                  <div
                    className={`flex size-10 items-center justify-center rounded-lg ${a.tone}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{a.title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {a.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-b bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            {t("featuresTitle")}
          </h2>
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className="bg-card flex items-start gap-3 rounded-lg border p-4"
                >
                  <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-4" />
                  </div>
                  <p className="text-sm leading-relaxed">{f.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("pricingTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance text-base">
              {t("pricingSubtitle")}
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
            {/* Monthly */}
            <div className="bg-card flex flex-col rounded-2xl border p-8 shadow-sm">
              <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {t("pricingMonthlyName")}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">
                  {t("pricingMonthlyPrice")}
                </span>
                <span className="text-muted-foreground text-sm">
                  {t("pricingMonthlyPeriod")}
                </span>
              </div>
              <p className="text-muted-foreground mt-2 text-sm">
                {t("pricingMonthlyNote")}
              </p>
              <Link
                href="/demo"
                className={`${buttonVariants({ variant: "outline", size: "lg" })} mt-auto w-full`}
              >
                {t("pricingCta")}
              </Link>
            </div>

            {/* Annual — highlighted */}
            <div className="bg-card relative flex flex-col rounded-2xl border-2 border-primary p-8 shadow-xl shadow-primary/10">
              <div className="absolute -top-3 right-6 inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                {t("pricingAnnualBadge")}
              </div>
              <div className="text-primary text-sm font-medium uppercase tracking-wide">
                {t("pricingAnnualName")}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">
                  {t("pricingAnnualPrice")}
                </span>
                <span className="text-muted-foreground text-sm">
                  {t("pricingAnnualPeriod")}
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {t("pricingAnnualEquivalent")}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                {t("pricingAnnualNote")}
              </p>
              <Link
                href="/demo"
                className={`${buttonVariants({ size: "lg" })} mt-auto w-full`}
              >
                {t("pricingCta")}
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-2xl">
            <p className="text-muted-foreground mb-4 text-center text-sm">
              {t("pricingNote")}
            </p>
            <ul className="grid gap-3 text-sm sm:grid-cols-2">
              {pricingItems.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="text-primary mt-0.5 size-4 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/20">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" showText={false} />
            <span>{t("footerCopyright", { year })}</span>
          </div>
          <div className="flex items-center gap-1">
            <ScrollText className="size-3.5" />
            <span>{t("footerContact")}</span>
            <a
              href="mailto:matthewstadlers14@gmail.com"
              className="hover:text-foreground"
            >
              matthewstadlers14@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Field({
  label,
  icon,
  value,
}: {
  label: string;
  icon: string;
  value: string;
}) {
  void label;
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-2">
      <dt className="text-muted-foreground text-xs uppercase tracking-wide">
        {icon}
      </dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
