"use client";

import { BookUser, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { DebtSummaryCards } from "@/components/ledger/debt-summary-cards";
import { ContactForm } from "@/components/ledger/contact-form";
import { ContactAvatar } from "@/components/ledger/contact-picker";
import { DueChip, LedgerStatusPill } from "@/components/ledger/status";
import { Money } from "@/components/finance/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { invalidateEntryOptions } from "@/hooks/use-entry-options";
import type { ContactBalance, DebtSummary } from "@/db/queries/ledger";
import { addDays } from "@/lib/dates";
import { formatDate, formatShortDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import { LEDGER_FILTERS, type LedgerFilter } from "@/lib/finance/ledger-filters";


const FILTER_LABEL: Record<LedgerFilter, TranslationKey> = {
  all: "ledger.filterAll",
  receivable: "ledger.filterReceivable",
  payable: "ledger.filterPayable",
  settled: "ledger.filterSettled",
  overdue: "ledger.filterOverdue",
  archived: "ledger.filterArchived",
};

function matches(contact: ContactBalance, filter: LedgerFilter) {
  if (filter === "archived") return contact.isArchived;
  if (contact.isArchived) return false;
  switch (filter) {
    case "receivable":
      return contact.status === "RECEIVABLE";
    case "payable":
      return contact.status === "PAYABLE";
    case "settled":
      return contact.status === "SETTLED";
    case "overdue":
      return contact.dueStatus === "OVERDUE" || contact.dueStatus === "DUE_TODAY";
    default:
      return true;
  }
}

export function LedgerHome({
  contacts,
  summary,
  currency,
  today,
  initialFilter,
}: {
  contacts: ContactBalance[];
  summary: DebtSummary;
  currency: string;
  today: string;
  initialFilter: LedgerFilter;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [filter, setFilter] = useState<LedgerFilter>(initialFilter);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return contacts.filter(
      (c) => matches(c, filter) && (!needle || c.name.toLowerCase().includes(needle) || (c.phone ?? "").includes(needle)),
    );
  }, [contacts, filter, query]);

  const relative = (d: string) =>
    d === today ? t("common.today") : d === addDays(today, -1) ? t("common.yesterday") : formatShortDate(d, locale);
  const hasPeople = contacts.length > 0;

  return (
    <>
      <PageHeader
        title={t("ledger.title")}
        description={t("ledger.subtitle")}
        actions={
          <Button onClick={() => setAdding(true)}>
            <UserPlus className="size-4" aria-hidden />
            {t("ledger.addPerson")}
          </Button>
        }
      />

      <DebtSummaryCards summary={summary} currency={currency} />

      {hasPeople ? (
        <div className="mt-5 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("ledger.searchPlaceholder")}
              aria-label={t("ledger.searchPlaceholder")}
              className="pl-9"
            />
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0" role="group">
            {LEDGER_FILTERS.map((f) => {
              const count = contacts.filter((c) => matches(c, f)).length;
              if (f === "archived" && count === 0) return null;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => {
                    setFilter(f);
                    window.history.replaceState(null, "", f === "all" ? "/ledger" : `/ledger?filter=${f}`);
                  }}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    filter === f ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                  )}
                >
                  {t(FILTER_LABEL[f])}
                  <span className={cn("tabular text-xs", filter === f ? "text-primary-foreground/80" : "text-muted-foreground")}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        {!hasPeople ? (
          <EmptyState
            icon={BookUser}
            title={t("ledger.emptyTitle")}
            description={t("ledger.emptyBody")}
            action={<Button onClick={() => setAdding(true)}>{t("ledger.addPerson")}</Button>}
          />
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("ledger.noMatch")}</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {visible.map((contact) => (
              <li key={contact.id}>
                <Link
                  href={`/ledger/${contact.id}`}
                  prefetch
                  className="flex h-full items-center gap-3 rounded-2xl border bg-card p-4 shadow-card transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <ContactAvatar initial={contact.avatarInitial} className="size-11 text-sm" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-medium">{contact.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <LedgerStatusPill status={contact.status} t={t} />
                      <DueChip status={contact.dueStatus} date={contact.nearestDue} t={t} formatDate={(d) => formatShortDate(d, locale)} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {contact.lastActivity ? t("ledger.lastActivity", { date: relative(contact.lastActivity) }) : t("ledger.noActivity")}
                    </p>
                  </div>
                  <Money
                    value={contact.balance}
                    tone={contact.status === "RECEIVABLE" ? "receivable" : contact.status === "PAYABLE" ? "payable" : "neutral"}
                    currency={currency}
                    className="text-base font-semibold"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ResponsiveDialog open={adding} onOpenChange={setAdding} title={t("ledger.addPerson")}>
        {adding ? (
          <ContactForm
            onSaved={(id) => {
              invalidateEntryOptions();
              setAdding(false);
              router.push(`/ledger/${id}`);
            }}
          />
        ) : null}
      </ResponsiveDialog>
      <span className="sr-only">{formatDate(today, locale)}</span>
    </>
  );
}
