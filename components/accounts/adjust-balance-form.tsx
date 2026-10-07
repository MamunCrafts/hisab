"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { adjustBalanceAction } from "@/actions/accounts";
import { AmountInput } from "@/components/finance/amount-input";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { parseAmountInput, subtractMoney } from "@/lib/money";

export function AdjustBalanceForm({
  account,
  currency,
  today,
  onSaved,
}: {
  account: { id: string; balance: string };
  currency: string;
  today: string;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const negative = value.trim().startsWith("-");
  const parsed = parseAmountInput(negative ? value.trim().slice(1) : value);
  const actual = parsed ? (negative ? `-${parsed}` : parsed) : null;
  const difference = actual ? subtractMoney(actual, account.balance) : null;

  return (
    <form
      className="space-y-4 pb-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await adjustBalanceAction({ accountId: account.id, actualBalance: value, transactionDate: today });
          if (!result.ok) {
            setError(result.fieldErrors?.actualBalance ?? result.error);
            return;
          }
          toast.success(t("accounts.adjusted"));
          onSaved();
        });
      }}
    >
      <p className="text-sm text-muted-foreground">{t("accounts.adjustBody")}</p>
      <p className="text-sm">{t("accounts.currentBalance", { amount: formatCurrency(account.balance, { currency }) })}</p>
      <Field label={t("accounts.actualBalance")} error={error ?? undefined}>
        <AmountInput
          autoFocus
          inputMode="text"
          currency={currency}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
        />
      </Field>
      {difference ? (
        <p className="text-sm font-medium" aria-live="polite">
          {t("accounts.difference", { amount: formatCurrency(difference, { currency, signed: true }) })}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending || !actual}>
        {pending ? t("common.saving") : t("accounts.adjust")}
      </Button>
      {error && !error.startsWith("accounts.") && !error.startsWith("validation.") ? (
        <p role="alert" className="text-sm text-destructive">{t(error as TranslationKey)}</p>
      ) : null}
    </form>
  );
}
