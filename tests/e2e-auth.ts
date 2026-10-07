/**
 * End-to-end auth checks against a running server (default http://localhost:3000).
 * Credentials are generated randomly per run and never printed.
 *   pnpm tsx tests/e2e-auth.ts
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: [".env.local", ".env"], quiet: true });

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const email = `e2e-${randomBytes(4).toString("hex")}@hisab.test`;
const password = randomBytes(12).toString("base64url");

function cookieFrom(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

async function api(path: string, body: unknown, cookie = "") {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE, Cookie: cookie },
    body: JSON.stringify(body),
    redirect: "manual",
  });
}

async function page(path: string, cookie = "") {
  return fetch(`${BASE}${path}`, { headers: { Cookie: cookie }, redirect: "manual" });
}

async function step(name: string, fn: () => Promise<void>) {
  await fn();
  console.log(`✓ ${name}`);
}

async function main() {
  let cookie = "";

  await step("anonymous /dashboard redirects to /login", async () => {
    const res = await page("/dashboard");
    assert.equal(res.status, 307);
    assert.match(res.headers.get("location") ?? "", /\/login/);
  });

  await step("anonymous /transactions keeps next param", async () => {
    const res = await page("/transactions?type=EXPENSE");
    assert.match(res.headers.get("location") ?? "", /\/login\?next=%2Ftransactions/);
  });

  await step("signup creates a session", async () => {
    const res = await api("/api/auth/sign-up/email", { name: "E2E Tester", email, password });
    assert.equal(res.status, 200, await res.clone().text());
    cookie = cookieFrom(res);
    assert.ok(cookie.includes("session_token"));
  });

  await step("starter data created (profile + 19 categories)", async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const { rows } = await pool.query(
      `select (select count(*) from profiles p where p.user_id = u.id)::int as profiles,
              (select count(*) from categories c where c.user_id = u.id)::int as categories
         from users u where u.email = $1`,
      [email],
    );
    await pool.end();
    assert.deepEqual(rows[0], { profiles: 1, categories: 19 });
  });

  await step("duplicate email is rejected", async () => {
    const res = await api("/api/auth/sign-up/email", { name: "Dup", email, password });
    assert.notEqual(res.status, 200);
    const body = (await res.json()) as { code?: string };
    assert.match(body.code ?? "", /USER_ALREADY_EXISTS/);
  });

  await step("new user is sent to onboarding", async () => {
    const res = await page("/dashboard", cookie);
    assert.equal(res.status, 307);
    assert.match(res.headers.get("location") ?? "", /\/onboarding/);
    const onboarding = await page("/onboarding", cookie);
    assert.equal(onboarding.status, 200);
  });

  await step("signed-in user visiting /login goes to /dashboard", async () => {
    const res = await page("/login", cookie);
    assert.equal(res.status, 307);
    assert.match(res.headers.get("location") ?? "", /\/dashboard/);
  });

  await step("sign out invalidates the session", async () => {
    const res = await api("/api/auth/sign-out", {}, cookie);
    assert.equal(res.status, 200);
    const after = await page("/onboarding", cookie);
    assert.equal(after.status, 307);
    assert.match(after.headers.get("location") ?? "", /\/login/);
  });

  await step("wrong password is rejected", async () => {
    const res = await api("/api/auth/sign-in/email", { email, password: `${password}x` });
    assert.equal(res.status, 401);
  });

  await step("correct password signs in (session persists across requests)", async () => {
    const res = await api("/api/auth/sign-in/email", { email, password, rememberMe: true });
    assert.equal(res.status, 200);
    cookie = cookieFrom(res);
    const session = await fetch(`${BASE}/api/auth/get-session`, { headers: { Cookie: cookie } });
    const body = (await session.json()) as { user?: { email: string } };
    assert.equal(body.user?.email, email);
  });

  await step("password reset request does not reveal account existence", async () => {
    const known = await api("/api/auth/request-password-reset", { email, redirectTo: "/reset-password" });
    const unknown = await api("/api/auth/request-password-reset", {
      email: `nobody-${randomBytes(4).toString("hex")}@hisab.test`,
      redirectTo: "/reset-password",
    });
    assert.equal(known.status, unknown.status);
    assert.deepEqual(await known.json(), await unknown.json());
  });

  console.log("\nAll auth checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
