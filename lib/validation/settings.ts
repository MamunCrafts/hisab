import { z } from "zod";
import { SUPPORTED_CURRENCIES, TIMEZONES } from "@/lib/constants";
import { LOCALES } from "@/lib/i18n/config";

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "validation.nameMin").max(80, "validation.nameMax"),
});

export const preferencesSchema = z.object({
  preferredCurrency: z.enum(SUPPORTED_CURRENCIES),
  locale: z.enum(LOCALES),
  timezone: z.enum(TIMEZONES),
  startOfWeek: z.coerce.number().int().min(0).max(6),
});
