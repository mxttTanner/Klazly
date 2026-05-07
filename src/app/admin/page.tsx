import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const supabase = createClient();

  const [
    { count: teacherCount },
    { count: parentCount },
    { count: classCount },
    { count: studentCount },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "teacher"),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "parent"),
    supabase.from("classes").select("id", { count: "exact", head: true }),
    supabase.from("students").select("id", { count: "exact", head: true }),
  ]);

  const cards = [
    { label: "Giáo viên", href: "/admin/teachers", count: teacherCount ?? 0 },
    { label: "Phụ huynh", href: "/admin/parents", count: parentCount ?? 0 },
    { label: "Lớp học", href: "/admin/classes", count: classCount ?? 0 },
    { label: "Học sinh", href: "/admin/students", count: studentCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bảng điều khiển
        </h1>
        <p className="text-muted-foreground text-sm">Tổng quan trung tâm.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className="transition hover:bg-muted/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {c.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{c.count}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
