import { ArrowLeftRight, SlidersHorizontal } from "lucide-react";
import { FinanceIcon } from "@/components/finance/finance-icon";
import { amountPresentation, TONE_SOFT } from "@/lib/finance/display";
import { isLedgerType } from "@/lib/finance/rules";
import { cn } from "@/lib/utils";

export type { DisplayTransaction } from "@/lib/finance/labels";
import type { DisplayTransaction } from "@/lib/finance/labels";

export { transactionPrimaryLabel, transactionSecondaryLabel } from "@/lib/finance/labels";

export function TransactionIcon({ tx, className }: { tx: DisplayTransaction; className?: string }) {
  if (isLedgerType(tx.type)) {
    const { tone } = amountPresentation(tx);
    return (
      <span
        aria-hidden
        className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold", TONE_SOFT[tone], className)}
      >
        {tx.contact?.avatarInitial ?? "?"}
      </span>
    );
  }
  if (tx.type === "TRANSFER" || tx.type === "ADJUSTMENT") {
    const Icon = tx.type === "TRANSFER" ? ArrowLeftRight : SlidersHorizontal;
    return (
      <span aria-hidden className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-xl", TONE_SOFT.neutral, className)}>
        <Icon className="size-[18px]" />
      </span>
    );
  }
  return <FinanceIcon name={tx.category?.icon} color={tx.category?.color} className={className} />;
}
