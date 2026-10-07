import { AlertTriangle, CheckCircle2, OctagonAlert, Target } from "lucide-react";
import Link from "next/link";
import type { BudgetUsage } from "@/db/queries/budgets";
import { categoryLabel } from "@/lib/finance/categories";
import type { Translator } from "@/lib/i18n/translate";
import { Progress } from "@/components/ui/progress";
import { BUDGET_BAR } from "@/components/budgets/budget-state";
import { cn } from "@/lib/utils";

/** Calm summary: counts near-limit/exceeded budgets and shows the top three. */
export function BudgetWidget({ budgets, t }: { budgets: BudgetUsage[]; t: Translator }) {
  const warning = budgets.filter((b) => b.state === "WARNING").length;
  const exceeded = budgets.filter((b) => b.state === "EXCEEDED").length;
  const top = [...budgets].sort((a, b) => b.percent - a.percent).slice(0, 3);
  const message =
    budgets.length === 0
      ? t("dashboard.noBudgets")
      : exceeded > 0
        ? exceeded === 1
          ? t("dashboard.budgetExceededOne")
          : t("dashboard.budgetsExceeded", { count: exceeded })
        : warning > 0
          ? warning === 1
            ? t("dashboard.budgetNearLimitOne")
            : t("dashboard.budgetsNearLimit", { count: warning })
          : t("dashboard.budgetsOnTrack");
  const Icon = budgets.length === 0 ? Target : exceeded > 0 ? OctagonAlert : warning > 0 ? AlertTriangle : CheckCircle2;
  const tone = budgets.length === 0 ? "text-muted-foreground" : exceeded > 0 ? "text-expense" : warning > 0 ? "text-warning" : "text-income";

  return (
    <Link
      href="/budgets"
      className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-4 shadow-card transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <Target className="size-4 text-muted-foreground" aria-hidden />
        {t("dashboard.budgetSummary")}
      </span>
      <span className={cn("flex items-start gap-2 text-sm", tone)}>
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
        {message}
      </span>
      {top.length > 0 ? (
        <ul className="mt-auto space-y-2">
          {top.map((b) => (
            <li key={b.id} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="truncate">{categoryLabel(b, t)}</span>
                <span className="tabular text-muted-foreground">{b.percent}%</span>
              </div>
              <Progress value={Math.min(b.percent, 100)} className={cn("h-1.5", BUDGET_BAR[b.state])} />
            </li>
          ))}
        </ul>
      ) : (
        <span className="mt-auto text-xs font-medium text-primary">{t("dashboard.setBudget")}</span>
      )}
    </Link>
  );
}
