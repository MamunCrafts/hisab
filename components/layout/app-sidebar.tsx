"use client";

import { LogOut, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { isActivePath, PRIMARY_NAV } from "./nav-items";
import { useQuickAdd } from "./quick-add-context";
import { UserAvatar } from "./user-avatar";
import { useLogout } from "./use-logout";

export function AppSidebar({ user }: { user: { name: string; email: string; image: string | null } }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { openQuickAdd } = useQuickAdd();
  const { logout, pending } = useLogout();

  return (
    <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" className="rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <Logo label={t("app.name")} />
        </Link>
      </div>
      <div className="px-3 pb-2">
        <Button className="w-full justify-start" onClick={() => openQuickAdd()}>
          <Plus className="size-4" aria-hidden />
          {t("quickAdd.title")}
        </Button>
      </div>
      <nav aria-label={t("nav.mainNavigation")} className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0.5">
          {PRIMARY_NAV.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    active && "bg-sidebar-accent text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="size-[18px]" aria-hidden />
                  {t(item.label)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <UserAvatar name={user.name} image={user.image} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" asChild>
                <Link href="/settings" aria-label={t("nav.settings")}>
                  <Settings className="size-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("nav.settings")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={logout} disabled={pending} aria-label={t("nav.logout")}>
                <LogOut className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("nav.logout")}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
