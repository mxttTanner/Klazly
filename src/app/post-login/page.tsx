import { redirect } from "next/navigation";
import { getCurrentUser, dashboardPathFor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PostLoginPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(dashboardPathFor(user.role));
}
