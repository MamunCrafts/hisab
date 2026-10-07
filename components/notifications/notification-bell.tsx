"use client";

import { AlarmClock, Bell, CheckCheck, PiggyBank, Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { listNotificationsAction, markAllNotificationsReadAction, markNotificationReadAction } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import type { NotificationItem } from "@/db/queries/notifications";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { absMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const ICONS = {
  DEBT_DUE_TODAY: AlarmClock,
  DEBT_OVERDUE: AlarmClock,
  BUDGET_NEAR_LIMIT: PiggyBank,
  BUDGET_EXCEEDED: PiggyBank,
  RECURRING_UPCOMING: Repeat,
} as const;

function hrefFor(n: NotificationItem) {
  if (n.type.startsWith("DEBT")) return n.relatedEntityId ? `/ledger/${n.relatedEntityId}` : "/ledger";
  if (n.type.startsWith("BUDGET")) return "/budgets";
  return "/recurring";
}

export function NotificationBell({ unread, currency, timezone }: { unread: number; currency: string; timezone: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [, startTransition] = useTransition();
  // Mark-as-read is optimistic: it's a harmless UI preference, not a money write.
  const [optimisticItems, markLocal] = useOptimistic(items, (state, id: string | "all") =>
    state?.map((n) => (id === "all" || n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)) ?? null,
  );
  const [optimisticUnread, setOptimisticUnread] = useOptimistic(unread, (count, delta: number) => Math.max(0, delta < 0 ? 0 : count - delta));

  useEffect(() => {
    if (!open) return;
    let active = true;
    listNotificationsAction().then((r) => active && r.ok && setItems(r.data));
    return () => {
      active = false;
    };
  }, [open]);

  // Re-render stored notifications in the viewer's current language.
  const render = (n: NotificationItem) => {
    const data = n.data ?? {};
    const params = {
      ...data,
      amount: data.amount ? formatCurrency(absMoney(String(data.amount)), { currency }) : "",
      date: data.date ? formatDate(String(data.date), locale) : "",
    };
    return {
      title: t(`notifications.${n.type}_title` as TranslationKey),
      body: t(`notifications.${n.type}_body` as TranslationKey, params),
    };
  };

  const markRead = (n: NotificationItem) =>
    startTransition(async () => {
      if (!n.readAt) {
        markLocal(n.id);
        setOptimisticUnread(1);
        await markNotificationReadAction(n.id);
      }
      setItems((list) => list?.map((x) => (x.id === n.id ? { ...x, readAt: x.readAt ?? new Date().toISOString() } : x)) ?? null);
      setOpen(false);
      router.push(hrefFor(n));
      router.refresh();
    });

  const markAll = () =>
    startTransition(async () => {
      markLocal("all");
      setOptimisticUnread(-1);
      await markAllNotificationsReadAction();
      setItems((list) => list?.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })) ?? null);
      router.refresh();
    });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`${t("common.notifications")}${optimisticUnread ? ` (${t("notifications.unread", { count: optimisticUnread })})` : ""}`}>
          <Bell className="size-5" />
          {optimisticUnread > 0 ? (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-expense px-1 text-[10px] font-semibold text-white">
              {optimisticUnread > 9 ? "9+" : optimisticUnread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,380px)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{t("notifications.title")}</h2>
          {optimisticItems?.some((n) => !n.readAt) ? (
            <Button variant="ghost" size="sm" onClick={markAll}>
              <CheckCheck className="size-4" aria-hidden />
              {t("notifications.markAllRead")}
            </Button>
          ) : null}
        </div>
        <div className="max-h-[60dvh] overflow-y-auto">
          {optimisticItems === null ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : optimisticItems.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t("notifications.empty")}</p>
          ) : (
            <ul className="divide-y">
              {optimisticItems.map((n) => {
                const Icon = ICONS[n.type];
                const { title, body } = render(n);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => markRead(n)}
                      className={cn("flex w-full gap-3 px-4 py-3 text-left hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none", !n.readAt && "bg-accent/40")}
                    >
                      <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", n.type.includes("OVERDUE") || n.type.includes("EXCEEDED") ? "bg-expense-soft text-expense" : "bg-warning-soft text-warning")}>
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {title}
                          {!n.readAt ? <span className="size-2 rounded-full bg-primary" aria-label={t("notifications.unread", { count: 1 })} /> : null}
                        </span>
                        <span className="block text-xs text-muted-foreground">{body}</span>
                        <span className="block text-[11px] text-muted-foreground/80">{formatDateTime(new Date(n.createdAt), locale, timezone)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
