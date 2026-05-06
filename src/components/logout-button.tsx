import { buttonVariants } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action="/logout" method="post">
      <button
        type="submit"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Đăng xuất
      </button>
    </form>
  );
}
