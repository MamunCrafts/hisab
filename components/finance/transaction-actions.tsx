"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteTransactionAction } from "@/actions/transactions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { invalidateEntryOptions } from "@/hooks/use-entry-options";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";

export function useDeleteTransaction(id: string, onDeleted?: () => void) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = () =>
    startTransition(async () => {
      const result = await deleteTransactionAction(id);
      if (!result.ok) {
        toast.error(t(result.error as TranslationKey));
        return;
      }
      invalidateEntryOptions();
      setOpen(false);
      toast.success(t("form.deleted"));
      onDeleted?.();
      router.refresh();
    });
  const dialog = (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title={t("form.deleteTitle")}
      description={t("form.deleteBody")}
      pending={pending}
      onConfirm={confirm}
    />
  );
  return { openDialog: () => setOpen(true), dialog };
}

/** Row-level Edit / Delete menu. */
export function TransactionActions({ id }: { id: string }) {
  const { t } = useI18n();
  const { openDialog, dialog } = useDeleteTransaction(id);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t("transactions.moreActions")}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/transactions/${id}?edit=1`}>
              <Pencil className="size-4" aria-hidden />
              {t("common.edit")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={openDialog}>
            <Trash2 className="size-4" aria-hidden />
            {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog}
    </>
  );
}
