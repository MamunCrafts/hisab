"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { syncPreferencesAction } from "@/actions/preferences";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { authErrorKey, safeNextPath } from "./auth-error";

export function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTheme } = useTheme();
  const [formError, setFormError] = useState<string | null>(null);
  const reset = searchParams.get("reset") === "1";

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    const { error } = await authClient.signIn.email(values);
    if (error) {
      setFormError(authErrorKey(error));
      return;
    }
    // Best-effort: a stale client after a redeploy can't reach this action (409),
    // and that must not block an already-successful sign-in.
    const synced = await syncPreferencesAction().catch(() => null);
    if (synced?.ok && synced.theme) setTheme(synced.theme);
    router.replace(safeNextPath(searchParams.get("next")));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.loginTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>
      </div>

      {reset ? <FormAlert tone="success">{t("auth.resetSuccess")}</FormAlert> : null}
      {formError ? <FormAlert>{t(formError as TranslationKey)}</FormAlert> : null}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label={t("auth.email")} error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            autoFocus
            placeholder={t("auth.emailPlaceholder")}
            {...form.register("email")}
          />
        </Field>
        <Field
          label={t("auth.password")}
          error={errors.password?.message}
          labelAction={
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              {t("auth.forgotPassword")}
            </Link>
          }
        >
          <PasswordInput autoComplete="current-password" {...form.register("password")} />
        </Field>
        <Controller
          control={form.control}
          name="rememberMe"
          render={({ field }) => (
            <div className="flex items-center gap-2.5">
              <Checkbox id="rememberMe" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
              <Label htmlFor="rememberMe" className="text-sm font-normal">
                {t("auth.rememberMe")}
              </Label>
            </div>
          )}
        />
        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          {t("auth.createAccount")}
        </Link>
      </p>
    </div>
  );
}
