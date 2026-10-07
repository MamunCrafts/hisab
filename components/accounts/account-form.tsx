"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createAccountAction, updateAccountAction } from "@/actions/accounts";
import { AmountInput } from "@/components/finance/amount-input";
import { FinanceIcon, FINANCE_ICONS } from "@/components/finance/finance-icon";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import { ACCOUNT_TYPES, accountSchema, DEFAULT_ACCOUNT_ICON, type AccountInput } from "@/lib/validation/account";

const ACCOUNT_ICONS = ["banknote", "landmark", "smartphone", "credit-card", "piggy-bank", "wallet", "briefcase", "home"].filter(
  (name) => name in FINANCE_ICONS,
);

type FormValues = { name: string; type: (typeof ACCOUNT_TYPES)[number]; openingBalance: string; icon: string };

export function AccountForm({
  account,
  currency,
  onSaved,
}: {
  account?: { id: string; name: string; type: FormValues["type"]; openingBalance: string; icon: string | null };
  currency: string;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const form = useForm<FormValues, unknown, AccountInput>({
    resolver: zodResolver(accountSchema) as never,
    defaultValues: {
      name: account?.name ?? "",
      type: account?.type ?? "CASH",
      openingBalance: account ? account.openingBalance.replace(/\.00$/, "") : "",
      icon: account?.icon ?? DEFAULT_ACCOUNT_ICON[account?.type ?? "CASH"],
    },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit() {
    const values = form.getValues();
    const result = account ? await updateAccountAction(account.id, values) : await createAccountAction(values);
    if (!result.ok) {
      for (const [name, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(name as keyof FormValues, { message });
      }
      if (!result.fieldErrors) toast.error(t(result.error as TranslationKey));
      return;
    }
    toast.success(account ? t("accounts.updated") : t("accounts.created"));
    onSaved();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4 pb-2">
      <Field label={t("accounts.name")} error={errors.name?.message}>
        <Input autoFocus placeholder={t("accounts.namePlaceholder")} {...form.register("name")} />
      </Field>
      <Field label={t("accounts.type")} error={errors.type?.message}>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => {
                const previousDefault = DEFAULT_ACCOUNT_ICON[field.value];
                field.onChange(value);
                if (form.getValues("icon") === previousDefault) {
                  form.setValue("icon", DEFAULT_ACCOUNT_ICON[value as FormValues["type"]]);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`accountTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <Field label={t("accounts.openingBalance")} hint={t("accounts.openingBalanceHint")} error={errors.openingBalance?.message}>
        <AmountInput placeholder="0" currency={currency} inputMode="text" {...form.register("openingBalance")} />
      </Field>
      <div className="grid gap-1.5">
        <span className="text-sm font-medium" id="account-icon-label">
          {t("accounts.icon")}
        </span>
        <Controller
          control={form.control}
          name="icon"
          render={({ field }) => (
            <div role="radiogroup" aria-labelledby="account-icon-label" className="flex flex-wrap gap-2">
              {ACCOUNT_ICONS.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={field.value === name}
                  aria-label={name}
                  onClick={() => field.onChange(name)}
                  className={cn(
                    "rounded-xl p-0.5 ring-2 ring-transparent focus-visible:ring-ring focus-visible:outline-none",
                    field.value === name && "ring-primary",
                  )}
                >
                  <FinanceIcon name={name} color={field.value === name ? "emerald" : "slate"} />
                </button>
              ))}
            </div>
          )}
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  );
}
