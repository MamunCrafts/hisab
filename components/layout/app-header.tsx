"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { useI18n } from "@/lib/i18n/provider";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { CommandPalette } from "@/components/search/command-palette";
import { UserAvatar } from "./user-avatar";

export function AppHeader({
  user,
  unread,
  currency,
  timezone,
}: {
  user: { name: string; image: string | null };
  unread: number;
  currency: string;
  timezone: string;
}) {
  const { t } = useI18n();
  return (
    <header className="no-print sticky top-0 z-20 border-b bg-background/90 pt-safe backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 md:h-16 md:px-8">
        <Link href="/dashboard" className="rounded-lg md:hidden" aria-label={t("nav.dashboard")}>
          <Logo label={t("app.name")} className="[&>span:last-child]:text-base" />
        </Link>
        <div className="ml-auto flex items-center gap-1 md:ml-0 md:flex-1">
          <CommandPalette />
          <div className="flex-1" />
          <NotificationBell unread={unread} currency={currency} timezone={timezone} />
          <Link href="/settings/profile" className="ml-1 rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" aria-label={t("common.profile")}>
            <UserAvatar name={user.name} image={user.image} className="size-9" />
          </Link>
        </div>
      </div>
    </header>
  );
}
