"use client";

import { CalendarClock, Check, MoreHorizontal, Pause, Pencil, Play, Plus, Repeat, SkipForward, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createRuleAction, deleteRuleAction, resolveOccurrenceAction, setRuleActiveAction, updateRuleAction } from "@/actions/recurring";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { AccountPicker, type PickerAccount } from "@/components/finance/account-picker";
import { AmountInput } from "@/components/finance/amount-input";
import { CategoryPicker, type PickerCategory } from "@/components/finance/category-picker";
import { FinanceIcon } from "@/components/finance/finance-icon";
import { Money } from "@/components/finance/money";
import { Field } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { invalidateEntryOptions } from "@/hooks/use-entry-options";
import type { RuleRow } from "@/db/queries/recurring";
import { categoryLabel } from "@/lib/finance/categories";
import { formatCurrency, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

type Category = PickerCategory & { kind: string };
const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;

function RuleForm({
  rule,
  accounts,
  categories,
  currency,
  today,
  onDone,
}: {
  rule?: RuleRow;
  accounts: PickerAccount[];
  categories: Category[];
  currency: string;
  today: string;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [values, setValues] = useState({
    type: (rule?.type ?? "EXPENSE") as "EXPENSE" | "INCOME",
    title: rule?.title ?? "",
    amount: rule ? rule.amount.replace(/\.00$/, "") : "",
    categoryId: rule?.categoryId ?? "",
    accountId: rule?.accountId ?? accounts.find((a) => !a.isArchived)?.id ?? "",
    frequency: (rule?.frequency ?? "MONTHLY") as (typeof FREQUENCIES)[number],
    startDate: rule?.startDate ?? today,
    endDate: rule?.endDate ?? "",
    note: rule?.note ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => setValues((v) => ({ ...v, [key]: value }));
  const err = (k: string) => errors[k] ?? errors[`data.${k}`];

  return (
    <form
      className="space-y-4 pb-2"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = rule ? await updateRuleAction(rule.id, values) : await createRuleAction(values);
          if (!result.ok) {
            setErrors(result.fieldErrors ?? {});
            if (!result.fieldErrors) toast.error(t(result.error as TranslationKey));
            return;
          }
          toast.success(t("recurring.saved"));
          onDone();
        });
      }}
    >
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label={t("recurring.type")}>
        {(["EXPENSE", "INCOME"] as const).map((type) => (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={values.type === type}
            onClick={() => setValues((v) => ({ ...v, type, categoryId: "" }))}
            className={cn("h-9 rounded-lg text-sm font-medium", values.type === type ? "bg-card shadow-sm" : "text-muted-foreground")}
          >
            {t(`transactionTypes.${type}`)}
          </button>
        ))}
      </div>
      <Field label={t("form.title")} error={err("title")}>
        <Input value={values.title} onChange={(e) => set("title", e.target.value)} placeholder={t("recurring.titlePlaceholder")} />
      </Field>
      <Field label={t("form.amount")} error={err("amount")}>
        <AmountInput value={values.amount} onChange={(e) => set("amount", e.target.value)} currency={currency} />
      </Field>
      <div className="grid gap-1.5">
        <span id="rr-cat" className="text-sm font-medium">{t("form.category")}</span>
        <CategoryPicker
          categories={categories.filter((c) => c.kind === values.type)}
          value={values.categoryId}
          onChange={(id) => set("categoryId", id)}
          labelledBy="rr-cat"
          invalid={Boolean(err("categoryId"))}
        />
        {err("categoryId") ? <p role="alert" className="text-xs text-destructive">{t(err("categoryId") as TranslationKey)}</p> : null}
      </div>
      <div className="grid gap-1.5">
        <span id="rr-acc" className="text-sm font-medium">{t("form.account")}</span>
        <AccountPicker accounts={accounts} value={values.accountId} onChange={(id) => set("accountId", id)} labelledBy="rr-acc" currency={currency} />
        {err("accountId") ? <p role="alert" className="text-xs text-destructive">{t(err("accountId") as TranslationKey)}</p> : null}
      </div>
      <Field label={t("recurring.frequency")}>
        <Select value={values.frequency} onValueChange={(v) => set("frequency", v as (typeof FREQUENCIES)[number])}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCIES.map((f) => (
              <SelectItem key={f} value={f}>{t(`recurring.${f}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("recurring.startDate")} error={err("startDate")}>
          <Input type="date" value={values.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label={t("recurring.endDate")} optional error={err("endDate")}>
          <Input type="date" value={values.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </Field>
      </div>
      <Field label={t("form.note")} optional>
        <Input value={values.note} onChange={(e) => set("note", e.target.value)} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  );
}

export function RecurringView({
  rules,
  upcoming,
  accounts,
  categories,
  currency,
  today,
}: {
  rules: RuleRow[];
  upcoming: RuleRow[];
  accounts: PickerAccount[];
  categories: Category[];
  currency: string;
  today: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState<RuleRow | "new" | null>(null);
  const [removing, setRemoving] = useState<RuleRow | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = () => {
    invalidateEntryOptions();
    setEditing(null);
    setRemoving(null);
    router.refresh();
  };

  const resolve = (rule: RuleRow, mode: "confirm" | "skip") =>
    startTransition(async () => {
      if (!rule.nextOccurrence) return;
      const result = await resolveOccurrenceAction(rule.id, rule.nextOccurrence, mode);
      if (!result.ok) return void toast.error(t(result.error as TranslationKey));
      toast.success(mode === "confirm" ? t("recurring.confirmed", { amount: formatCurrency(result.data.amount, { currency }) }) : t("recurring.skipped"));
      refresh();
    });

  const label = (rule: RuleRow) => categoryLabel({ name: rule.categoryName, systemKey: rule.categoryKey }, t);

  return (
    <>
      <PageHeader
        title={t("recurring.title")}
        description={t("recurring.description")}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden />
            {t("recurring.add")}
          </Button>
        }
      />
      {rules.length === 0 ? (
        <EmptyState icon={Repeat} title={t("recurring.emptyTitle")} description={t("recurring.emptyBody")} action={<Button onClick={() => setEditing("new")}>{t("recurring.add")}</Button>} />
      ) : (
        <div className="space-y-6">
          <section aria-labelledby="upcoming-title" className="space-y-3">
            <div>
              <h2 id="upcoming-title" className="text-base font-semibold">{t("recurring.upcoming")}</h2>
              <p className="text-xs text-muted-foreground">{t("recurring.upcomingHint")}</p>
            </div>
            {upcoming.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("recurring.noUpcoming")}</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((rule) => {
                  const overdue = rule.nextOccurrence! < today;
                  const dueToday = rule.nextOccurrence === today;
                  return (
                    <li key={rule.id}>
                      <Card size="sm">
                        <CardContent className="flex flex-wrap items-center gap-3">
                          <FinanceIcon name={rule.categoryIcon} color={rule.categoryColor} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{rule.title}</p>
                            <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              <CalendarClock className="size-3" aria-hidden />
                              {formatDate(rule.nextOccurrence!, locale)}
                              {overdue ? <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">{t("recurring.overdue")}</Badge> : null}
                              {dueToday ? <Badge className="h-4 px-1.5 text-[10px]">{t("recurring.dueToday")}</Badge> : null}
                            </p>
                          </div>
                          <Money value={rule.amount} sign={rule.type === "INCOME" ? "+" : "−"} tone={rule.type === "INCOME" ? "income" : "expense"} currency={currency} className="font-semibold" />
                          <div className="flex w-full gap-2 sm:w-auto">
                            <Button size="sm" className="flex-1" disabled={pending} onClick={() => resolve(rule, "confirm")}>
                              <Check className="size-4" aria-hidden />
                              {t("recurring.confirm")}
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1" disabled={pending} onClick={() => resolve(rule, "skip")}>
                              <SkipForward className="size-4" aria-hidden />
                              {t("recurring.skip")}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="rules-title" className="space-y-3">
            <h2 id="rules-title" className="text-base font-semibold">{t("recurring.rules")}</h2>
            <ul className="divide-y rounded-2xl border bg-card shadow-card">
              {rules.map((rule) => (
                <li key={rule.id} className={cn("flex items-center gap-3 p-3.5", !rule.isActive && "opacity-60")}>
                  <FinanceIcon name={rule.categoryIcon} color={rule.categoryColor} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{rule.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t(`recurring.${rule.frequency}`)} · {label(rule)} · {rule.accountName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {!rule.isActive ? t("recurring.paused") : rule.nextOccurrence ? t("recurring.nextOccurrence", { date: formatDate(rule.nextOccurrence, locale) }) : t("recurring.ended")}
                    </p>
                  </div>
                  <Money value={rule.amount} currency={currency} className="text-sm font-semibold" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`${t("common.actions")}: ${rule.title}`}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditing(rule)}>
                        <Pencil className="size-4" aria-hidden />
                        {t("common.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() =>
                          startTransition(async () => {
                            const result = await setRuleActiveAction(rule.id, !rule.isActive);
                            if (!result.ok) return void toast.error(t(result.error as TranslationKey));
                            refresh();
                          })
                        }
                      >
                        {rule.isActive ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
                        {rule.isActive ? t("recurring.pause") : t("recurring.resume")}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(rule)}>
                        <Trash2 className="size-4" aria-hidden />
                        {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <ResponsiveDialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing === "new" ? t("recurring.add") : t("recurring.edit")}>
        {editing ? (
          <RuleForm key={editing === "new" ? "new" : editing.id} rule={editing === "new" ? undefined : editing} accounts={accounts} categories={categories} currency={currency} today={today} onDone={refresh} />
        ) : null}
      </ResponsiveDialog>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={t("recurring.deleteTitle")}
        description={t("recurring.deleteBody")}
        pending={pending}
        onConfirm={() =>
          removing &&
          startTransition(async () => {
            const result = await deleteRuleAction(removing.id);
            if (!result.ok) return void toast.error(t(result.error as TranslationKey));
            toast.success(t("recurring.deleted"));
            refresh();
          })
        }
      />
    </>
  );
}
