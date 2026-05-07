import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";
import { getCurrentUser, dashboardPathFor } from "@/lib/auth";
import { LanguageToggle } from "@/components/language-toggle";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(dashboardPathFor(user.role));

  const t = await getTranslations("login");

  return (
    <>
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <main className="flex min-h-dvh items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("title")}
            </h1>
            <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
          </div>
          <LoginForm />
        </div>
      </main>
    </>
  );
}
