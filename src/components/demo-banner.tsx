import { getTranslations } from "next-intl/server";
import { isDemoEmail } from "@/lib/demo";

export async function DemoBanner({ email }: { email: string | null }) {
  if (!isDemoEmail(email)) return null;
  const t = await getTranslations("demo");

  return (
    <div className="bg-amber-100 text-amber-900 print:hidden">
      <div className="mx-auto max-w-6xl px-4 py-2 text-center text-xs font-medium tracking-wide sm:px-6">
        {t("banner")}
      </div>
    </div>
  );
}
