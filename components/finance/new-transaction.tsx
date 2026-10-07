"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EntryOptions } from "@/db/queries/entry-options";
import { TransactionForm, type FormKind } from "@/components/finance/transaction-form";
import { Card, CardContent } from "@/components/ui/card";
import { invalidateEntryOptions } from "@/hooks/use-entry-options";

/** Full-page entry form; after saving it resets for the next entry instead of navigating away. */
export function NewTransaction({ options, kind, contactId }: { options: EntryOptions; kind: FormKind; contactId?: string }) {
  const router = useRouter();
  const [round, setRound] = useState(0);
  return (
    <Card className="mx-auto max-w-xl">
      <CardContent>
        <TransactionForm
          key={round}
          options={options}
          kind={kind}
          initial={contactId ? { contactId } : undefined}
          onSaved={() => {
            invalidateEntryOptions();
            setRound((r) => r + 1);
            router.refresh();
          }}
        />
      </CardContent>
    </Card>
  );
}
