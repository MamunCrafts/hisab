import { z } from "zod";
import { STARTER_ACCOUNTS } from "@/lib/constants";
import { optionalAmountSchema } from "./common";

const starterKeys = STARTER_ACCOUNTS.map((a) => a.key) as [string, ...string[]];

export const onboardingSchema = z.object({
  accounts: z
    .array(z.object({ key: z.enum(starterKeys), openingBalance: optionalAmountSchema }))
    .max(STARTER_ACCOUNTS.length),
});
export type OnboardingInput = z.input<typeof onboardingSchema>;
