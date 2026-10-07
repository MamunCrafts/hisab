"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, HandCoins, Wallet } from "lucide-react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import { QuickAddForm } from "@/components/finance/quick-add-form";
import { useQuickAdd, type QuickAddKind } from "./quick-add-context";

const OPTIONS: Array<{
  kind: QuickAddKind;
  label: TranslationKey;
  hint: TranslationKey;
  icon: typeof Wallet;
  tone: string;
}> = [
  { kind: "EXPENSE", label: "quickAdd.expense", hint: "quickAdd.expenseHint", icon: ArrowUpRight, tone: "bg-expense-soft text-expense" },
  { kind: "INCOME", label: "quickAdd.income", hint: "quickAdd.incomeHint", icon: ArrowDownLeft, tone: "bg-income-soft text-income" },
  { kind: "LEND", label: "quickAdd.gave", hint: "quickAdd.gaveHint", icon: HandCoins, tone: "bg-receivable-soft text-receivable" },
  { kind: "BORROW", label: "quickAdd.took", hint: "quickAdd.tookHint", icon: Wallet, tone: "bg-payable-soft text-payable" },
  { kind: "TRANSFER", label: "quickAdd.transfer", hint: "quickAdd.transferHint", icon: ArrowLeftRight, tone: "bg-neutral-soft text-neutral-tone" },
];

export function QuickAddSheet() {
  const { t } = useI18n();
  const { open, setOpen, request, openQuickAdd } = useQuickAdd();
  const kind = request.kind;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      title={kind ? t(`transactionTypes.${kind}`) : t("quickAdd.title")}
      description={kind ? undefined : t("quickAdd.description")}
      hideHeader={Boolean(kind)}
    >
      {kind ? (
        <QuickAddForm
          key={`${kind}-${request.contactId ?? ""}`}
          kind={kind}
          contactId={request.contactId}
          onBack={() => openQuickAdd({})}
          onDone={() => setOpen(false)}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 pb-2 sm:grid-cols-3">
          {OPTIONS.map((option, index) => (
            <li key={option.kind} className={cn(index === 0 && "col-span-2 sm:col-span-1")}>
              <button
                type="button"
                onClick={() => openQuickAdd({ kind: option.kind })}
                className="flex h-full min-h-24 w-full flex-col items-start gap-3 rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className={cn("flex size-10 items-center justify-center rounded-xl", option.tone)}>
                  <option.icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-base font-semibold">{t(option.label)}</span>
                  <span className="block text-xs text-muted-foreground">{t(option.hint)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </ResponsiveDialog>
  );
}
