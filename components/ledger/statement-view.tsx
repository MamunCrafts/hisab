"use client";

import { ArrowLeft, Download, Printer, Share2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LedgerEntry } from "@/db/queries/ledger";
import { ledgerStatus } from "@/lib/finance/rules";
import { formatCurrency, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { absMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Period = "all" | "month" | "custom";

export function StatementView({
  contact,
  period,
  from,
  to,
  today,
  openingBalance,
  closingBalance,
  entries,
  currency,
}: {
  contact: { id: string; name: string; phone: string | null };
  period: Period;
  from: string | null;
  to: string | null;
  today: string;
  openingBalance: string;
  closingBalance: string;
  entries: LedgerEntry[];
  currency: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? today);
  const money = (v: string) => formatCurrency(absMoney(v), { currency });
  const balanceText = (v: string) => {
    const s = ledgerStatus(v);
    return s === "RECEIVABLE" ? `${t("ledger.youWillGet")} ${money(v)}` : s === "PAYABLE" ? `${t("ledger.youWillGive")} ${money(v)}` : t("ledger.settled");
  };
  const periodText =
    period === "all" ? t("ledger.allTime") : `${from ? formatDate(from, locale) : "…"} – ${to ? formatDate(to, locale) : "…"}`;

  const go = (next: Period, f?: string, tt?: string) => {
    const params = new URLSearchParams({ period: next });
    if (next === "custom") {
      if (f) params.set("from", f);
      if (tt) params.set("to", tt);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const share = async () => {
    const lines = entries
      .map((e) => `${formatDate(e.transactionDate, locale)} · ${t(`transactionTypes.${e.type}`)} · ${money(e.amount)}`)
      .join("\n");
    const text = t("ledger.shareText", { name: contact.name, period: periodText, lines, balance: balanceText(closingBalance) });
    try {
      if (navigator.share) {
        await navigator.share({ title: `${t("ledger.statement")} — ${contact.name}`, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success(t("ledger.shareCopied"));
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error(t("errors.generic"));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="no-print space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={`/ledger/${contact.id}`}>
            <ArrowLeft className="size-4" aria-hidden />
            {contact.name}
          </Link>
        </Button>
        <div className="flex flex-wrap items-end gap-2">
          <div role="group" aria-label={t("ledger.period")} className="inline-flex rounded-lg bg-muted p-0.5">
            {(["all", "month", "custom"] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => (p === "custom" ? go("custom", customFrom || undefined, customTo || undefined) : go(p))}
                className={cn(
                  "h-9 rounded-md px-3 text-sm font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  period === p ? "bg-card shadow-sm" : "text-muted-foreground",
                )}
              >
                {p === "all" ? t("ledger.allTime") : p === "month" ? t("ledger.thisMonth") : t("ledger.custom")}
              </button>
            ))}
          </div>
          {period === "custom" ? (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                go("custom", customFrom || undefined, customTo || undefined);
              }}
            >
              <div className="grid gap-1">
                <Label htmlFor="st-from" className="text-xs">{t("common.from")}</Label>
                <Input id="st-from" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 w-40" />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="st-to" className="text-xs">{t("common.to")}</Label>
                <Input id="st-to" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 w-40" />
              </div>
              <Button type="submit" size="sm" variant="secondary">{t("common.apply")}</Button>
            </form>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            {t("common.print")}
          </Button>
          <Button variant="outline" onClick={() => window.print()} title={t("ledger.savePdfHint")}>
            <Download className="size-4" aria-hidden />
            {t("ledger.savePdf")}
          </Button>
          <Button variant="outline" onClick={share}>
            <Share2 className="size-4" aria-hidden />
            {t("ledger.share")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("ledger.savePdfHint")}</p>
      </div>

      <article className="rounded-2xl border bg-card p-5 shadow-card print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-xl font-semibold">{t("ledger.statement")} — {contact.name}</h1>
            {contact.phone ? <p className="text-sm text-muted-foreground">{contact.phone}</p> : null}
            <p className="text-sm text-muted-foreground">{periodText}</p>
          </div>
          <Logo label={t("app.name")} className="shrink-0 [&_svg]:size-7" />
        </header>

        <div className="overflow-x-auto">
          <table className="mt-4 w-full min-w-[480px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="py-2 pr-2 font-medium">{t("form.date")}</th>
                <th scope="col" className="py-2 pr-2 font-medium">{t("form.entryType")}</th>
                <th scope="col" className="py-2 pr-2 text-right font-medium">{t("ledger.credit")}</th>
                <th scope="col" className="py-2 pr-2 text-right font-medium">{t("ledger.debit")}</th>
                <th scope="col" className="py-2 text-right font-medium">{t("ledger.runningBalance")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr className="bg-muted/40">
                <td className="py-2 pr-2" colSpan={4}>{t("ledger.openingBalance")}</td>
                <td className="tabular py-2 text-right font-medium">{balanceText(openingBalance)}</td>
              </tr>
              {entries.map((entry) => {
                const positive = !entry.signed.startsWith("-");
                return (
                  <tr key={entry.id}>
                    <td className="tabular py-2 pr-2 whitespace-nowrap">{formatDate(entry.transactionDate, locale)}</td>
                    <td className="py-2 pr-2">
                      {t(`transactionTypes.${entry.type}`)}
                      {entry.note ? <span className="block text-xs text-muted-foreground">{entry.note}</span> : null}
                    </td>
                    <td className="tabular py-2 pr-2 text-right">{positive ? money(entry.amount) : ""}</td>
                    <td className="tabular py-2 pr-2 text-right">{positive ? "" : money(entry.amount)}</td>
                    <td className="tabular py-2 text-right whitespace-nowrap">{balanceText(entry.runningBalance)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2">
                <td className="py-3 pr-2 font-semibold" colSpan={4}>{t("ledger.closingBalance")}</td>
                <td className="tabular py-3 text-right font-semibold">{balanceText(closingBalance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t("ledger.printedOn", { date: formatDate(today, locale) })}</p>
      </article>
    </div>
  );
}
