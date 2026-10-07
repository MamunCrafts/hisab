import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, attachments, budgets, categories, contacts, profiles, recurringRules, transactions, users } from "@/db/schema";

export const BACKUP_FORMAT = "hisab.backup";
export const BACKUP_VERSION = 1;

/**
 * Every finance record the user owns, keyed by stable ids so a future import
 * can rebuild references. Never includes password hashes, sessions or tokens.
 */
export async function buildBackup(userId: string) {
  const [user] = await db.select({ name: users.name, email: users.email, createdAt: users.createdAt }).from(users).where(eq(users.id, userId));
  const [profile] = await db
    .select({
      displayName: profiles.displayName,
      preferredCurrency: profiles.preferredCurrency,
      locale: profiles.locale,
      timezone: profiles.timezone,
      startOfWeek: profiles.startOfWeek,
      theme: profiles.theme,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId));
  const strip = <T extends { userId: string }>(rows: T[]) =>
    rows.map((row) => {
      const copy: Partial<T> = { ...row };
      delete copy.userId;
      return copy as Omit<T, "userId">;
    });
  const [acc, cat, con, tx, att, bud, rec] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.createdAt)),
    db.select().from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.createdAt)),
    db.select().from(contacts).where(eq(contacts.userId, userId)).orderBy(asc(contacts.createdAt)),
    db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(asc(transactions.transactionDate), asc(transactions.createdAt)),
    db
      .select({ id: attachments.id, transactionId: attachments.transactionId, contentType: attachments.contentType, size: attachments.size, originalName: attachments.originalName, createdAt: attachments.createdAt })
      .from(attachments)
      .where(eq(attachments.userId, userId)),
    db.select().from(budgets).where(eq(budgets.userId, userId)),
    db.select().from(recurringRules).where(eq(recurringRules.userId, userId)),
  ]);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    notes: "Money values are decimal strings (NUMERIC 18,2). Attachment files are not included; only their metadata.",
    user: user ? { name: user.name, email: user.email, createdAt: user.createdAt } : null,
    profile: profile ?? null,
    accounts: strip(acc),
    categories: strip(cat),
    contacts: strip(con),
    transactions: strip(tx),
    attachments: att,
    budgets: strip(bud),
    recurringRules: strip(rec),
  };
}
