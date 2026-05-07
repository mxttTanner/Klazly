import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";

export async function LogoutButton() {
  const t = await getTranslations("common");
  return (
    <form action="/logout" method="post">
      <button
        type="submit"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        {t("logout")}
      </button>
    </form>
  );
}
