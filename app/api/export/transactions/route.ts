import { getFilterContext } from "@/db/queries/context";
import { exportTransactions } from "@/db/queries/transactions";
import { getCurrentUser } from "@/lib/auth/session";
import { csvResponse, toCsv } from "@/lib/csv";
import { categoryLabel } from "@/lib/finance/categories";
import { parseTransactionFilters } from "@/lib/finance/filters";
import { ledgerEffect } from "@/lib/finance/rules";
import { getI18n } from "@/lib/i18n/server";

export const runtime = "nodejs";

/** CSV of transactions matching the same filters as the list. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { t } = await getI18n();
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const filters = parseTransactionFilters(params);
  const ctx = await getFilterContext(user.id, filters);
  const items = await exportTransactions(user.id, filters, ctx);

  const rows: Array<Array<string | number | null>> = [
    ["Date", "Type", "Amount", "Currency", "Account", "To account", "Category", "Person", "Ledger effect", "Counts in balance", "Description", "Note", "Tags", "Due date"],
    ...items.map((tx) => [
      tx.transactionDate,
      tx.type,
      tx.amount,
      ctx.currency,
      tx.account?.name ?? "",
      tx.destinationAccount?.name ?? "",
      tx.type === "EXPENSE" || tx.type === "INCOME" ? categoryLabel(tx.category, t) : "",
      tx.contact?.name ?? "",
      tx.contact ? ledgerEffect(tx.type, tx.amount) : "",
      tx.affectsAccount ? "yes" : "no",
      tx.title ?? "",
      tx.note ?? "",
      tx.tags.join(" "),
      tx.dueDate ?? "",
    ]),
  ];
  return csvResponse(`hisab-transactions-${ctx.today}.csv`, toCsv(rows));
}
