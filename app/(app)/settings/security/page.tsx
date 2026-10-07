import { and, desc, eq, gt } from "drizzle-orm";
import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { SecurityView } from "@/components/settings/security-view";
import { SettingsBackLink } from "@/components/settings/settings-back-link";
import { db } from "@/db/client";
import { getUserSettings } from "@/db/queries/profile";
import { sessions } from "@/db/schema";
import { getSession, requireUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("settings.security") };
}

export default async function SecurityPage() {
  const user = await requireUser();
  const { t } = await getI18n();
  const [current, settings] = await Promise.all([getSession(), getUserSettings(user.id)]);
  // Session tokens never leave the server; the UI only gets ids and device info.
  const rows = await db
    .select({ id: sessions.id, userAgent: sessions.userAgent, ipAddress: sessions.ipAddress, updatedAt: sessions.updatedAt })
    .from(sessions)
    .where(and(eq(sessions.userId, user.id), gt(sessions.expiresAt, new Date())))
    .orderBy(desc(sessions.updatedAt));
  return (
    <div className="max-w-2xl">
      <SettingsBackLink />
      <PageHeader title={t("settings.security")} description={t("settings.securityDescription")} />
      <SecurityView
        timezone={settings.timezone}
        sessions={rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString(), current: r.id === current?.session.id }))}
      />
    </div>
  );
}
