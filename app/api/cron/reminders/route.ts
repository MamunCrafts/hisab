import { timingSafeEqual } from "node:crypto";
import { asc, gt } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { todayInTimezone } from "@/lib/dates";
import { generateRemindersForUser } from "@/lib/notifications/generate";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Daily scheduled job (vercel.json) that creates due/budget/recurring reminders for every user. */
export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  let cursor = "";
  let users = 0;
  let created = 0;
  let failed = 0;
  for (;;) {
    const batch = await db
      .select({ id: profiles.id, userId: profiles.userId, timezone: profiles.timezone, locale: profiles.locale, currency: profiles.preferredCurrency })
      .from(profiles)
      .where(cursor ? gt(profiles.id, cursor) : undefined)
      .orderBy(asc(profiles.id))
      .limit(200);
    if (batch.length === 0) break;
    for (const p of batch) {
      try {
        created += await generateRemindersForUser(p.userId, { today: todayInTimezone(p.timezone), locale: p.locale, currency: p.currency });
        users += 1;
      } catch (error) {
        failed += 1;
        console.error("[cron] reminders failed for a user:", error instanceof Error ? error.message : "unknown");
      }
    }
    cursor = batch[batch.length - 1].id;
  }
  return Response.json({ users, created, failed });
}

