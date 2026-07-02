import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

/**
 * Legal pages share the marketing-site chrome (navy SiteNav + SiteFooter)
 * so /legal/terms and /legal/privacy read as part of the same product as
 * the landing and pricing pages, instead of the pre-redesign light/blue
 * header they kept until 2026-07.
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-zinc-50">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
