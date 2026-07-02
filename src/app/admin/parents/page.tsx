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

export default async function ParentsPage(
  props: {
    searchParams: Promise<{ q?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const t = await getTranslations("admin.parents");
  const tt = await getTranslations("admin.teachers");
  const tc = await getTranslations("common");
  const tAdmin = await getTranslations("admin");
  const tImport = await getTranslations("import");

  const q = searchParams.q?.trim() ?? "";

  // Try full select with phone; fall back if migration not yet run.
  const withPhone = await supabase
    .from("users")
    .select("id, full_name, email, phone, created_at")
    .eq("role", "parent")
    .order("created_at", { ascending: true });
  type ParentRow = {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    created_at: string;
  };
  let parents: ParentRow[] | null = null;
  if (!withPhone.error) {
    parents = (withPhone.data ?? []) as ParentRow[];
  } else {
    const fallback = await supabase
      .from("users")
      .select("id, full_name, email, created_at")
      .eq("role", "parent")
      .order("created_at", { ascending: true });
    parents = ((fallback.data ?? []) as Omit<ParentRow, "phone">[]).map(
      (p) => ({ ...p, phone: null }),
    );
  }
  if (q) {
    const needle = q.toLowerCase();
    parents = parents.filter(
      (p) =>
        p.full_name.toLowerCase().includes(needle) ||
        (p.email?.toLowerCase().includes(needle) ?? false) ||
        (p.phone?.includes(needle) ?? false),
    );
  }

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
        exampleCsv={`full_name,phone,email,password
Phạm Văn Bình,0901234567,,changeme123
Nguyễn Thị Hoa,0907654321,hoa@gmail.com,
Lê Văn Long,+84987654321,,`}
        noteText={tImport("parentsPasswordNote")}
      />

      <SearchInput placeholder={tAdmin("search")} />

      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tt("fullName")}</TableHead>
              <TableHead>{tt("contact")}</TableHead>
              <TableHead className="w-32 text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parents && parents.length > 0 ? (
              parents.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {p.phone || p.email ? (
                      <div className="space-y-0.5">
                        {p.phone ? (
                          <div className="text-foreground">{p.phone}</div>
                        ) : null}
                        {p.email ? (
                          <div className="text-muted-foreground text-xs">
                            {p.email}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      "—"
                    )}
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
