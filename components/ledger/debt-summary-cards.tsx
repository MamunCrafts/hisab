"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Money } from "@/components/finance/money";
import { useI18n } from "@/lib/i18n/provider";
import type { DebtSummary } from "@/db/queries/ledger";

/** পাবো / দিতে হবে cards; each opens the filtered ledger. */
export function DebtSummaryCards({ summary, currency }: { summary: DebtSummary; currency: string }) {
  const { t } = useI18n();
  const people = (count: number, kind: "from" | "to") =>
    count === 0
      ? t("dashboard.nobody")
      : count === 1
        ? t(kind === "from" ? "dashboard.fromPerson" : "dashboard.toPerson")
        : t(kind === "from" ? "dashboard.fromPeople" : "dashboard.toPeople", { count });
  const cards = [
    {
      href: "/ledger?filter=receivable",
      title: t("ledger.totalReceivable"),
      hint: t("dashboard.receivableLabel"),
      value: summary.receivable.total,
      sub: people(summary.receivable.count, "from"),
      icon: ArrowDownLeft,
      tone: "receivable" as const,
      soft: "bg-receivable-soft text-receivable",
    },
    {
      href: "/ledger?filter=payable",
      title: t("ledger.totalPayable"),
      hint: t("dashboard.payableLabel"),
      value: summary.payable.total,
      sub: people(summary.payable.count, "to"),
      icon: ArrowUpRight,
      tone: "payable" as const,
      soft: "bg-payable-soft text-payable",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="group flex min-w-0 flex-col gap-2 rounded-2xl border bg-card p-4 shadow-card transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="flex items-center gap-2">
            <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${card.soft}`}>
              <card.icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{card.title}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{card.hint}</span>
            </span>
          </span>
          <Money value={card.value} tone={card.tone} currency={currency} className="truncate text-xl font-semibold tracking-tight" />
          <span className="truncate text-xs text-muted-foreground">{card.sub}</span>
        </Link>
      ))}
    </div>
  );
}
