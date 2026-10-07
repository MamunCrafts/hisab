/** Times authenticated pages (server response, full body). Random credentials, never printed. */
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: [".env.local", ".env"], quiet: true });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const email = `perf-${randomBytes(4).toString("hex")}@hisab.test`;
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ name: "Perf", email, password: randomBytes(12).toString("base64url") }),
  });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const { rows } = await pool.query("select id from users where email=$1", [email]);
  const uid = rows[0].id;
  await pool.query("update profiles set onboarding_completed_at=now() where user_id=$1", [uid]);
  const { rows: acc } = await pool.query("insert into accounts (user_id,name,type,opening_balance) values ($1,'Cash','CASH',100000) returning id", [uid]);
  const { rows: cat } = await pool.query("select id from categories where user_id=$1 and kind='EXPENSE' limit 1", [uid]);
  // ~2,000 transactions across the year
  await pool.query(
    `insert into transactions (user_id,type,amount,account_id,category_id,transaction_date,title)
     select $1,'EXPENSE',(random()*1000+10)::numeric(18,2),$2,$3,current_date - (g % 365),'Item '||g from generate_series(1,2000) g`,
    [uid, acc[0].id, cat[0].id],
  );
  const pages = ["/dashboard", "/transactions", "/ledger", "/analytics", "/analytics?period=year", "/accounts", "/budgets", "/reports"];
  for (const p of pages) {
    const times: number[] = [];
    for (let i = 0; i < 4; i++) {
      const t0 = performance.now();
      const r = await fetch(`${BASE}${p}`, { headers: { Cookie: cookie } });
      await r.text();
      times.push(performance.now() - t0);
    }
    console.log(`${p.padEnd(24)} first ${times[0].toFixed(0)}ms  warm ${(times.slice(1).reduce((a, b) => a + b, 0) / 3).toFixed(0)}ms`);
  }
  await pool.end();
}
main();
