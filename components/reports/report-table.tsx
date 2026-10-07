"use client";

import { Download, Printer } from "lucide-react";
import { Money } from "@/components/finance/money";
import { Button } from "@/components/ui/button";
import type { Cell, Report } from "@/db/queries/reports";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

function CellView({ cell, currency }: { cell: Cell; currency: string }) {
  const { locale } = useI18n();
  if (cell.kind === "money") return <Money value={cell.value} showSignedValue tone={cell.tone} currency={currency} />;
  if (cell.kind === "date") return <span className="tabular whitespace-nowrap">{cell.value ? formatDate(cell.value, locale) : "—"}</span>;
  return <>{cell.value}</>;
}

export function ReportTable({ report, title, period, csvHref, currency }: { report: Report; title: string; period: string; csvHref: string; currency: string }) {
  const { t } = useI18n();
  return (
    <section className="space-y-4">
      <div className="no-print flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <a href={csvHref}>
            <Download className="size-4" aria-hidden />
            {t("reports.downloadCsv")}
          </a>
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden />
          {t("reports.print")}
        </Button>
      </div>
      <div className="rounded-2xl border bg-card p-4 shadow-card print:border-0 print:p-0 print:shadow-none">
        <header className="mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{period}</p>
        </header>
        {report.summary.length > 0 ? (
          <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {report.summary.map((s) => (
              <div key={s.label} className="rounded-xl bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className="text-base font-semibold"><CellView cell={s.value} currency={currency} /></dd>
              </div>
            ))}
          </dl>
        ) : null}
        {report.rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("reports.noData")}</p>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  {report.columns.map((c) => (
                    <th key={c.label} scope="col" className={cn("py-2 pr-3 font-medium", c.align === "right" && "text-right")}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className={cn("py-2 pr-3", report.columns[j]?.align === "right" && "text-right")}>
                        <CellView cell={cell} currency={currency} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {report.footer ? (
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    {report.footer.map((cell, j) => (
                      <td key={j} className={cn("py-2 pr-3", report.columns[j]?.align === "right" && "text-right")}>
                        <CellView cell={cell} currency={currency} />
                      </td>
                    ))}
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
