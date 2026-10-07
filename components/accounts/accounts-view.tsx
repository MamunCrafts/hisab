"use client";

import { Archive, ArchiveRestore, ListFilter, MoreHorizontal, Pencil, Plus, Scale, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteAccountAction, setAccountArchivedAction } from "@/actions/accounts";
import { AccountForm } from "@/components/accounts/account-form";
import { AdjustBalanceForm } from "@/components/accounts/adjust-balance-form";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { FinanceIcon } from "@/components/finance/finance-icon";
import { Money } from "@/components/finance/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { invalidateEntryOptions } from "@/hooks/use-entry-options";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { addMoney } from "@/lib/money";
import type { AccountWithBalance } from "@/db/queries/accounts";

type Dialog =
  | { kind: "create" }
  | { kind: "edit"; account: AccountWithBalance }
  | { kind: "adjust"; account: AccountWithBalance }
  | { kind: "delete"; account: AccountWithBalance }
  | null;

export function AccountsView({ accounts, currency, today }: { accounts: AccountWithBalance[]; currency: string; today: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialog, setDialog] = useState<Dialog>(searchParams.get("new") === "1" ? { kind: "create" } : null);
  const [pending, startTransition] = useTransition();
  const active = accounts.filter((a) => !a.isArchived);
  const archived = accounts.filter((a) => a.isArchived);
  const total = addMoney(...active.map((a) => a.balance));

  const refresh = () => {
    invalidateEntryOptions();
    setDialog(null);
    router.refresh();
  };

  const archive = (account: AccountWithBalance, value: boolean) =>
    startTransition(async () => {
      const result = await setAccountArchivedAction(account.id, value);
      if (!result.ok) return void toast.error(t(result.error as TranslationKey));
      toast.success(value ? t("accounts.archived") : t("accounts.restored"));
      refresh();
    });

  const remove = (account: AccountWithBalance) =>
    startTransition(async () => {
      const result = await deleteAccountAction(account.id);
      if (!result.ok) return void toast.error(t(result.error as TranslationKey));
      toast.success(t("accounts.deleted"));
      refresh();
    });

  const renderCard = (account: AccountWithBalance) => (
    <li key={account.id}>
      <Card className="h-full">
        <CardContent className="flex h-full flex-col gap-4">
          <div className="flex items-start gap-3">
            <FinanceIcon name={account.icon} color={account.isArchived ? "stone" : "emerald"} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{account.name}</p>
              <p className="text-xs text-muted-foreground">{t(`accountTypes.${account.type}`)}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={t("accounts.actionsFor", { name: account.name })}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setDialog({ kind: "edit", account })}>
                  <Pencil className="size-4" aria-hidden />
                  {t("common.edit")}
                </DropdownMenuItem>
                {!account.isArchived ? (
                  <DropdownMenuItem onSelect={() => setDialog({ kind: "adjust", account })}>
                    <Scale className="size-4" aria-hidden />
                    {t("accounts.adjust")}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem asChild>
                  <Link href={`/transactions?accountId=${account.id}`}>
                    <ListFilter className="size-4" aria-hidden />
                    {t("accounts.viewTransactions")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={pending} onSelect={() => archive(account, !account.isArchived)}>
                  {account.isArchived ? <ArchiveRestore className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
                  {account.isArchived ? t("common.unarchive") : t("common.archive")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() =>
                    account.transactionCount > 0 ? toast.info(t("accounts.deleteHasHistory")) : setDialog({ kind: "delete", account })
                  }
                >
                  <Trash2 className="size-4" aria-hidden />
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="mt-auto flex items-end justify-between gap-2">
            <Money value={account.balance} showSignedValue currency={currency} className="text-xl font-semibold tracking-tight" />
            <Link href={`/transactions?accountId=${account.id}`} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              {t("accounts.transactionsCount", { count: account.transactionCount })}
            </Link>
          </div>
        </CardContent>
      </Card>
    </li>
  );

  return (
    <>
      <PageHeader
        title={t("accounts.title")}
        description={t("accounts.description")}
        actions={
          <Button onClick={() => setDialog({ kind: "create" })}>
            <Plus className="size-4" aria-hidden />
            {t("accounts.add")}
          </Button>
        }
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={t("accounts.emptyTitle")}
          description={t("accounts.emptyBody")}
          action={<Button onClick={() => setDialog({ kind: "create" })}>{t("accounts.add")}</Button>}
        />
      ) : (
        <div className="space-y-6">
          <Card className="bg-primary text-primary-foreground">
            <CardContent>
              <p className="text-sm text-primary-foreground/80">{t("accounts.total")}</p>
              <Money value={total} showSignedValue currency={currency} className="text-3xl font-semibold tracking-tight" />
              <p className="mt-1 text-xs text-primary-foreground/70">{t("accounts.totalHint")}</p>
            </CardContent>
          </Card>

          <section aria-labelledby="active-accounts">
            <h2 id="active-accounts" className="sr-only">{t("accounts.active")}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{active.map(renderCard)}</ul>
          </section>

          {archived.length > 0 ? (
            <section aria-labelledby="archived-accounts" className="space-y-3">
              <h2 id="archived-accounts" className="text-sm font-semibold text-muted-foreground">
                {t("accounts.archivedSection")}
              </h2>
              <ul className="grid gap-3 opacity-80 sm:grid-cols-2 lg:grid-cols-3">{archived.map(renderCard)}</ul>
            </section>
          ) : null}
        </div>
      )}

      <ResponsiveDialog
        open={dialog?.kind === "create" || dialog?.kind === "edit"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={dialog?.kind === "edit" ? t("accounts.edit") : t("accounts.add")}
      >
        {dialog?.kind === "create" || dialog?.kind === "edit" ? (
          <AccountForm account={dialog.kind === "edit" ? dialog.account : undefined} currency={currency} onSaved={refresh} />
        ) : null}
      </ResponsiveDialog>

      <ResponsiveDialog open={dialog?.kind === "adjust"} onOpenChange={(open) => !open && setDialog(null)} title={t("accounts.adjustTitle")}>
        {dialog?.kind === "adjust" ? <AdjustBalanceForm account={dialog.account} currency={currency} today={today} onSaved={refresh} /> : null}
      </ResponsiveDialog>

      <ConfirmDialog
        open={dialog?.kind === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("accounts.deleteTitle")}
        description={t("accounts.deleteBody")}
        pending={pending}
        onConfirm={() => dialog?.kind === "delete" && remove(dialog.account)}
      />
    </>
  );
}
