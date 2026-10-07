import { getFilterContext } from "@/db/queries/context";
import { buildReport, parseReportParams, type Cell } from "@/db/queries/reports";
import { getCurrentUser } from "@/lib/auth/session";
import { csvResponse, toCsv } from "@/lib/csv";
import { getI18n } from "@/lib/i18n/server";

export const runtime = "nodejs";

const plain = (cell: Cell) => (cell.kind === "money" ? cell.value : (cell.value ?? ""));

/** CSV of the same report table the page shows, with the same filters. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { t } = await getI18n();
  const ctx = await getFilterContext(user.id);
  const params = parseReportParams(Object.fromEntries(new URL(request.url).searchParams.entries()), ctx.today);
  const report = await buildReport(user.id, params, ctx, t);
  const rows = [report.columns.map((c) => c.label), ...report.rows.map((r) => r.map(plain)), ...(report.footer ? [report.footer.map(plain)] : [])];
  return csvResponse(`hisab-${params.type}-${params.from}-${params.to}.csv`, toCsv(rows));
}
