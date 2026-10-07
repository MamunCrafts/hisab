"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateAvatarAction, updateProfileAction } from "@/actions/settings";
import { Field } from "@/components/forms/field";
import { UserAvatar } from "@/components/layout/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";

export function ProfileForm({ name, email, avatar }: { name: string; email: string; avatar: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(name);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = (formData: FormData) =>
    startTransition(async () => {
      const result = await updateAvatarAction(formData);
      if (!result.ok) return void toast.error(t((result.fieldErrors?.avatar ?? result.error) as TranslationKey, { size: 2 }));
      toast.success(t("settings.saved"));
      router.refresh();
    });

  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <UserAvatar name={displayName || name} image={avatar} className="size-16 text-lg" />
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("settings.avatar")}</p>
            <p className="text-xs text-muted-foreground">{t("settings.avatarHint")}</p>
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                aria-label={t("settings.avatar")}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.set("avatar", file);
                  uploadAvatar(fd);
                  e.target.value = "";
                }}
              />
              <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => fileRef.current?.click()}>
                <Camera className="size-4" aria-hidden />
                {t("form.receiptReplace")}
              </Button>
              {avatar ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("remove", "1");
                    uploadAvatar(fd);
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                  {t("form.receiptRemove")}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const result = await updateProfileAction({ displayName });
              if (!result.ok) {
                setError(result.fieldErrors?.displayName ?? result.error);
                return;
              }
              setError(undefined);
              toast.success(t("settings.saved"));
              router.refresh();
            });
          }}
        >
          <Field label={t("settings.displayName")} error={error}>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
          </Field>
          <Field label={t("auth.email")}>
            <Input value={email} disabled readOnly />
          </Field>
          <Button type="submit" disabled={pending}>{pending ? t("common.saving") : t("common.save")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
