import { getLocale, getTranslations } from "next-intl/server";
import { Building2, GraduationCap, Plus, Sparkles, Trash2, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/super-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CenterForm } from "./center-form";
import { deleteCenterCascade } from "./actions";
import { StatusSelect } from "./status-select";
import { ConfirmSubmitButton } from "@/components/confirm-submit";

export const dynamic = "force-dynamic";

export default async function SuperAdminHomePage() {
  await requireSuperAdmin();
  const t = await getTranslations("superAdmin");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const supabase = createAdminClient();

  const [
    { data: centers },
    { count: activeCount },
    { count: studentCount },
    { count: lessonCount },
  ] = await Promise.all([
    supabase
      .from("centers")
      .select(
        "id, name, contact_email, contact_phone, subscription_status, trial_ends_at, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("centers")
      .select("id", { count: "exact", head: true })
      .eq("subscription_status", "active"),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("lessons").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    {
      label: t("statsCenters"),
      value: centers?.length ?? 0,
      icon: Building2,
      tone: "text-sky-600",
    },
    {
      label: t("statsActive"),
      value: activeCount ?? 0,
      icon: Sparkles,
      tone: "text-emerald-600",
    },
    {
      label: t("statsStudents"),
      value: studentCount ?? 0,
      icon: GraduationCap,
      tone: "text-violet-600",
    },
    {
      label: t("statsLessons"),
      value: lessonCount ?? 0,
      icon: Users,
      tone: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {s.label}
                </CardTitle>
                <Icon className={`size-4 ${s.tone}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{s.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="text-primary size-5" />
          <h2 className="text-xl font-semibold tracking-tight">
            {t("createHeader")}
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">{t("createSubtitle")}</p>
        <CenterForm />
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="text-primary size-5" />
          <h2 className="text-xl font-semibold tracking-tight">
            {t("listHeader", { count: centers?.length ?? 0 })}
          </h2>
        </div>

        {centers && centers.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("centerName")}</TableHead>
                  <TableHead>{t("adminEmail")}</TableHead>
                  <TableHead className="w-32">{t("status")}</TableHead>
                  <TableHead className="w-36">{t("trialEnds")}</TableHead>
                  <TableHead className="w-32">{t("created")}</TableHead>
                  <TableHead className="w-24 text-right">
                    {tc("actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centers.map((c) => {
                  // Trial expiry — color cells red within 7 days, amber within 14.
                  let trialCell: React.ReactNode = "—";
                  let trialClass = "text-muted-foreground";
                  if (
                    c.subscription_status === "trial" &&
                    c.trial_ends_at
                  ) {
                    const ends = new Date(c.trial_ends_at);
                    const days = Math.ceil(
                      (ends.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                    );
                    trialCell = `${ends.toLocaleDateString(dateLocale, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })} (${
                      days <= 0
                        ? t("trialExpiredShort")
                        : t("trialDaysShort", { n: days })
                    })`;
                    if (days <= 0) trialClass = "text-rose-700 font-medium";
                    else if (days <= 7) trialClass = "text-rose-600";
                    else if (days <= 14) trialClass = "text-amber-700";
                  }
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          <Building2 className="text-muted-foreground size-4" />
                          {c.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.contact_email ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusSelect
                          centerId={c.id}
                          currentStatus={c.subscription_status}
                        />
                      </TableCell>
                      <TableCell className={trialClass + " text-xs"}>
                        {trialCell}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString(dateLocale, {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <form action={deleteCenterCascade}>
                          <input type="hidden" name="id" value={c.id} />
                          <ConfirmSubmitButton
                            confirmMessage={t("deleteConfirm", { name: c.name })}
                            ariaLabel={tc("delete")}
                          >
                            <Trash2 className="size-3.5" />
                          </ConfirmSubmitButton>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-12 text-center text-sm">
            <Building2 className="size-8 opacity-50" />
            <p>{t("empty")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
