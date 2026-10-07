"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createRule, deleteRule, resolveOccurrence, setRuleActive, updateRule } from "@/db/mutations/recurring";
import { getUserSettings } from "@/db/queries/profile";
import { todayInTimezone } from "@/lib/dates";
import { authedAction } from "@/lib/safe-action";
import { recurringSchema } from "@/lib/validation/recurring";
import { dateSchema } from "@/lib/validation/common";

const idSchema = z.string().uuid();

function done() {
  revalidatePath("/", "layout");
}

async function today(userId: string) {
  return todayInTimezone((await getUserSettings(userId)).timezone);
}

export async function createRuleAction(input: unknown) {
  const result = await authedAction(recurringSchema, input, async ({ userId, input }) => createRule(userId, input, await today(userId)));
  if (result.ok) done();
  return result;
}

export async function updateRuleAction(id: string, input: unknown) {
  const result = await authedAction(z.object({ id: idSchema, data: recurringSchema }), { id, data: input }, async ({ userId, input }) =>
    updateRule(userId, input.id, input.data, await today(userId)),
  );
  if (result.ok) done();
  return result;
}

export async function setRuleActiveAction(id: string, active: boolean) {
  const result = await authedAction(z.object({ id: idSchema, active: z.boolean() }), { id, active }, ({ userId, input }) =>
    setRuleActive(userId, input.id, input.active),
  );
  if (result.ok) done();
  return result;
}

export async function deleteRuleAction(id: string) {
  const result = await authedAction(idSchema, id, ({ userId, input }) => deleteRule(userId, input));
  if (result.ok) done();
  return result;
}

export async function resolveOccurrenceAction(id: string, occurrence: string, mode: "confirm" | "skip") {
  const result = await authedAction(
    z.object({ id: idSchema, occurrence: dateSchema, mode: z.enum(["confirm", "skip"]) }),
    { id, occurrence, mode },
    ({ userId, input }) => resolveOccurrence(userId, input.id, input.occurrence, input.mode),
  );
  if (result.ok) done();
  return result;
}
