import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ProfileForm } from "@/components/settings/profile-form";
import { SettingsBackLink } from "@/components/settings/settings-back-link";
import { getProfile } from "@/db/queries/profile";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("settings.profileTitle") };
}

export default async function ProfileSettingsPage() {
  const user = await requireUser();
  const { t } = await getI18n();
  const profile = await getProfile(user.id, user.name);
  return (
    <div className="max-w-2xl">
      <SettingsBackLink />
      <PageHeader title={t("settings.profileTitle")} description={t("settings.profileDescription")} />
      <ProfileForm
        name={profile.displayName}
        email={user.email}
        avatar={profile.avatarUrl ? `/api/avatar?v=${profile.updatedAt.getTime()}` : null}
      />
    </div>
  );
}
