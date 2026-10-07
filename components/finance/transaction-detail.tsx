"use client";

import { ArrowLeft, BookUser, FileText, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { EntryOptions } from "@/db/queries/entry-options";
import type { TransactionListItem } from "@/db/queries/transactions";
import { Money } from "@/components/finance/money";
import { useDeleteTransaction } from "@/components/finance/transaction-actions";
import { TransactionForm, type FormKind } from "@/components/finance/transaction-form";
import { TransactionIcon, transactionPrimaryLabel } from "@/components/finance/transaction-visuals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { invalidateEntryOptions } from "@/hooks/use-entry-options";
import { categoryLabel } from "@/lib/finance/categories";
import { amountPresentation } from "@/lib/finance/display";
import { isLedgerType } from "@/lib/finance/rules";
import { formatDate, formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";

export function TransactionDetail({
  tx,
  options,
  timezone,
}: {
  tx: TransactionListItem;
  options: EntryOptions;
  timezone: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState(searchParams.get("edit") === "1" && tx.type !== "ADJUSTMENT");
  const { openDialog, dialog } = useDeleteTransaction(tx.id, () => router.replace("/transactions"));
  const { sign, tone } = amountPresentation(tx);

  if (editing && tx.type !== "ADJUSTMENT") {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => setEditing(false)} aria-label={t("common.back")}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-xl font-semibold">{t("transactions.editTitle")}</h1>
        </div>
        <Card>
          <CardContent>
            <TransactionForm
              options={options}
              kind={tx.type as FormKind}
              transactionId={tx.id}
              existingAttachment={tx.attachment}
              initial={{
                type: tx.type as FormKind,
                amount: tx.amount.replace(/\.00$/, ""),
                accountId: tx.account?.id ?? "",
                destinationAccountId: tx.destinationAccount?.id ?? "",
                categoryId: tx.category?.id ?? "",
                contactId: tx.contact?.id ?? "",
                transactionDate: tx.transactionDate,
                dueDate: tx.dueDate ?? "",
                title: tx.title ?? "",
                note: tx.note ?? "",
                tags: tx.tags.join(", "),
                affectsAccount: tx.affectsAccount,
              }}
              onSaved={() => {
                invalidateEntryOptions();
                setEditing(false);
                router.refresh();
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: t("form.date"), value: formatDate(tx.transactionDate, locale) },
  ];
  if (tx.type === "EXPENSE" || tx.type === "INCOME") rows.push({ label: t("form.category"), value: categoryLabel(tx.category, t) });
  if (tx.contact) rows.push({ label: t("form.person"), value: tx.contact.name });
  if (tx.type === "TRANSFER") {
    rows.push({ label: t("form.fromAccount"), value: tx.account?.name });
    rows.push({ label: t("form.toAccount"), value: tx.destinationAccount?.name });
  } else {
    rows.push({ label: t("form.account"), value: tx.affectsAccount ? (tx.account?.name ?? "—") : t("transactions.notInBalance") });
  }
  if (tx.dueDate) rows.push({ label: t("form.dueDate"), value: formatDate(tx.dueDate, locale) });
  if (tx.title) rows.push({ label: t("form.title"), value: tx.title });
  if (tx.note) rows.push({ label: t("form.note"), value: <span className="whitespace-pre-wrap">{tx.note}</span> });
  if (tx.tags.length > 0)
    rows.push({
      label: t("transactions.tagsLabel"),
      value: (
        <span className="flex flex-wrap justify-end gap-1">
          {tx.tags.map((tag) => (
            <Badge key={tag} variant="secondary">#{tag}</Badge>
          ))}
        </span>
      ),
    });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/transactions">
          <ArrowLeft className="size-4" aria-hidden />
          {t("transactions.title")}
        </Link>
      </Button>

      <Card>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-3 pt-2 text-center">
            <TransactionIcon tx={tx} className="size-14 [&_svg]:size-6" />
            <div>
              <p className="text-sm text-muted-foreground">{t(`transactionTypes.${tx.type}`)}</p>
              <h1 className="text-lg font-semibold">{transactionPrimaryLabel(tx, t)}</h1>
            </div>
            <Money value={tx.amount} sign={sign} tone={tone} currency={options.currency} className="text-3xl font-semibold tracking-tight" />
            {tx.isEdited ? <Badge variant="outline">{t("common.edited")}</Badge> : null}
          </div>

          <dl className="divide-y rounded-xl border">
            {rows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
                <dd className="min-w-0 text-right font-medium break-words">{row.value}</dd>
              </div>
            ))}
          </dl>

          {tx.attachment ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("form.receipt")}</p>
              <a
                href={`/api/attachments/${tx.attachment.id}`}
                target="_blank"
                rel="noopener"
                className="block overflow-hidden rounded-xl border bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {tx.attachment.contentType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image
                  <img src={`/api/attachments/${tx.attachment.id}`} alt={tx.attachment.originalName} className="max-h-80 w-full object-contain" />
                ) : (
                  <span className="flex items-center gap-3 p-4 text-sm">
                    <FileText className="size-8 text-expense" aria-hidden />
                    <span className="truncate font-medium">{tx.attachment.originalName}</span>
                  </span>
                )}
              </a>
            </div>
          ) : null}

          <p className="text-center text-xs text-muted-foreground">
            {t("transactions.createdAt")}: {formatDateTime(new Date(tx.createdAt), locale, timezone)}
            {tx.isEdited ? ` · ${t("transactions.updatedAt")}: ${formatDateTime(new Date(tx.updatedAt), locale, timezone)}` : null}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            {tx.type !== "ADJUSTMENT" ? (
              <Button className="flex-1" onClick={() => setEditing(true)}>
                <Pencil className="size-4" aria-hidden />
                {t("common.edit")}
              </Button>
            ) : null}
            {isLedgerType(tx.type) && tx.contact ? (
              <Button variant="outline" className="flex-1" asChild>
                <Link href={`/ledger/${tx.contact.id}`}>
                  <BookUser className="size-4" aria-hidden />
                  {t("transactions.openLedger", { name: tx.contact.name })}
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={openDialog}>
              <Trash2 className="size-4" aria-hidden />
              {t("common.delete")}
            </Button>
          </div>
        </CardContent>
      </Card>
      {dialog}
    </div>
  );
}
