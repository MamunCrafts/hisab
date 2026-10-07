import { AlertTriangle, CheckCircle2, OctagonAlert } from "lucide-react";
import type { BudgetState } from "@/lib/finance/rules";
import type { Translator } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

export const BUDGET_BAR: Record<BudgetState, string> = {
  NORMAL: "[&>[data-slot=progress-indicator]]:bg-income",
  WARNING: "[&>[data-slot=progress-indicator]]:bg-warning",
  EXCEEDED: "[&>[data-slot=progress-indicator]]:bg-expense",
};

export function BudgetStateLabel({ state, t, className }: { state: BudgetState; t: Translator; className?: string }) {
  const config = {
    NORMAL: { icon: CheckCircle2, text: t("budgets.normal"), cls: "text-income" },
    WARNING: { icon: AlertTriangle, text: t("budgets.warning"), cls: "text-warning" },
    EXCEEDED: { icon: OctagonAlert, text: t("budgets.exceeded"), cls: "text-expense" },
  }[state];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", config.cls, className)}>
      <config.icon className="size-3.5" aria-hidden />
      {config.text}
    </span>
  );
}
