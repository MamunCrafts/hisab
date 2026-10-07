"use server";

import { z } from "zod";
import { globalSearch } from "@/db/queries/search";
import { authedAction } from "@/lib/safe-action";

export async function searchAction(query: string) {
  return authedAction(z.string().trim().min(2).max(100), query, ({ userId, input }) => globalSearch(userId, input));
}
