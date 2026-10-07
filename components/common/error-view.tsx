"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

/** Friendly error with retry. Never shows stack traces or raw messages. */
export function ErrorView({ reset }: { reset: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-expense-soft text-expense">
        <TriangleAlert className="size-6" aria-hidden />
      </span>
      <h1 className="text-lg font-semibold">{t("common.somethingWrong")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("common.somethingWrongBody")}</p>
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>
          <RefreshCw className="size-4" aria-hidden />
          {t("common.retry")}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">{t("common.goHome")}</Link>
        </Button>
      </div>
    </div>
  );
}
