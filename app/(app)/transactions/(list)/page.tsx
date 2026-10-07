import { ArrowLeftRight, ChevronLeft, ChevronRight, Plus, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { AddTransactionButton } from "@/components/finance/add-transaction-button";
import { Money } from "@/components/finance/money";
import { TransactionFiltersBar } from "@/components/finance/transaction-filters";
import { TransactionList } from "@/components/finance/transaction-list";
import { Button } from "@/components/ui/button";
import { listAccountOptions } from "@/db/queries/accounts";
import { listCategories } from "@/db/queries/categories";
import { listContactOptions } from "@/db/queries/contacts-basic";
import { getFilterContext } from "@/db/queries/context";
import { getFilteredTotals, listTransactions } from "@/db/queries/transactions";
import { requireUser } from "@/lib/auth/session";
import { filtersToSearchParams, parseTransactionFilters } from "@/lib/finance/filters";
import { calculateCashFlow } from "@/lib/finance/rules";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("transactions.title") };
}

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const user = await requireUser();
  const { t } = await getI18n();
  const filters = parseTransactionFilters(await searchParams);
  const ctx = await getFilterContext(user.id, filters);
  const [{ items, hasNext }, totals, accounts, categories, contacts] = await Promise.all([
    listTransactions(user.id, filters, ctx),
    getFilteredTotals(user.id, filters, ctx),
    listAccountOptions(user.id),
    listCategories(user.id),
    listContactOptions(user.id),
  ]);

  const isFiltered =
    filters.range !== "all" ||
    Boolean(filters.q || filters.type || filters.categoryId || filters.accountId || filters.contactId || filters.min || filters.max);
  const pageHref = (page: number) => {
    const qs = filtersToSearchParams({ ...filters, page }).toString();
    return qs ? `/transactions?${qs}` : "/transactions";
  };
  const exportQs = filtersToSearchParams({ ...filters, page: 1 }).toString();

  return (
    <>
      <PageHeader
        title={t("transactions.title")}
        description={t("transactions.description")}
        actions={
          <AddTransactionButton className="hidden md:inline-flex">
            <Plus className="size-4" aria-hidden />
            {t("quickAdd.title")}
          </AddTransactionButton>
        }
      />

      <TransactionFiltersBar
        filters={filters}
        accounts={accounts}
        categories={categories}
        contacts={contacts}
        exportHref={`/api/export/transactions${exportQs ? `?${exportQs}` : ""}`}
      />

      {totals.count > 0 ? (
        <dl className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border bg-card p-3 text-center shadow-card md:max-w-xl md:text-left">
          <div>
            <dt className="text-xs text-muted-foreground">{t("transactions.income")}</dt>
            <dd className="text-sm font-semibold"><Money value={totals.income} tone="income" currency={ctx.currency} /></dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("transactions.expense")}</dt>
            <dd className="text-sm font-semibold"><Money value={totals.expense} tone="expense" currency={ctx.currency} /></dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("transactions.net")}</dt>
            <dd className="text-sm font-semibold">
              <Money value={calculateCashFlow(totals.income, totals.expense)} showSignedValue currency={ctx.currency} />
            </dd>
          </div>
        </dl>
      ) : null}

      <div className="mt-4" aria-live="polite">
        {items.length === 0 ? (
          isFiltered ? (
            <EmptyState icon={SearchX} title={t("transactions.noMatchTitle")} description={t("transactions.noMatchBody")}
              action={<Button variant="outline" asChild><Link href="/transactions">{t("transactions.clearFilters")}</Link></Button>} />
          ) : (
            <EmptyState
              icon={ArrowLeftRight}
              title={t("transactions.emptyTitle")}
              description={t("transactions.emptyBody")}
              action={<AddTransactionButton kind="EXPENSE">{t("transactions.emptyCta")}</AddTransactionButton>}
            />
          )
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">{t("transactions.results", { count: totals.count })}</p>
            <TransactionList items={items} today={ctx.today} currency={ctx.currency} />
          </>
        )}
      </div>

      {filters.page > 1 || hasNext ? (
        <nav className="mt-6 flex items-center justify-between gap-2" aria-label={t("transactions.pageOf", { page: filters.page })}>
          {filters.page > 1 ? (
            <Button variant="outline" asChild>
              <Link href={pageHref(filters.page - 1)} scroll>
                <ChevronLeft className="size-4" aria-hidden />
                {t("common.previous")}
              </Link>
            </Button>
          ) : <span />}
          <span className="text-sm text-muted-foreground">{t("transactions.pageOf", { page: filters.page })}</span>
          {hasNext ? (
            <Button variant="outline" asChild>
              <Link href={pageHref(filters.page + 1)} scroll>
                {t("common.next")}
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </Button>
          ) : <span />}
        </nav>
      ) : null}
    </>
  );
}
