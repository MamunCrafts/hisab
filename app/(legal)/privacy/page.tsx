import type { Metadata } from "next";
import { formatDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("legal.privacyTitle") };
}

export default async function PrivacyPage() {
  const { t, locale } = await getI18n();
  return (
    <article className="space-y-4 leading-relaxed">
      <h1 className="text-3xl font-semibold tracking-tight">{t("legal.privacyTitle")}</h1>
      <p className="text-sm text-muted-foreground">{t("legal.updated", { date: formatDate("2026-10-07", locale) })}</p>
      {(["legal.privacy1", "legal.privacy2", "legal.privacy3", "legal.privacy4"] as const).map((key) => (
        <p key={key}>{t(key)}</p>
      ))}
    </article>
  );
}
