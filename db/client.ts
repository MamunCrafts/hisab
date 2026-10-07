import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 10_000,
  });
  // Lets Vercel Fluid compute release idle clients before a function suspends.
  attachDatabasePool(pool);
  return pool;
}

const globalForDb = globalThis as unknown as { hisabPool?: Pool };
export const pool = globalForDb.hisabPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.hisabPool = pool;

export const db = drizzle(pool, { schema });
export type Database = typeof db;
export type DbTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Either the root client or an open transaction. */
export type DbExecutor = Database | DbTransaction;
