import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/client";
import { createStarterData } from "@/db/queries/starter";
import { auditLogs, authAccounts, rateLimits, sessions, users, verifications } from "@/db/schema";
import { sendPasswordResetEmail } from "@/lib/email";
import { deleteAllUserAttachments } from "@/lib/storage";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

function resolveBaseUrl(): string | undefined {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return undefined;
}

const trustedOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined,
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined,
].filter((origin): origin is string => Boolean(origin));

function localeFromRequest(request?: Request | null): string {
  const cookie = request?.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${LOCALE_COOKIE}=(\\w+)`));
  return match && isLocale(match[1]) ? match[1] : "en";
}

export const auth = betterAuth({
  appName: "Hisab",
  baseURL: resolveBaseUrl(),
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: authAccounts,
      verification: verifications,
      rateLimit: rateLimits,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, user.name, url);
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // No cookie cache: revoking a session must take effect immediately.
  },
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        await deleteAllUserAttachments(user.id);
      },
      afterDelete: async (user) => {
        // Rows cascade from the user; keep a minimal, PII-free audit record.
        await db.insert(auditLogs).values({ userId: user.id, action: "user.delete", entityType: "user", entityId: user.id });
      },
    },
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === "production" || process.env.AUTH_RATE_LIMIT === "1",
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 8 },
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
      "/reset-password": { window: 300, max: 5 },
      "/change-password": { window: 300, max: 5 },
      "/delete-user": { window: 300, max: 3 },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user, context) => {
          await createStarterData(db, user, localeFromRequest(context?.request));
        },
      },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
