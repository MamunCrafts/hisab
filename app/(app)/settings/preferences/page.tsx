import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { PreferencesForm } from "@/components/settings/preferences-form";
import { SettingsBackLink } from "@/components/settings/settings-back-link";
import { getProfile } from "@/db/queries/profile";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("settings.preferences") };
}

export default async function PreferencesPage() {
  const user = await requireUser();
  const { t } = await getI18n();
  const profile = await getProfile(user.id, user.name);
  return (
    <div className="max-w-2xl">
      <SettingsBackLink />
      <PageHeader title={t("settings.preferences")} description={t("settings.preferencesDescription")} />
      <PreferencesForm
        initial={{ preferredCurrency: profile.preferredCurrency, locale: profile.locale, timezone: profile.timezone, startOfWeek: profile.startOfWeek }}
      />
    </div>
  );
}
