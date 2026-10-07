import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { DataView } from "@/components/settings/data-view";
import { SettingsBackLink } from "@/components/settings/settings-back-link";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("settings.data") };
}

export default async function DataPage() {
  await requireUser();
  const { t } = await getI18n();
  return (
    <div className="max-w-2xl">
      <SettingsBackLink />
      <PageHeader title={t("settings.data")} description={t("settings.dataDescription")} />
      <DataView />
    </div>
  );
}
