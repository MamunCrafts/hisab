import { Wallet } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportTable } from "@/components/reports/report-table";
import { listAccountOptions } from "@/db/queries/accounts";
import { listCategories } from "@/db/queries/categories";
import { listContactOptions } from "@/db/queries/contacts-basic";
import { getFilterContext } from "@/db/queries/context";
import { buildReport, parseReportParams, REPORT_TYPES } from "@/db/queries/reports";
import { requireUser } from "@/lib/auth/session";
import { categoryLabel } from "@/lib/finance/categories";
import { formatDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("reports.title") };
}

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const ctx = await getFilterContext(user.id);
  const params = parseReportParams(await searchParams, ctx.today);
  const [report, accounts, categories, contacts] = await Promise.all([
    buildReport(user.id, params, ctx, t),
    listAccountOptions(user.id),
    listCategories(user.id),
    listContactOptions(user.id),
  ]);
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => Boolean(v)) as Array<[string, string]>).toString();
  const period = t("reports.period", { from: formatDate(params.from, locale), to: formatDate(params.to, locale) });

  return (
    <div className="space-y-5">
      <PageHeader title={t("reports.title")} description={t("reports.description")} className="no-print mb-0 md:mb-0" />
      <ReportFilters
        types={REPORT_TYPES}
        params={params}
        accounts={accounts.map((a) => ({ id: a.id, label: a.name }))}
        categories={categories.map((c) => ({ id: c.id, label: `${categoryLabel(c, t)} · ${t(`transactionTypes.${c.kind}`)}` }))}
        contacts={contacts.map((c) => ({ id: c.id, label: c.name }))}
      />
      {report.needsAccount ? (
        <EmptyState icon={Wallet} title={t("reports.selectAccount")} />
      ) : (
        <ReportTable report={report} title={t(`reports.${params.type}`)} period={period} csvHref={`/api/export/report?${qs}`} currency={ctx.currency} />
      )}
      <p className="hidden text-xs print:block">{t("reports.generated", { date: formatDate(ctx.today, locale) })}</p>
    </div>
  );
}
