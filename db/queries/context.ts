import "server-only";
import { todayInTimezone } from "@/lib/dates";
import type { TransactionFilters } from "@/lib/finance/filters";
import { matchingCategoryKeys } from "@/lib/finance/search";
import { getUserSettings } from "./profile";
import type { FilterContext } from "./transactions";

/** Calendar context ("today" in the user's timezone) for date-based queries. */
export async function getFilterContext(userId: string, filters?: Pick<TransactionFilters, "q">): Promise<FilterContext & { currency: string; timezone: string }> {
  const settings = await getUserSettings(userId);
  return {
    today: todayInTimezone(settings.timezone),
    weekStartsOn: settings.weekStartsOn,
    matchingCategoryKeys: matchingCategoryKeys(filters?.q ?? null),
    currency: settings.currency,
    timezone: settings.timezone,
  };
}
