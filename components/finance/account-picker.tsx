"use client";

import { FinanceIcon } from "@/components/finance/finance-icon";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export type PickerAccount = {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  balance: string;
  isArchived: boolean;
};

/** Horizontal chips with live balances; archived accounts only appear if already selected. */
export function AccountPicker({
  accounts,
  value,
  onChange,
  disabledId,
  invalid,
  describedBy,
  labelledBy,
  currency,
  hideAmounts,
}: {
  accounts: PickerAccount[];
  value: string;
  onChange: (id: string) => void;
  disabledId?: string;
  invalid?: boolean;
  describedBy?: string;
  labelledBy?: string;
  currency?: string;
  hideAmounts?: boolean;
}) {
  const { t } = useI18n();
  const visible = accounts.filter((a) => !a.isArchived || a.id === value);
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-0.5 pb-1 [scrollbar-width:none]"
    >
      {visible.map((account) => {
        const selected = account.id === value;
        const disabled = account.id === disabledId;
        return (
          <button
            key={account.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(account.id)}
            className={cn(
              "flex min-h-14 shrink-0 items-center gap-2.5 rounded-xl border bg-card py-2 pr-3.5 pl-2.5 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-40",
              selected ? "border-primary bg-accent/70" : "hover:bg-muted/60",
              invalid && !value && "border-destructive/50",
            )}
          >
            <FinanceIcon name={account.icon} color={selected ? "emerald" : "slate"} size="sm" />
            <span className="min-w-0">
              <span className="block max-w-36 truncate text-sm font-medium">{account.name}</span>
              <span className="tabular block text-xs text-muted-foreground">
                {account.isArchived
                  ? t("form.archivedAccount")
                  : hideAmounts
                    ? "••••"
                    : formatCurrency(account.balance, { currency })}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
