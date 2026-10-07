import { AlarmClock, ArrowDownLeft, ArrowUpRight, CalendarClock, CheckCircle2 } from "lucide-react";
import type { DueStatus } from "@/lib/finance/due";
import type { LedgerStatus } from "@/lib/finance/rules";
import type { Translator } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

/** Status pill with icon + text, so meaning never depends on color alone. */
export function LedgerStatusPill({ status, t, className }: { status: LedgerStatus; t: Translator; className?: string }) {
  const config = {
    RECEIVABLE: { icon: ArrowDownLeft, label: t("ledger.filterReceivable"), cls: "bg-receivable-soft text-receivable" },
    PAYABLE: { icon: ArrowUpRight, label: t("ledger.filterPayable"), cls: "bg-payable-soft text-payable" },
    SETTLED: { icon: CheckCircle2, label: t("ledger.settled"), cls: "bg-neutral-soft text-neutral-tone" },
  }[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", config.cls, className)}>
      <config.icon className="size-3" aria-hidden />
      {config.label}
    </span>
  );
}

export function DueChip({
  status,
  date,
  t,
  formatDate,
}: {
  status: DueStatus;
  date: string | null;
  t: Translator;
  formatDate: (d: string) => string;
}) {
  if (!date || status === "SETTLED" || status === "NO_DUE") return null;
  const overdue = status === "OVERDUE";
  const today = status === "DUE_TODAY";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        overdue ? "bg-expense-soft text-expense" : today ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground",
      )}
    >
      {overdue ? <AlarmClock className="size-3" aria-hidden /> : <CalendarClock className="size-3" aria-hidden />}
      {overdue ? t("ledger.overdueSince", { date: formatDate(date) }) : today ? t("ledger.dueToday") : t("ledger.due", { date: formatDate(date) })}
    </span>
  );
}
