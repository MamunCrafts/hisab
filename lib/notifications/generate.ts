import "server-only";
import { db } from "@/db/client";
import { notifications } from "@/db/schema";
import { listBudgetUsage } from "@/db/queries/budgets";
import { listContactBalances } from "@/db/queries/ledger";
import { listUpcoming } from "@/db/queries/recurring";
import { addDays, endOfMonth, startOfMonth, type DateString } from "@/lib/dates";
import { categoryLabel } from "@/lib/finance/categories";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/translate";
import { formatCurrency, formatDate } from "@/lib/format";
import { absMoney } from "@/lib/money";

type NotificationType = (typeof notifications.$inferInsert)["type"];

/** Days ahead to remind about upcoming recurring items. */
const RECURRING_LOOKAHEAD = 2;

/**
 * Creates in-app reminders for one user. Idempotent: each reminder has a
 * dedupe key, so running this from cron and on page loads never duplicates.
 */
export async function generateRemindersForUser(
  userId: string,
  opts: { today: DateString; locale: string; currency: string },
): Promise<number> {
  const locale = isLocale(opts.locale) ? opts.locale : "en";
  const t = createTranslator(getDictionary(locale));
  const money = (v: string) => formatCurrency(absMoney(v), { currency: opts.currency });
  const rows: Array<typeof notifications.$inferInsert> = [];
  const push = (type: NotificationType, dedupeKey: string, relatedEntityId: string, data: Record<string, string | number>) => {
    const params = { ...data, amount: data.amount ? money(String(data.amount)) : "", date: data.date ? formatDate(String(data.date), locale) : "" };
    rows.push({
      userId,
      type,
      dedupeKey,
      relatedEntityId,
      data,
      title: t(`notifications.${type}_title`),
      message: t(`notifications.${type}_body`, params),
    });
  };

  const [contacts, budgets, upcoming] = await Promise.all([
    listContactBalances(userId, opts.today),
    listBudgetUsage(userId, startOfMonth(opts.today), endOfMonth(opts.today)),
    listUpcoming(userId, opts.today, RECURRING_LOOKAHEAD),
  ]);

  for (const c of contacts) {
    if (c.isArchived || !c.nearestDue) continue;
    if (c.dueStatus === "DUE_TODAY") push("DEBT_DUE_TODAY", `debt-due:${c.id}:${c.nearestDue}`, c.id, { name: c.name, amount: c.balance, date: c.nearestDue });
    if (c.dueStatus === "OVERDUE") push("DEBT_OVERDUE", `debt-overdue:${c.id}:${c.nearestDue}`, c.id, { name: c.name, amount: c.balance, date: c.nearestDue });
  }
  const month = opts.today.slice(0, 7);
  for (const b of budgets) {
    const category = categoryLabel(b, t);
    if (b.state === "WARNING") push("BUDGET_NEAR_LIMIT", `budget-warn:${b.id}:${month}`, b.id, { category, percent: b.percent });
    if (b.state === "EXCEEDED") push("BUDGET_EXCEEDED", `budget-over:${b.id}:${month}`, b.id, { category, percent: b.percent });
  }
  for (const r of upcoming) {
    if (!r.nextOccurrence || r.nextOccurrence > addDays(opts.today, RECURRING_LOOKAHEAD)) continue;
    push("RECURRING_UPCOMING", `recurring:${r.id}:${r.nextOccurrence}`, r.id, { title: r.title, amount: r.amount, date: r.nextOccurrence });
  }

  if (rows.length === 0) return 0;
  const inserted = await db
    .insert(notifications)
    .values(rows)
    .onConflictDoNothing({ target: [notifications.userId, notifications.dedupeKey] })
    .returning({ id: notifications.id });
  return inserted.length;
}

const lastRun = new Map<string, number>();
const THROTTLE_MS = 30 * 60 * 1000;

/** Page-load trigger: skips work if this instance generated reminders for the user recently. */
export async function maybeGenerateReminders(userId: string, opts: { today: DateString; locale: string; currency: string }) {
  const now = Date.now();
  if ((lastRun.get(userId) ?? 0) > now - THROTTLE_MS) return 0;
  lastRun.set(userId, now);
  if (lastRun.size > 5000) lastRun.clear();
  return generateRemindersForUser(userId, opts);
}
