"use client";

import { ArrowLeft, ArrowRightLeft, ChevronDown, Loader2 } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { createTransactionAction, updateTransactionAction, type EntryOptions, type SavedTransaction } from "@/actions/transactions";
import { AccountPicker } from "@/components/finance/account-picker";
import { AmountInput } from "@/components/finance/amount-input";
import { CategoryPicker } from "@/components/finance/category-picker";
import { DateField } from "@/components/finance/date-field";
import { ReceiptField, type ExistingAttachment } from "@/components/finance/receipt-field";
import { Field } from "@/components/forms/field";
import { ContactPicker, type PickerContact } from "@/components/ledger/contact-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ATTACHMENT_MAX_MB } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import type { TransactionType } from "@/lib/finance/rules";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import { schemaForType } from "@/lib/validation/transaction";

export type FormKind = Exclude<TransactionType, "ADJUSTMENT">;

export type TransactionFormValues = {
  type: FormKind;
  amount: string;
  accountId: string;
  destinationAccountId: string;
  categoryId: string;
  contactId: string;
  transactionDate: string;
  dueDate: string;
  title: string;
  note: string;
  tags: string;
  affectsAccount: boolean;
};

type Props = {
  options: EntryOptions;
  kind: FormKind;
  /** Present when editing an existing transaction. */
  transactionId?: string;
  initial?: Partial<TransactionFormValues>;
  existingAttachment?: ExistingAttachment | null;
  onBack?: () => void;
  onSaved?: (saved: SavedTransaction) => void;
  className?: string;
};

const LEDGER_KINDS: FormKind[] = ["LEND", "BORROW", "DEBT_RECEIVED", "DEBT_PAID"];

function isLedgerKind(kind: FormKind) {
  return LEDGER_KINDS.includes(kind);
}

function defaultAccountId(options: EntryOptions): string {
  const active = options.accounts.filter((a) => !a.isArchived);
  return active.find((a) => a.id === options.lastUsedAccountId)?.id ?? active[0]?.id ?? "";
}

export function TransactionForm({
  options,
  kind,
  transactionId,
  initial,
  existingAttachment,
  onBack,
  onSaved,
  className,
}: Props) {
  const { t } = useI18n();
  const ids = { base: useId() };
  const isEdit = Boolean(transactionId);
  const [contacts, setContacts] = useState<PickerContact[]>(options.contacts);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [showMore, setShowMore] = useState(Boolean(initial?.title || initial?.tags));
  const [formError, setFormError] = useState<string | null>(null);

  const startAccount = defaultAccountId(options);
  const form = useForm<TransactionFormValues>({
    defaultValues: {
      type: kind,
      amount: "",
      accountId: startAccount,
      destinationAccountId: options.accounts.find((a) => !a.isArchived && a.id !== startAccount)?.id ?? "",
      categoryId: "",
      contactId: "",
      transactionDate: options.today,
      dueDate: "",
      title: "",
      note: "",
      tags: "",
      affectsAccount: true,
      ...initial,
    },
  });
  const { errors, isSubmitting } = form.formState;
  const type = useWatch({ control: form.control, name: "type" });
  const accountId = useWatch({ control: form.control, name: "accountId" });
  const affectsAccount = useWatch({ control: form.control, name: "affectsAccount" });
  const ledger = isLedgerKind(type);

  const categories = useMemo(
    () => options.categories.filter((c) => c.kind === (type === "INCOME" ? "INCOME" : "EXPENSE")),
    [options.categories, type],
  );
  const hasAccounts = options.accounts.some((a) => !a.isArchived);
  const fieldId = (name: string) => `${ids.base}-${name}`;

  const switchType = (next: FormKind) => {
    if (next === type) return;
    form.setValue("type", next);
    if ((next === "INCOME") !== (type === "INCOME")) form.setValue("categoryId", "");
    form.clearErrors();
  };

  async function onSubmit(values: TransactionFormValues) {
    setFormError(null);
    form.clearErrors();
    const payload = {
      ...values,
      affectsAccount: values.affectsAccount ? "true" : "false",
    };
    const schema = schemaForType(values.type);
    const parsed = schema?.safeParse(payload);
    if (!parsed || !parsed.success) {
      for (const issue of parsed?.error.issues ?? []) {
        const name = issue.path[0] as keyof TransactionFormValues | undefined;
        if (name) form.setError(name, { message: issue.message });
      }
      return;
    }

    const formData = new FormData();
    for (const [key, value] of Object.entries(payload)) formData.set(key, String(value));
    if (receipt) formData.set("receipt", receipt);
    if (removeReceipt) formData.set("removeReceipt", "1");

    const result = transactionId
      ? await updateTransactionAction(transactionId, formData)
      : await createTransactionAction(formData);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [name, message] of Object.entries(result.fieldErrors)) {
          if (name === "receipt") setFormError(message);
          else form.setError(name as keyof TransactionFormValues, { message });
        }
      }
      if (!result.fieldErrors || Object.keys(result.fieldErrors).length === 0) setFormError(result.error);
      return;
    }

    const contactName = contacts.find((c) => c.id === values.contactId)?.name ?? "";
    toast.success(
      isEdit
        ? t("form.updated")
        : t(`form.saved${result.data.type}` as TranslationKey, {
            amount: formatCurrency(result.data.amount, { currency: options.currency }),
            name: contactName,
          }),
    );
    onSaved?.(result.data);
  }

  if (!hasAccounts && (!ledger || affectsAccount)) {
    return (
      <div className="space-y-4 py-4 text-center">
        <p className="text-sm text-muted-foreground">{t("form.noAccounts")}</p>
        <Button asChild>
          <Link href="/accounts?new=1">{t("form.addAccount")}</Link>
        </Button>
        {ledger ? (
          <Button variant="ghost" className="w-full" onClick={() => form.setValue("affectsAccount", false)}>
            {t("form.affectsAccount")}: {t("common.no")}
          </Button>
        ) : null}
      </div>
    );
  }

  const titleKey: TranslationKey = `transactionTypes.${type}`;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className={cn("flex flex-col gap-5", className)}>
      {onBack || !isEdit ? (
        <div className="flex items-center gap-2 pt-1">
          {onBack ? (
            <Button type="button" variant="ghost" size="icon-sm" onClick={onBack} aria-label={t("common.back")}>
              <ArrowLeft className="size-4" />
            </Button>
          ) : null}
          <h2 className="text-lg font-semibold">{t(titleKey)}</h2>
        </div>
      ) : null}

      {type === "EXPENSE" || type === "INCOME" ? (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label={t("form.entryType")}>
          {(["EXPENSE", "INCOME"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={type === option}
              onClick={() => switchType(option)}
              className={cn(
                "h-9 rounded-lg text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                type === option
                  ? option === "EXPENSE"
                    ? "bg-card text-expense shadow-sm"
                    : "bg-card text-income shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {option === "EXPENSE" ? t("form.switchExpense") : t("form.switchIncome")}
            </button>
          ))}
        </div>
      ) : null}

      {ledger ? (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("form.entryType")}>
          {LEDGER_KINDS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={type === option}
              onClick={() => switchType(option)}
              className={cn(
                "h-11 rounded-xl border text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                type === option
                  ? option === "LEND" || option === "DEBT_PAID"
                    ? "border-receivable bg-receivable-soft text-receivable"
                    : "border-payable bg-payable-soft text-payable"
                  : "bg-card text-muted-foreground hover:bg-muted/60",
              )}
            >
              {t(`transactionTypes.${option}`)}
            </button>
          ))}
        </div>
      ) : null}

      <Field label={t("form.amount")} error={errors.amount?.message}>
        <AmountInput
          variant="xl"
          placeholder="0"
          autoFocus={!isEdit}
          currency={options.currency}
          {...form.register("amount")}
        />
      </Field>

      {ledger ? (
        <Field label={t("form.person")} error={errors.contactId?.message}>
          <Controller
            control={form.control}
            name="contactId"
            render={({ field }) => (
              <ContactPicker
                id={fieldId("contact")}
                contacts={contacts}
                value={field.value}
                onChange={(id) => {
                  field.onChange(id);
                  form.clearErrors("contactId");
                }}
                onCreated={(contact) => setContacts((list) => [...list, contact].sort((a, b) => a.name.localeCompare(b.name)))}
                invalid={Boolean(errors.contactId)}
              />
            )}
          />
        </Field>
      ) : null}

      {type === "EXPENSE" || type === "INCOME" ? (
        <div className="grid gap-1.5">
          <span id={fieldId("category-label")} className="text-sm font-medium">
            {t("form.category")}
          </span>
          <Controller
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <CategoryPicker
                categories={categories}
                value={field.value}
                onChange={(id) => {
                  field.onChange(id);
                  form.clearErrors("categoryId");
                }}
                labelledBy={fieldId("category-label")}
                invalid={Boolean(errors.categoryId)}
                describedBy={errors.categoryId ? fieldId("category-error") : undefined}
              />
            )}
          />
          {errors.categoryId?.message ? (
            <p id={fieldId("category-error")} role="alert" className="text-xs font-medium text-destructive">
              {t(errors.categoryId.message as TranslationKey)}
            </p>
          ) : null}
        </div>
      ) : null}

      {ledger ? (
        <Controller
          control={form.control}
          name="affectsAccount"
          render={({ field }) => (
            <div className="flex items-start justify-between gap-4 rounded-xl border bg-card p-3">
              <label htmlFor={fieldId("affects")} className="space-y-0.5">
                <span className="block text-sm font-medium">{t("form.affectsAccount")}</span>
                <span className="block text-xs text-muted-foreground">{t("form.affectsAccountHint")}</span>
              </label>
              <Switch id={fieldId("affects")} checked={field.value} onCheckedChange={field.onChange} />
            </div>
          )}
        />
      ) : null}

      {!ledger || affectsAccount ? (
        <div className="grid gap-1.5">
          <span id={fieldId("account-label")} className="text-sm font-medium">
            {type === "TRANSFER" ? t("form.fromAccount") : t("form.account")}
          </span>
          <Controller
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <AccountPicker
                accounts={options.accounts}
                value={field.value}
                onChange={(id) => {
                  field.onChange(id);
                  form.clearErrors("accountId");
                  if (type === "TRANSFER" && form.getValues("destinationAccountId") === id) {
                    form.setValue("destinationAccountId", options.accounts.find((a) => !a.isArchived && a.id !== id)?.id ?? "");
                  }
                }}
                labelledBy={fieldId("account-label")}
                invalid={Boolean(errors.accountId)}
                currency={options.currency}
              />
            )}
          />
          {errors.accountId?.message ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {t(errors.accountId.message as TranslationKey)}
            </p>
          ) : null}
        </div>
      ) : null}

      {type === "TRANSFER" ? (
        <div className="grid gap-1.5">
          <span id={fieldId("dest-label")} className="flex items-center gap-1.5 text-sm font-medium">
            <ArrowRightLeft className="size-3.5 text-muted-foreground" aria-hidden />
            {t("form.toAccount")}
          </span>
          <Controller
            control={form.control}
            name="destinationAccountId"
            render={({ field }) => (
              <AccountPicker
                accounts={options.accounts}
                value={field.value}
                disabledId={accountId}
                onChange={(id) => {
                  field.onChange(id);
                  form.clearErrors("destinationAccountId");
                }}
                labelledBy={fieldId("dest-label")}
                invalid={Boolean(errors.destinationAccountId)}
                currency={options.currency}
              />
            )}
          />
          {errors.destinationAccountId?.message ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {t(errors.destinationAccountId.message as TranslationKey)}
            </p>
          ) : null}
        </div>
      ) : null}

      <Field label={t("form.date")} error={errors.transactionDate?.message}>
        <Controller
          control={form.control}
          name="transactionDate"
          render={({ field }) => (
            <DateField value={field.value} onChange={field.onChange} today={options.today} ref={field.ref} />
          )}
        />
      </Field>

      {type === "LEND" || type === "BORROW" ? (
        <Field label={t("form.dueDate")} optional hint={t("form.dueDateHint")} error={errors.dueDate?.message}>
          <Controller
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <DateField value={field.value} onChange={field.onChange} today={options.today} quickPicks={false} ref={field.ref} />
            )}
          />
        </Field>
      ) : null}

      <Field label={t("form.note")} optional error={errors.note?.message}>
        <Textarea rows={2} placeholder={t("form.notePlaceholder")} className="min-h-11 resize-none" {...form.register("note")} />
      </Field>

      <Field label={type === "EXPENSE" || type === "INCOME" ? t("form.receipt") : t("form.attachment")} optional>
        <ReceiptField
          id={fieldId("receipt")}
          file={receipt}
          onFileChange={(file) => {
            setReceipt(file);
            setFormError(null);
          }}
          existing={existingAttachment}
          removeExisting={removeReceipt}
          onRemoveExistingChange={setRemoveReceipt}
        />
      </Field>

      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ChevronDown className={cn("size-4 transition-transform", showMore && "rotate-180")} aria-hidden />
          {showMore ? t("form.fewerDetails") : t("form.moreDetails")}
        </button>
        {showMore ? (
          <div className="space-y-4">
            <Field label={t("form.title")} optional error={errors.title?.message}>
              <Input
                placeholder={
                  type === "EXPENSE"
                    ? t("form.titlePlaceholderExpense")
                    : type === "INCOME"
                      ? t("form.titlePlaceholderIncome")
                      : t("form.titlePlaceholderOther")
                }
                {...form.register("title")}
              />
            </Field>
            <Field label={t("form.tags")} optional hint={t("form.tagsHint")} error={errors.tags?.message}>
              <Input placeholder={t("form.tagsPlaceholder")} {...form.register("tags")} />
            </Field>
          </div>
        ) : null}
      </div>

      {formError ? (
        <p role="alert" className="rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {t(formError as TranslationKey, { size: ATTACHMENT_MAX_MB })}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-4 mt-1 border-t bg-popover/95 px-4 pt-3 pb-1 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {isSubmitting ? t("common.saving") : isEdit ? t("form.saveChanges") : t("form.save")}
        </Button>
      </div>
    </form>
  );
}
