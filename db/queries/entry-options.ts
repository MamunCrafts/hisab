import "server-only";
import { todayInTimezone } from "@/lib/dates";
import { listAccountsWithBalances } from "./accounts";
import { listCategories } from "./categories";
import { listContactOptions } from "./contacts-basic";
import { getUserSettings } from "./profile";

/** Everything the entry forms need: accounts with balances, categories, people, defaults. */
export async function loadEntryOptions(userId: string) {
  const [settings, accounts, categories, contacts] = await Promise.all([
    getUserSettings(userId),
    listAccountsWithBalances(userId),
    listCategories(userId),
    listContactOptions(userId),
  ]);
  return {
    today: todayInTimezone(settings.timezone),
    currency: settings.currency,
    lastUsedAccountId: settings.lastUsedAccountId,
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      icon: a.icon,
      balance: a.balance,
      isArchived: a.isArchived,
    })),
    categories,
    contacts,
  };
}

export type EntryOptions = Awaited<ReturnType<typeof loadEntryOptions>>;
