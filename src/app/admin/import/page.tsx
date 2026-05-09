import { getTranslations } from "next-intl/server";
import { GraduationCap, Heart } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { ImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireRole("admin");
  const t = await getTranslations("import");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Heart className="text-rose-600 size-5" />
          <h2 className="text-lg font-semibold">{t("parentsHeader")}</h2>
        </div>
        <p className="text-muted-foreground text-sm">{t("parentsHelp")}</p>
        <pre className="bg-muted text-muted-foreground overflow-x-auto rounded-md p-3 text-xs">
{`full_name,email,password
Phạm Văn Bình,binh@parent.test,changeme123
Nguyễn Thị Hoa,hoa@parent.test,changeme123`}
        </pre>
        <p className="text-muted-foreground text-xs">{t("parentsPasswordNote")}</p>
        <ImportForm variant="parents" />
      </section>

      <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-amber-600 size-5" />
          <h2 className="text-lg font-semibold">{t("studentsHeader")}</h2>
        </div>
        <p className="text-muted-foreground text-sm">{t("studentsHelp")}</p>
        <pre className="bg-muted text-muted-foreground overflow-x-auto rounded-md p-3 text-xs">
{`full_name,age,class_name,parent_email
Phạm Minh An,8,Lớp Junior A,binh@parent.test
Nguyễn Bảo Ngọc,10,Lớp Junior A,hoa@parent.test`}
        </pre>
        <p className="text-muted-foreground text-xs">{t("studentsNote")}</p>
        <ImportForm variant="students" />
      </section>
    </div>
  );
}
