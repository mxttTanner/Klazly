import { getTranslations } from "next-intl/server";

/**
 * Logout button. Default "dark" tone suits the navy app bars
 * (admin / teacher / parent) — light text on a subtle translucent
 * surface. Pass tone="light" on light bars (e.g. super-admin) so the
 * label stays readable.
 */
export async function LogoutButton({
  tone = "dark",
}: {
  tone?: "dark" | "light";
}) {
  const t = await getTranslations("common");
  const cls =
    tone === "light"
      ? "inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:bg-muted"
      : "inline-flex h-9 items-center rounded-md border border-white/15 bg-white/5 px-3 text-sm font-medium text-white transition hover:bg-white/10";
  return (
    <form action="/logout" method="post">
      <button type="submit" className={cls}>
        {t("logout")}
      </button>
    </form>
  );
}
