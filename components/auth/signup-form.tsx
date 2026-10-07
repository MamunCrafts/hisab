"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";
import { authErrorKey } from "./auth-error";

export function SignupForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", agree: false },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: SignupInput) {
    setFormError(null);
    const { error } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
    });
    if (error) {
      const key = authErrorKey(error);
      if (key === "auth.emailTaken") form.setError("email", { message: key });
      else setFormError(key);
      return;
    }
    router.replace("/onboarding");
    router.refresh();
  }

  const termsLabel = t("auth.agreeTerms", { terms: "§T§", privacy: "§P§" }).split(/(§T§|§P§)/);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.signupTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("auth.signupSubtitle")}</p>
      </div>

      {formError ? <FormAlert>{t(formError as TranslationKey)}</FormAlert> : null}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label={t("auth.fullName")} error={errors.name?.message}>
          <Input autoComplete="name" autoFocus placeholder={t("auth.fullNamePlaceholder")} {...form.register("name")} />
        </Field>
        <Field label={t("auth.email")} error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t("auth.emailPlaceholder")}
            {...form.register("email")}
          />
        </Field>
        <Field label={t("auth.password")} error={errors.password?.message}>
          <PasswordInput autoComplete="new-password" placeholder={t("auth.passwordPlaceholder")} {...form.register("password")} />
        </Field>
        <Field label={t("auth.confirmPassword")} error={errors.confirmPassword?.message}>
          <PasswordInput autoComplete="new-password" {...form.register("confirmPassword")} />
        </Field>
        <Controller
          control={form.control}
          name="agree"
          render={({ field, fieldState }) => (
            <div className="space-y-1">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="agree"
                  className="mt-0.5"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  aria-invalid={fieldState.error ? true : undefined}
                  aria-describedby={fieldState.error ? "agree-error" : undefined}
                />
                <label htmlFor="agree" className="text-sm leading-snug">
                  {termsLabel.map((part, i) =>
                    part === "§T§" ? (
                      <Link key={i} href="/terms" target="_blank" className="font-medium text-primary hover:underline">
                        {t("auth.terms")}
                      </Link>
                    ) : part === "§P§" ? (
                      <Link key={i} href="/privacy" target="_blank" className="font-medium text-primary hover:underline">
                        {t("auth.privacy")}
                      </Link>
                    ) : (
                      <span key={i}>{part}</span>
                    ),
                  )}
                </label>
              </div>
              {fieldState.error?.message ? (
                <p id="agree-error" role="alert" className="text-xs font-medium text-destructive">
                  {t(fieldState.error.message as TranslationKey)}
                </p>
              ) : null}
            </div>
          )}
        />
        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? t("auth.creatingAccount") : t("auth.createAccount")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
}
