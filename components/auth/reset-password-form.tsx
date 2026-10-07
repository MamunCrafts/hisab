"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth";
import { authErrorKey } from "./auth-error";

export function ResetPasswordForm({ token, invalid }: { token: string | null; invalid: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(invalid || !token ? "auth.resetInvalid" : null);
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: ResetPasswordInput) {
    if (!token) return;
    setFormError(null);
    const { error } = await authClient.resetPassword({ newPassword: values.password, token });
    if (error) {
      setFormError(authErrorKey(error));
      return;
    }
    router.replace("/login?reset=1");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.resetTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("auth.resetSubtitle")}</p>
      </div>
      {formError ? (
        <FormAlert>
          {t(formError as TranslationKey)}{" "}
          {formError === "auth.resetInvalid" ? (
            <Link href="/forgot-password" className="font-medium underline">
              {t("auth.sendResetLink")}
            </Link>
          ) : null}
        </FormAlert>
      ) : null}
      {token && !invalid ? (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label={t("auth.newPassword")} error={errors.password?.message}>
            <PasswordInput autoComplete="new-password" autoFocus {...form.register("password")} />
          </Field>
          <Field label={t("auth.confirmPassword")} error={errors.confirmPassword?.message}>
            <PasswordInput autoComplete="new-password" {...form.register("confirmPassword")} />
          </Field>
          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {t("auth.resetPassword")}
          </Button>
        </form>
      ) : null}
      <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden />
        {t("auth.backToLogin")}
      </Link>
    </div>
  );
}
