import { getLocale, getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/super-admin";
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
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SuperAdminHomePage() {
  await requireSuperAdmin();
  const t = await getTranslations("superAdmin");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const supabase = createAdminClient();
  const { data: centers } = await supabase
    .from("centers")
    .select(
      "id, name, contact_email, contact_phone, subscription_status, created_at",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("createHeader")}</h2>
        <CenterForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">
          {t("listHeader", { count: centers?.length ?? 0 })}
        </h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("centerName")}</TableHead>
                <TableHead>{t("adminEmail")}</TableHead>
                <TableHead className="w-32">{t("status")}</TableHead>
                <TableHead className="w-32">{t("created")}</TableHead>
                <TableHead className="w-24 text-right">{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {centers && centers.length > 0 ? (
                centers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.contact_email ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.subscription_status}
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
                        <button
                          type="submit"
                          className={buttonVariants({
                            variant: "destructive",
                            size: "sm",
                          })}
                        >
                          {tc("delete")}
                        </button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground py-6 text-center text-sm"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
