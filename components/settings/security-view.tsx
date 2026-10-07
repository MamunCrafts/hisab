"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Laptop, LogOut, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { revokeOtherSessionsAction, revokeSessionAction } from "@/actions/settings";
import { Field } from "@/components/forms/field";
import { PasswordInput } from "@/components/forms/password-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validation/auth";

export type SessionInfo = { id: string; userAgent: string | null; ipAddress: string | null; updatedAt: string; current: boolean };

function describeAgent(ua: string | null): { label: string; mobile: boolean } {
  if (!ua) return { label: "", mobile: false };
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return { label: [browser, os].filter(Boolean).join(" · "), mobile };
}

export function SecurityView({ sessions, timezone }: { sessions: SessionInfo[]; timezone: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "", revokeOtherSessions: true },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: ChangePasswordInput) {
    const { error } = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: values.revokeOtherSessions,
    });
    if (error) {
      if (error.code === "INVALID_PASSWORD") form.setError("currentPassword", { message: "settings.wrongPassword" });
      else toast.error(t(error.status === 429 ? "auth.tooManyAttempts" : "errors.generic"));
      return;
    }
    form.reset();
    toast.success(t("settings.passwordChanged"));
    router.refresh();
  }

  const others = sessions.filter((s) => !s.current);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <h2 className="text-base font-semibold">{t("settings.changePassword")}</h2>
            <Field label={t("settings.currentPassword")} error={errors.currentPassword?.message === "settings.wrongPassword" ? t("settings.wrongPassword") : errors.currentPassword?.message}>
              <PasswordInput autoComplete="current-password" {...form.register("currentPassword")} />
            </Field>
            <Field label={t("settings.newPassword")} error={errors.newPassword?.message}>
              <PasswordInput autoComplete="new-password" {...form.register("newPassword")} />
            </Field>
            <Field label={t("settings.confirmPassword")} error={errors.confirmPassword?.message}>
              <PasswordInput autoComplete="new-password" {...form.register("confirmPassword")} />
            </Field>
            <Controller
              control={form.control}
              name="revokeOtherSessions"
              render={({ field }) => (
                <div className="flex items-center gap-2.5">
                  <Checkbox id="revoke-others" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                  <Label htmlFor="revoke-others" className="font-normal">{t("settings.revokeOthers")}</Label>
                </div>
              )}
            />
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t("common.saving") : t("settings.changePassword")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">{t("settings.sessions")}</h2>
              <p className="text-sm text-muted-foreground">{t("settings.sessionsDescription")}</p>
            </div>
            {others.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await revokeOtherSessionsAction();
                    if (!result.ok) return void toast.error(t(result.error as TranslationKey));
                    toast.success(t("settings.revokedAll"));
                    router.refresh();
                  })
                }
              >
                <LogOut className="size-4" aria-hidden />
                {t("settings.revokeAll")}
              </Button>
            ) : null}
          </div>
          <ul className="divide-y rounded-xl border">
            {sessions.map((s) => {
              const agent = describeAgent(s.userAgent);
              const Icon = agent.mobile ? Smartphone : Laptop;
              return (
                <li key={s.id} className="flex items-center gap-3 p-3">
                  <Icon className="size-5 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      {agent.label || t("settings.unknownDevice")}
                      {s.current ? <Badge variant="secondary">{t("settings.thisDevice")}</Badge> : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t("settings.lastActive", { date: formatDateTime(new Date(s.updatedAt), locale, timezone) })}
                      {s.ipAddress ? ` · ${s.ipAddress}` : ""}
                    </p>
                  </div>
                  {!s.current ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await revokeSessionAction(s.id);
                          if (!result.ok) return void toast.error(t(result.error as TranslationKey));
                          toast.success(t("settings.revoked"));
                          router.refresh();
                        })
                      }
                    >
                      {t("settings.revoke")}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
