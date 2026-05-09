"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AdminSidebarNav, type NavItem } from "./admin-sidebar";

export function AdminMobileSidebar({
  items,
  brandLabel,
  triggerLabel,
}: {
  items: NavItem[];
  brandLabel: string;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={triggerLabel}
        className="text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-md md:hidden"
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle>{brandLabel}</SheetTitle>
        </SheetHeader>
        <div className="p-3" onClick={() => setOpen(false)}>
          <AdminSidebarNav items={items} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
