"use client";

import { Banknote, Check, CreditCard, Landmark, ShieldCheck, Smartphone, Sparkles, Users, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { completeOnboardingAction } from "@/actions/onboarding";
import { Logo } from "@/components/brand/logo";
import { AmountInput } from "@/components/finance/amount-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { STARTER_ACCOUNTS, type StarterAccountKey } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { parseAmountInput } from "@/lib/money";
import { cn } from "@/lib/utils";

const ICONS: Record<StarterAccountKey, typeof Wallet> = {
  cash: Banknote,
  bank: Landmark,
  bkash: Smartphone,
  nagad: Smartphone,
  rocket: Smartphone,
  card: CreditCard,
};

const TOTAL_STEPS = 4;

export function OnboardingFlow({ name }: { name: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<StarterAccountKey[]>(["cash", "bkash"]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [selectionError, setSelectionError] = useState(false);
  const [pending, startTransition] = useTransition();

  const toggle = (key: StarterAccountKey) => {
    setSelectionError(false);
    setSelected((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  };

  const invalidBalances = selected.filter((key) => {
    const raw = balances[key]?.trim();
    return raw ? parseAmountInput(raw) === null : false;
  });

  const submit = (skip: boolean) =>
    startTransition(async () => {
      const payload = skip
        ? { accounts: [] }
        : { accounts: selected.map((key) => ({ key, openingBalance: balances[key] ?? "" })) };
      const result = await completeOnboardingAction(payload);
      if (!result.ok) {
        toast.error(t(result.error as TranslationKey));
        return;
      }
      if (skip) {
        router.replace("/dashboard");
        router.refresh();
      } else {
        setStep(4);
      }
    });

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-6">
      <header className="flex items-center justify-between">
        <Logo label={t("app.name")} />
        {step < 4 ? (
          <Button variant="ghost" size="sm" onClick={() => submit(true)} disabled={pending}>
            {t("onboarding.skipForNow")}
          </Button>
        ) : null}
      </header>

      <div className="mt-6 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {t("onboarding.stepOf", { current: step, total: TOTAL_STEPS })}
        </p>
        <Progress value={(step / TOTAL_STEPS) * 100} className="h-1.5" aria-hidden />
      </div>

      <main className="flex flex-1 flex-col py-8">
        {step === 1 ? (
          <section className="flex flex-1 flex-col" aria-labelledby="ob-title">
            <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <Sparkles className="size-7" aria-hidden />
            </div>
            <h1 id="ob-title" className="text-2xl font-semibold tracking-tight">
              {t("onboarding.welcomeTitle", { name })}
            </h1>
            <p className="mt-3 text-muted-foreground">{t("onboarding.welcomeBody")}</p>
            <ul className="mt-8 space-y-4">
              {[
                { icon: Wallet, key: "onboarding.welcomePoint1" as const },
                { icon: Users, key: "onboarding.welcomePoint2" as const },
                { icon: ShieldCheck, key: "onboarding.welcomePoint3" as const },
              ].map(({ icon: Icon, key }) => (
                <li key={key} className="flex items-center gap-3 text-sm">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  {t(key)}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-10">
              <Button size="lg" className="w-full" onClick={() => setStep(2)} autoFocus>
                {t("common.continue")}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="flex flex-1 flex-col" aria-labelledby="ob-accounts">
            <h1 id="ob-accounts" className="text-2xl font-semibold tracking-tight">
              {t("onboarding.accountsTitle")}
            </h1>
            <p className="mt-2 text-muted-foreground">{t("onboarding.accountsBody")}</p>
            <div className="mt-6 grid grid-cols-2 gap-3" role="group" aria-label={t("onboarding.accountsTitle")}>
              {STARTER_ACCOUNTS.map((account) => {
                const Icon = ICONS[account.key];
                const active = selected.includes(account.key);
                return (
                  <button
                    key={account.key}
                    type="button"
                    role="checkbox"
                    aria-checked={active}
                    onClick={() => toggle(account.key)}
                    className={cn(
                      "relative flex min-h-24 flex-col items-start justify-between gap-3 rounded-2xl border bg-card p-4 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      active ? "border-primary bg-accent/60" : "hover:bg-muted/60",
                    )}
                  >
                    <Icon className={cn("size-5", active ? "text-primary" : "text-muted-foreground")} aria-hidden />
                    <span className="text-sm font-medium">{t(`starterAccounts.${account.key}`)}</span>
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-3 right-3 flex size-5 items-center justify-center rounded-full border",
                        active ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {active ? <Check className="size-3" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectionError ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {t("onboarding.selectAtLeastOne")}
              </p>
            ) : null}
            <div className="mt-auto flex gap-3 pt-10">
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(1)}>
                {t("common.back")}
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={() => (selected.length === 0 ? setSelectionError(true) : setStep(3))}
              >
                {t("common.continue")}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="flex flex-1 flex-col" aria-labelledby="ob-balances">
            <h1 id="ob-balances" className="text-2xl font-semibold tracking-tight">
              {t("onboarding.balancesTitle")}
            </h1>
            <p className="mt-2 text-muted-foreground">{t("onboarding.balancesBody")}</p>
            <div className="mt-6 space-y-4">
              {STARTER_ACCOUNTS.filter((a) => selected.includes(a.key)).map((account) => {
                const Icon = ICONS[account.key];
                const invalid = invalidBalances.includes(account.key);
                return (
                  <div key={account.key} className="grid gap-1.5">
                    <Label htmlFor={`balance-${account.key}`} className="flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" aria-hidden />
                      {t(`starterAccounts.${account.key}`)}
                    </Label>
                    <AmountInput
                      id={`balance-${account.key}`}
                      placeholder="0"
                      value={balances[account.key] ?? ""}
                      aria-invalid={invalid || undefined}
                      aria-describedby={invalid ? `balance-${account.key}-error` : undefined}
                      onChange={(e) => setBalances((b) => ({ ...b, [account.key]: e.target.value }))}
                    />
                    {invalid ? (
                      <p id={`balance-${account.key}-error`} role="alert" className="text-xs text-destructive">
                        {t("validation.amountInvalid")}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="mt-auto flex gap-3 pt-10">
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(2)} disabled={pending}>
                {t("common.back")}
              </Button>
              <Button size="lg" className="flex-1" disabled={pending || invalidBalances.length > 0} onClick={() => submit(false)}>
                {pending ? t("common.saving") : t("common.continue")}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="flex flex-1 flex-col items-center justify-center text-center" aria-labelledby="ob-finish">
            <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-income-soft text-income">
              <Check className="size-8" aria-hidden />
            </div>
            <h1 id="ob-finish" className="text-2xl font-semibold tracking-tight">
              {t("onboarding.finishTitle")}
            </h1>
            <p className="mt-3 max-w-sm text-muted-foreground">{t("onboarding.finishBody")}</p>
            <Button
              size="lg"
              className="mt-10 w-full"
              autoFocus
              onClick={() => {
                router.replace("/dashboard");
                router.refresh();
              }}
            >
              {t("onboarding.getStarted")}
            </Button>
          </section>
        ) : null}
      </main>
    </div>
  );
}
