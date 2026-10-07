"use client";

import { useRouter } from "next/navigation";
import type { QuickAddKind } from "@/components/layout/quick-add-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { invalidateEntryOptions, useEntryOptions } from "@/hooks/use-entry-options";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { TransactionForm } from "./transaction-form";

export function EntryFormSkeleton() {
  return (
    <div className="space-y-5 py-2" aria-busy="true">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

export function QuickAddForm({
  kind,
  contactId,
  onBack,
  onDone,
}: {
  kind: QuickAddKind;
  contactId?: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { options, error, retry } = useEntryOptions();

  if (!options) {
    return error ? (
      <div className="space-y-3 py-6 text-center">
        <p className="text-sm text-muted-foreground">{t(error as TranslationKey)}</p>
        <Button variant="outline" onClick={retry}>
          {t("common.retry")}
        </Button>
      </div>
    ) : (
      <EntryFormSkeleton />
    );
  }

  return (
    <TransactionForm
      options={options}
      kind={kind}
      initial={contactId ? { contactId } : undefined}
      onBack={onBack}
      onSaved={() => {
        invalidateEntryOptions();
        onDone();
        router.refresh();
      }}
    />
  );
}
