"use client";

import { MoreHorizontal, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteBudgetAction, saveBudgetAction } from "@/actions/budgets";
import { BUDGET_BAR, BudgetStateLabel } from "@/components/budgets/budget-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { AmountInput } from "@/components/finance/amount-input";
import { CategoryPicker, type PickerCategory } from "@/components/finance/category-picker";
import { FinanceIcon } from "@/components/finance/finance-icon";
import { Money } from "@/components/finance/money";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { BudgetUsage } from "@/db/queries/budgets";
import { categoryLabel } from "@/lib/finance/categories";
import { calculateBudgetUsage } from "@/lib/finance/rules";
import { formatCurrency, formatMonthYear } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { absMoney, addMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

function BudgetForm({
  categories,
  budget,
  currency,
  onDone,
}: {
  categories: PickerCategory[];
  budget?: BudgetUsage;
  currency: string;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? "");
  const [amount, setAmount] = useState(budget ? budget.limit.replace(/\.00$/, "") : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-4 pb-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await saveBudgetAction({ categoryId, amount });
          if (!result.ok) {
            setErrors(result.fieldErrors ?? {});
            if (!result.fieldErrors) toast.error(t(result.error as TranslationKey));
            return;
          }
          toast.success(t("budgets.saved"));
          onDone();
        });
      }}
    >
      {budget ? (
        <div className="flex items-center gap-3 rounded-xl border p-3">
          <FinanceIcon name={budget.icon} color={budget.color} size="sm" />
          <span className="font-medium">{categoryLabel(budget, t)}</span>
        </div>
      ) : (
        <div className="grid gap-1.5">
          <span id="budget-cat" className="text-sm font-medium">{t("budgets.category")}</span>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("budgets.allCategoriesBudgeted")}</p>
          ) : (
            <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} labelledBy="budget-cat" invalid={Boolean(errors.categoryId)} />
          )}
          {errors.categoryId ? <p role="alert" className="text-xs text-destructive">{t(errors.categoryId as TranslationKey)}</p> : null}
        </div>
      )}
      <Field label={t("budgets.limit")} error={errors.amount}>
        <AmountInput autoFocus={Boolean(budget)} value={amount} onChange={(e) => setAmount(e.target.value)} currency={currency} placeholder="10,000" />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  );
}

export function BudgetsView({
  budgets,
  categories,
  currency,
  monthStart,
}: {
  budgets: BudgetUsage[];
  categories: PickerCategory[];
  currency: string;
  monthStart: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState<BudgetUsage | "new" | null>(null);
  const [removing, setRemoving] = useState<BudgetUsage | null>(null);
  const [pending, startTransition] = useTransition();
  const available = categories.filter((c) => !c.isArchived && !budgets.some((b) => b.categoryId === c.id));
  const totalLimit = addMoney(...budgets.map((b) => b.limit));
  const totalSpent = addMoney(...budgets.map((b) => b.spent));
  const overall = calculateBudgetUsage(totalSpent, totalLimit);

  const done = () => {
    setEditing(null);
    setRemoving(null);
    router.refresh();
  };

  return (
    <>
      <PageHeader
        title={t("budgets.title")}
        description={`${t("budgets.description")} ${t("budgets.month", { month: formatMonthYear(monthStart, locale) })}`}
        actions={
          <Button onClick={() => setEditing("new")} disabled={available.length === 0}>
            <Plus className="size-4" aria-hidden />
            {t("budgets.add")}
          </Button>
        }
      />
      {budgets.length === 0 ? (
        <EmptyState icon={Target} title={t("budgets.emptyTitle")} description={t("budgets.emptyBody")} action={<Button onClick={() => setEditing("new")}>{t("budgets.add")}</Button>} />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">{t("budgets.totalSpent")}</p>
                  <p className="text-2xl font-semibold tracking-tight">
                    <Money value={totalSpent} currency={currency} />
                    <span className="text-base font-normal text-muted-foreground"> / <Money value={totalLimit} currency={currency} /></span>
                  </p>
                </div>
                <BudgetStateLabel state={overall.state} t={t} />
              </div>
              <Progress value={Math.min(overall.percent, 100)} className={cn("h-2", BUDGET_BAR[overall.state])} aria-label={`${overall.percent}%`} />
              <p className="text-xs text-muted-foreground">{t("budgets.onlyExpenses")}</p>
            </CardContent>
          </Card>
          <ul className="grid gap-3 md:grid-cols-2">
            {budgets.map((budget) => (
              <li key={budget.id}>
                <Card className="h-full">
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <FinanceIcon name={budget.icon} color={budget.color} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{categoryLabel(budget, t)}</p>
                        <BudgetStateLabel state={budget.state} t={t} />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`${t("common.actions")}: ${categoryLabel(budget, t)}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditing(budget)}>
                            <Pencil className="size-4" aria-hidden />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(budget)}>
                            <Trash2 className="size-4" aria-hidden />
                            {t("budgets.remove")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="tabular font-semibold">
                        {t("budgets.spentOf", { spent: formatCurrency(budget.spent, { currency }), limit: formatCurrency(budget.limit, { currency }) })}
                      </span>
                      <span className="tabular text-muted-foreground">{budget.percent}%</span>
                    </div>
                    <Progress value={Math.min(budget.percent, 100)} className={cn("h-2", BUDGET_BAR[budget.state])} aria-label={`${categoryLabel(budget, t)} ${budget.percent}%`} />
                    <p className={cn("text-xs", budget.state === "EXCEEDED" ? "text-expense" : "text-muted-foreground")}>
                      {budget.remaining.startsWith("-")
                        ? t("budgets.over", { amount: formatCurrency(absMoney(budget.remaining), { currency }) })
                        : t("budgets.remaining", { amount: formatCurrency(budget.remaining, { currency }) })}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ResponsiveDialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing === "new" ? t("budgets.add") : t("budgets.edit")}>
        {editing ? (
          <BudgetForm key={editing === "new" ? "new" : editing.id} categories={available} budget={editing === "new" ? undefined : editing} currency={currency} onDone={done} />
        ) : null}
      </ResponsiveDialog>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={t("budgets.deleteTitle")}
        description={t("budgets.deleteBody")}
        confirmLabel={t("budgets.remove")}
        pending={pending}
        onConfirm={() =>
          removing &&
          startTransition(async () => {
            const result = await deleteBudgetAction(removing.id);
            if (!result.ok) return void toast.error(t(result.error as TranslationKey));
            toast.success(t("budgets.deleted"));
            done();
          })
        }
      />
    </>
  );
}
