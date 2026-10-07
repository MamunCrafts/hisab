"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "@/actions/preferences";
import { Button } from "@/components/ui/button";
import { LOCALES } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/** Compact toggle used on auth screens. */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = LOCALES.find((l) => l !== locale) ?? "en";

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("gap-1.5", className)}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setLocaleAction(next);
          router.refresh();
        })
      }
      aria-label={`${t("language.title")}: ${t(`language.${next}`)}`}
    >
      <Languages className="size-4" aria-hidden />
      {t(`language.${next}`)}
    </Button>
  );
}
