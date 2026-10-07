/**
 * Signs up a throwaway user, completes onboarding in the DB, then checks every
 * app page renders (200, no error boundary). Also checks cross-user access to
 * a transaction URL returns 404. Credentials are random and never printed.
 *   pnpm tsx tests/e2e-pages.ts
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: [".env.local", ".env"], quiet: true });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function signUp(name: string) {
  const email = `e2e-${randomBytes(4).toString("hex")}@hisab.test`;
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ name, email, password: randomBytes(12).toString("base64url") }),
  });
  assert.equal(res.status, 200);
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const { rows } = await pool.query("select id from users where email = $1", [email]);
  const userId = rows[0].id as string;
  await pool.query("update profiles set onboarding_completed_at = now() where user_id = $1", [userId]);
  const { rows: acc } = await pool.query(
    "insert into accounts (user_id, name, type, opening_balance) values ($1, 'Cash', 'CASH', 1000) returning id",
    [userId],
  );
  const { rows: cat } = await pool.query("select id from categories where user_id = $1 and system_key = 'food' and kind = 'EXPENSE'", [userId]);
  const { rows: tx } = await pool.query(
    "insert into transactions (user_id, type, amount, account_id, category_id, transaction_date, title) values ($1, 'EXPENSE', 450, $2, $3, current_date, $4) returning id",
    [userId, acc[0].id, cat[0].id, `Lunch ${name}`],
  );
  const { rows: ct } = await pool.query(
    "insert into contacts (user_id, name, avatar_initial) values ($1, 'Rahim Ahmed', 'RA') returning id",
    [userId],
  );
  await pool.query(
    "insert into transactions (user_id, type, amount, account_id, contact_id, transaction_date, due_date) values ($1, 'LEND', 2000, $2, $3, current_date - 10, current_date - 1)",
    [userId, acc[0].id, ct[0].id],
  );
  return { cookie, userId, txId: tx[0].id as string, accountId: acc[0].id as string, contactId: ct[0].id as string };
}

async function get(path: string, cookie: string) {
  return fetch(`${BASE}${path}`, { headers: { Cookie: cookie }, redirect: "manual" });
}

async function main() {
  const alice = await signUp("Alice Page");
  const bob = await signUp("Bob Page");
  const pages = (process.env.E2E_PAGES ??
    "/dashboard,/transactions,/transactions?range=month&q=lunch,/transactions/new?type=LEND,/accounts,/settings/categories,/analytics,/analytics?period=6m,/analytics?period=custom&from=2026-01-01&to=2026-12-31,/budgets,/recurring,/reports,/reports?type=cashflow,/reports?type=category,/reports?type=ledger,/reports?type=receivable,/search,/settings,/settings/profile,/settings/preferences,/settings/security,/settings/data,/terms,/privacy,/offline")
    .split(",")
    .concat([
      `/transactions/${alice.txId}`,
      "/ledger",
      "/ledger?filter=overdue",
      `/ledger/${alice.contactId}`,
      `/ledger/${alice.contactId}/statement?period=month`,
    ]);
  for (const path of pages) {
    const res = await get(path, alice.cookie);
    const html = await res.text();
    assert.equal(res.status, 200, `${path} → ${res.status}`);
    assert.ok(!html.includes("Application error"), `${path} rendered an error`);
    console.log(`✓ ${path}`);
  }
  const csv = await get("/api/export/transactions?range=month", alice.cookie);
  assert.equal(csv.status, 200);
  assert.match(await csv.text(), /Lunch Alice/);
  console.log("✓ CSV export");
  const accountReport = await get(`/reports?type=account&accountId=${alice.accountId}`, alice.cookie);
  assert.equal(accountReport.status, 200);
  const reportCsv = await get(`/api/export/report?type=account&accountId=${alice.accountId}&from=2026-01-01&to=2026-12-31`, alice.cookie);
  assert.match(await reportCsv.text(), /Opening|শুরুর/);
  const backup = await (await get("/api/export/data", alice.cookie)).json();
  assert.equal(backup.format, "hisab.backup");
  assert.equal(backup.transactions.length, 2);
  assert.ok(!JSON.stringify(backup).includes("password"), "backup must not contain secrets");
  console.log("✓ report CSV + JSON backup");

  const denied = await fetch(`${BASE}/api/cron/reminders`);
  assert.equal(denied.status, 401, "cron must require the secret");
  const cron = await fetch(`${BASE}/api/cron/reminders`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
  assert.equal(cron.status, 200);
  const { rows: notes } = await pool.query("select type, dedupe_key from notifications where user_id = $1", [alice.userId]);
  assert.ok(notes.some((n) => n.type === "DEBT_OVERDUE"), "overdue reminder created");
  const again = await fetch(`${BASE}/api/cron/reminders`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
  assert.equal(again.status, 200);
  const { rows: notes2 } = await pool.query("select count(*)::int as n from notifications where user_id = $1", [alice.userId]);
  assert.equal(notes2[0].n, notes.length, "cron is idempotent");
  for (const path of ["/manifest.webmanifest", "/icons/192", "/sw.js"]) {
    const res = await fetch(`${BASE}${path}`);
    assert.equal(res.status, 200, path);
  }
  console.log("✓ cron reminders (auth, idempotent) + PWA assets");

  const cross = await get(`/transactions/${alice.txId}`, bob.cookie);
  const crossHtml = await cross.text();
  assert.ok(!crossHtml.includes(`Lunch Alice`), "Bob must never receive Alice's data");
  assert.equal(cross.status, 404, `Bob must not see Alice's transaction (status ${cross.status})`);
  const crossCsv = await (await get("/api/export/transactions", bob.cookie)).text();
  assert.ok(crossCsv.includes("Lunch Bob") && !crossCsv.includes("Lunch Alice"), "Bob's export must not include Alice's data");
  for (const path of [`/ledger/${alice.contactId}`, `/ledger/${alice.contactId}/statement`]) {
    const res = await get(path, bob.cookie);
    assert.equal(res.status, 404, `Bob must not open ${path}`);
  }
  console.log("✓ cross-user access blocked (404 / not exported)");
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
