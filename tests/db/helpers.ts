import "./setup";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export async function migrateTestDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  await migrate(drizzle(pool), { migrationsFolder: "./db/migrations" });
  await pool.end();
}

/** Inserts a bare user + starter data (bypassing the HTTP auth flow). */
export async function createTestUser(name: string) {
  const { db } = await import("@/db/client");
  const { users } = await import("@/db/schema");
  const { createStarterData } = await import("@/db/queries/starter");
  const id = randomUUID();
  await db.insert(users).values({ id, name, email: `${id}@hisab.test` });
  await createStarterData(db, { id, name }, "en");
  return id;
}

export async function categoryId(userId: string, key: string, kind: "EXPENSE" | "INCOME" = "EXPENSE") {
  const { listCategories } = await import("@/db/queries/categories");
  const list = await listCategories(userId, kind);
  const found = list.find((c) => c.systemKey === key);
  if (!found) throw new Error(`category ${key} missing`);
  return found.id;
}
