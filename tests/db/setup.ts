import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
// Integration tests run against a separate database.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/hisab_test";
