import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ParentForm } from "./parent-form";
import { removeParent } from "./actions";
import { SearchInput } from "@/components/search-input";
import { ConfirmSubmitButton } from "@/components/confirm-submit";
import { InlineImportSection } from "@/components/inline-import-section";

export const dynamic = "force-dynamic";

export default async function ParentsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const t = await getTranslations("admin.parents");
  const tt = await getTranslations("admin.teachers");
  const tc = await getTranslations("common");
  const tAdmin = await getTranslations("admin");
  const tImport = await getTranslations("import");

  const q = searchParams.q?.trim() ?? "";

  let query = supabase
    .from("users")
    .select("id, full_name, email, created_at")
    .eq("role", "parent")
    .order("created_at", { ascending: true });
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);

  const { data: parents } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <ParentForm />

      <InlineImportSection
        variant="parents"
        toggleLabel={tImport("inlineToggleParents")}
        helpText={tImport("parentsHelp")}
        exampleCsv={`full_name,email,password
Phạm Văn Bình,binh@parent.test,changeme123
Nguyễn Thị Hoa,hoa@parent.test,changeme123`}
        noteText={tImport("parentsPasswordNote")}
      />

      <SearchInput placeholder={tAdmin("search")} />

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tt("fullName")}</TableHead>
              <TableHead>{tt("email")}</TableHead>
              <TableHead className="w-32 text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parents && parents.length > 0 ? (
              parents.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.email}
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={removeParent}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmSubmitButton
                        confirmMessage={t("deleteConfirm", {
                          name: p.full_name,
                        })}
                      >
                        {tc("delete")}
                      </ConfirmSubmitButton>
                    </form>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-muted-foreground py-6 text-center text-sm"
                >
                  {q ? tAdmin("searchEmpty") : t("empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
