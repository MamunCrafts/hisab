"use client";

import { ArrowDownLeft, ArrowUpRight, HandCoins, Wallet } from "lucide-react";
import { useQuickAdd, type QuickAddKind } from "@/components/layout/quick-add-context";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

const ITEMS: Array<{ kind: QuickAddKind; label: TranslationKey; icon: typeof Wallet; cls: string }> = [
  { kind: "EXPENSE", label: "quickAdd.expense", icon: ArrowUpRight, cls: "bg-expense-soft text-expense" },
  { kind: "INCOME", label: "quickAdd.income", icon: ArrowDownLeft, cls: "bg-income-soft text-income" },
  { kind: "LEND", label: "quickAdd.gave", icon: HandCoins, cls: "bg-receivable-soft text-receivable" },
  { kind: "BORROW", label: "quickAdd.took", icon: Wallet, cls: "bg-payable-soft text-payable" },
];

/** One-tap shortcuts into the most common entry forms. */
export function QuickAddStrip({ className }: { className?: string }) {
  const { t } = useI18n();
  const { openQuickAdd } = useQuickAdd();
  return (
    <section aria-label={t("dashboard.quickAdd")} className={cn("grid grid-cols-4 gap-2", className)}>
      {ITEMS.map((item) => (
        <button
          key={item.kind}
          type="button"
          onClick={() => openQuickAdd({ kind: item.kind })}
          className="flex flex-col items-center gap-1.5 rounded-2xl border bg-card px-1 py-3 text-xs font-medium shadow-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted"
        >
          <span className={cn("flex size-9 items-center justify-center rounded-xl", item.cls)}>
            <item.icon className="size-[18px]" aria-hidden />
          </span>
          {t(item.label)}
        </button>
      ))}
    </section>
  );
}
