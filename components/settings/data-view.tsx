"use client";

import { Download, FileJson, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/provider";

export function DataView() {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const remove = async () => {
    setPending(true);
    setError(null);
    const { error: err } = await authClient.deleteUser({ password });
    setPending(false);
    if (err) {
      setError(err.status === 429 ? t("auth.tooManyAttempts") : err.code === "INVALID_PASSWORD" ? t("settings.wrongPassword") : t("errors.generic"));
      return;
    }
    toast.success(t("settings.deleted"));
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <FileJson className="size-4" aria-hidden />
            {t("settings.exportData")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("settings.exportDataDescription")}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href="/api/export/data">
                <Download className="size-4" aria-hidden />
                {t("settings.exportData")}
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/api/export/transactions">
                <Download className="size-4" aria-hidden />
                {t("settings.exportCsv")}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardContent className="space-y-3">
          <h2 className="text-base font-semibold text-destructive">{t("settings.dangerZone")}</h2>
          <p className="text-sm text-muted-foreground">{t("settings.deleteAccountDescription")}</p>
          <Button variant="destructive" onClick={() => setOpen(true)}>
            <Trash2 className="size-4" aria-hidden />
            {t("settings.deleteAccount")}
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setPassword("");
            setError(null);
          }
        }}
        title={t("settings.deleteConfirmTitle")}
        description={t("settings.deleteConfirmBody")}
        confirmLabel={t("settings.deleteAccount")}
        pending={pending}
        onConfirm={remove}
        requireText={t("settings.deleteConfirmWord")}
      >
        <div className="space-y-1.5">
          <Label htmlFor="delete-password">{t("settings.currentPassword")}</Label>
          <PasswordInput id="delete-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={error ? true : undefined} />
          {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
        </div>
      </ConfirmDialog>
    </div>
  );
}
