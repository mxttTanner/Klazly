import { AlertTriangle, Clock, XCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function SubscriptionBanner({ centerId }: { centerId: string }) {
  const supabase = createClient();
  const { data: center } = await supabase
    .from("centers")
    .select("subscription_status, trial_ends_at")
    .eq("id", centerId)
    .single();

  if (!center) return null;

  const t = await getTranslations("subscription");

  if (center.subscription_status === "active") return null;

  if (center.subscription_status === "trial") {
    let daysLeft: number | null = null;
    if (center.trial_ends_at) {
      const ends = new Date(center.trial_ends_at).getTime();
      const now = Date.now();
      daysLeft = Math.max(0, Math.ceil((ends - now) / (1000 * 60 * 60 * 24)));
    }
    const expired = daysLeft !== null && daysLeft <= 0;

    return (
      <div
        className={
          "border-b text-sm print:hidden " +
          (expired
            ? "bg-rose-50 text-rose-900"
            : "bg-sky-50 text-sky-900")
        }
      >
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 sm:px-6">
          {expired ? (
            <AlertTriangle className="size-4 shrink-0" />
          ) : (
            <Clock className="size-4 shrink-0" />
          )}
          <p>
            {expired
              ? t("trialExpired")
              : daysLeft !== null
                ? t("trialDaysLeft", { n: daysLeft })
                : t("trialActive")}
          </p>
        </div>
      </div>
    );
  }

  if (center.subscription_status === "past_due") {
    return (
      <div className="bg-rose-50 text-rose-900 border-b text-sm print:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 sm:px-6">
          <AlertTriangle className="size-4 shrink-0" />
          <p>{t("pastDue")}</p>
        </div>
      </div>
    );
  }

  if (center.subscription_status === "canceled") {
    return (
      <div className="bg-slate-100 text-slate-800 border-b text-sm print:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 sm:px-6">
          <XCircle className="size-4 shrink-0" />
          <p>{t("canceled")}</p>
        </div>
      </div>
    );
  }

  return null;
}
