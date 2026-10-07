"use client";

import { Archive, ArchiveRestore, ArrowLeft, FileText, HandCoins, MoreHorizontal, Paperclip, Pencil, Phone, Trash2, Undo2, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteContactAction, setContactArchivedAction } from "@/actions/contacts";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Money } from "@/components/finance/money";
import { useQuickAdd, type QuickAddKind } from "@/components/layout/quick-add-context";
import { ContactForm } from "@/components/ledger/contact-form";
import { ContactAvatar } from "@/components/ledger/contact-picker";
import { DueChip } from "@/components/ledger/status";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { invalidateEntryOptions } from "@/hooks/use-entry-options";
import type { LedgerEntry } from "@/db/queries/ledger";
import type { DueStatus } from "@/lib/finance/due";
import { amountPresentation } from "@/lib/finance/display";
import { ledgerStatus } from "@/lib/finance/rules";
import { formatShortDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { absMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Contact = { id: string; name: string; phone: string | null; email: string | null; note: string | null; avatarInitial: string; isArchived: boolean };

const ACTIONS: Array<{ kind: QuickAddKind; label: TranslationKey; icon: typeof Wallet; cls: string }> = [
  { kind: "LEND", label: "transactionTypes.LEND", icon: HandCoins, cls: "text-receivable" },
  { kind: "BORROW", label: "transactionTypes.BORROW", icon: Wallet, cls: "text-payable" },
  { kind: "DEBT_RECEIVED", label: "transactionTypes.DEBT_RECEIVED", icon: Undo2, cls: "text-receivable" },
  { kind: "DEBT_PAID", label: "transactionTypes.DEBT_PAID", icon: Undo2, cls: "text-payable -scale-x-100" },
];

export function ContactLedgerView({
  contact,
  entries,
  balance,
  dueStatus,
  nearestDue,
  currency,
}: {
  contact: Contact;
  entries: LedgerEntry[];
  balance: string;
  dueStatus: DueStatus;
  nearestDue: string | null;
  currency: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { openQuickAdd } = useQuickAdd();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, startTransition] = useTransition();
  const status = ledgerStatus(balance);
  const newestFirst = [...entries].reverse();

  const archive = () =>
    startTransition(async () => {
      const result = await setContactArchivedAction(contact.id, !contact.isArchived);
      if (!result.ok) return void toast.error(t(result.error as TranslationKey));
      invalidateEntryOptions();
      toast.success(contact.isArchived ? t("ledger.restored") : t("ledger.archived"));
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deleteContactAction(contact.id);
      if (!result.ok) return void toast.error(t(result.error as TranslationKey));
      invalidateEntryOptions();
      toast.success(t("ledger.deleted"));
      router.replace("/ledger");
    });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/ledger">
            <ArrowLeft className="size-4" aria-hidden />
            {t("ledger.title")}
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t("ledger.moreActions")}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <Pencil className="size-4" aria-hidden />
              {t("ledger.editPerson")}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ledger/${contact.id}/statement`}>
                <FileText className="size-4" aria-hidden />
                {t("ledger.viewStatement")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={archive} disabled={pending}>
              {contact.isArchived ? <ArchiveRestore className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
              {contact.isArchived ? t("ledger.restorePerson") : t("ledger.archivePerson")}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
              <Trash2 className="size-4" aria-hidden />
              {t("ledger.deletePerson")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <ContactAvatar initial={contact.avatarInitial} className="size-12 text-base" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{contact.name}</h1>
            {contact.phone ? (
              <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <Phone className="size-3.5" aria-hidden />
                {contact.phone}
              </a>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "mt-5 rounded-xl p-4 text-center",
            status === "RECEIVABLE" ? "bg-receivable-soft" : status === "PAYABLE" ? "bg-payable-soft" : "bg-income-soft",
          )}
        >
          <p className={cn("text-sm font-medium", status === "RECEIVABLE" ? "text-receivable" : status === "PAYABLE" ? "text-payable" : "text-income")}>
            {status === "RECEIVABLE"
              ? t("ledger.getsFrom", { name: contact.name })
              : status === "PAYABLE"
                ? t("ledger.givesTo", { name: contact.name })
                : `✓ ${t("ledger.settled")}`}
          </p>
          {status !== "SETTLED" ? (
            <Money
              value={absMoney(balance)}
              tone={status === "RECEIVABLE" ? "receivable" : "payable"}
              currency={currency}
              className="mt-1 block text-3xl font-semibold tracking-tight"
            />
          ) : null}
          <div className="mt-2 flex justify-center">
            <DueChip status={dueStatus} date={nearestDue} t={t} formatDate={(d) => formatShortDate(d, locale)} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ACTIONS.map((action) => (
            <Button
              key={action.kind}
              variant="outline"
              className="h-auto min-h-12 flex-col gap-1 py-2 text-xs whitespace-normal"
              onClick={() => openQuickAdd({ kind: action.kind, contactId: contact.id })}
            >
              <action.icon className={cn("size-4", action.cls)} aria-hidden />
              {t(action.label)}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-card" aria-labelledby="statement-title">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="statement-title" className="text-base font-semibold">
            {t("ledger.entries")}
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/ledger/${contact.id}/statement`}>
              <FileText className="size-4" aria-hidden />
              {t("ledger.viewStatement")}
            </Link>
          </Button>
        </div>
        {newestFirst.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("ledger.noEntries")}</p>
        ) : (
          <ol className="divide-y">
            {newestFirst.map((entry) => {
              const { tone } = amountPresentation({ type: entry.type, amount: entry.amount, affectsAccount: true });
              const running = ledgerStatus(entry.runningBalance);
              return (
                <li key={entry.id}>
                  <Link href={`/transactions/${entry.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                    <span className="tabular w-14 shrink-0 text-xs text-muted-foreground">{formatShortDate(entry.transactionDate, locale)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t(`transactionTypes.${entry.type}`)}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        {entry.note || entry.title || (entry.affectsAccount ? entry.accountName : t("ledger.notInBalance"))}
                        {entry.hasAttachment ? <Paperclip className="size-3 shrink-0" aria-label={t("form.receipt")} /> : null}
                      </p>
                      {entry.dueDate ? <p className="text-[11px] text-muted-foreground">{t("ledger.due", { date: formatShortDate(entry.dueDate, locale) })}</p> : null}
                    </div>
                    <div className="text-right">
                      <Money value={entry.amount} tone={tone} currency={currency} className="text-sm font-semibold" />
                      <p className="tabular text-[11px] text-muted-foreground">
                        {t("ledger.runningBalance")}:{" "}
                        <Money
                          value={absMoney(entry.runningBalance)}
                          currency={currency}
                          sign={running === "RECEIVABLE" ? "+" : running === "PAYABLE" ? "−" : ""}
                        />
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <ResponsiveDialog open={editing} onOpenChange={setEditing} title={t("ledger.editPerson")}>
        {editing ? (
          <ContactForm
            contact={contact}
            onSaved={() => {
              invalidateEntryOptions();
              setEditing(false);
              router.refresh();
            }}
          />
        ) : null}
      </ResponsiveDialog>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t("ledger.deleteTitle", { name: contact.name })}
        description={entries.length > 0 ? t("ledger.deleteBodyHistory", { count: entries.length }) : t("ledger.deleteBodyEmpty")}
        pending={pending}
        onConfirm={remove}
        requireText={entries.length > 0 ? contact.name : undefined}
      />
    </div>
  );
}
