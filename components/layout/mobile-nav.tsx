"use client";

import { ArrowLeftRight, BookUser, Home, LogOut, Menu, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { isActivePath, MORE_NAV } from "./nav-items";
import { useQuickAdd } from "./quick-add-context";
import { UserAvatar } from "./user-avatar";
import { useLogout } from "./use-logout";

const tabClass =
  "flex h-full flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-lg";

export function MobileNav({ user }: { user: { name: string; email: string; image: string | null } }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { openQuickAdd } = useQuickAdd();
  const [moreOpen, setMoreOpen] = useState(false);
  const { logout, pending } = useLogout();
  const moreActive = MORE_NAV.some((item) => isActivePath(pathname, item.href));

  const tabs = [
    { href: "/dashboard", label: t("nav.home"), icon: Home },
    { href: "/transactions", label: t("nav.transactions"), icon: ArrowLeftRight },
  ];
  const tabsRight = [{ href: "/ledger", label: t("nav.ledger"), icon: BookUser }];

  const renderTab = (tab: (typeof tabs)[number]) => {
    const active = isActivePath(pathname, tab.href);
    return (
      <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className={cn(tabClass, active && "text-primary")}>
        <tab.icon className="size-[22px]" aria-hidden strokeWidth={active ? 2.25 : 1.75} />
        <span>{tab.label}</span>
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label={t("nav.mainNavigation")}
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-safe backdrop-blur supports-[backdrop-filter]:bg-card/85 md:hidden"
      >
        <div className="mx-auto flex h-16 max-w-lg items-stretch px-2">
          {tabs.map(renderTab)}
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={() => openQuickAdd()}
              className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-4 ring-background transition-transform active:scale-95 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={t("quickAdd.title")}
            >
              <Plus className="size-7" aria-hidden />
            </button>
          </div>
          {tabsRight.map(renderTab)}
          <button type="button" onClick={() => setMoreOpen(true)} className={cn(tabClass, moreActive && "text-primary")} aria-haspopup="dialog">
            <Menu className="size-[22px]" aria-hidden />
            <span>{t("nav.more")}</span>
          </button>
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="sr-only">{t("nav.more")}</DrawerTitle>
            <div className="flex items-center gap-3">
              <UserAvatar name={user.name} image={user.image} className="size-11" />
              <div className="min-w-0">
                <p className="truncate font-medium">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </DrawerHeader>
          <nav className="grid grid-cols-3 gap-2 px-4">
            {MORE_NAV.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border bg-card px-2 py-4 text-center text-xs font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    active && "border-primary/40 bg-accent text-accent-foreground",
                  )}
                >
                  <item.icon className="size-5" aria-hidden />
                  {t(item.label)}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={logout}
              disabled={pending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium text-destructive focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <LogOut className="size-4" aria-hidden />
              {t("nav.logout")}
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
