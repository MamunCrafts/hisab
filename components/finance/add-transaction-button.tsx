"use client";

import type { ComponentProps } from "react";
import { useQuickAdd, type QuickAddKind } from "@/components/layout/quick-add-context";
import { Button } from "@/components/ui/button";

/** Opens the quick-add sheet, optionally straight into a form. */
export function AddTransactionButton({
  kind,
  contactId,
  ...props
}: ComponentProps<typeof Button> & { kind?: QuickAddKind; contactId?: string }) {
  const { openQuickAdd } = useQuickAdd();
  return <Button type="button" onClick={() => openQuickAdd({ kind, contactId })} {...props} />;
}
