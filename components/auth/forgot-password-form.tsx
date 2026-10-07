"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: ForgotPasswordInput) {
    setRateLimited(false);
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: "/reset-password",
    });
    if (error?.status === 429) {
      setRateLimited(true);
      return;
    }
    // Same response whether or not the email exists.
    setSent(true);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.forgotTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("auth.forgotSubtitle")}</p>
      </div>
      {sent ? (
        <FormAlert tone="success">{t("auth.resetLinkSent")}</FormAlert>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {rateLimited ? <FormAlert>{t("auth.tooManyAttempts" as TranslationKey)}</FormAlert> : null}
          <Field label={t("auth.email")} error={errors.email?.message}>
            <Input type="email" autoComplete="email" inputMode="email" autoFocus {...form.register("email")} />
          </Field>
          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
          </Button>
        </form>
      )}
      <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden />
        {t("auth.backToLogin")}
      </Link>
    </div>
  );
}
