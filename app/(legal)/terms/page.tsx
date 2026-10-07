import type { Metadata } from "next";
import { formatDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("legal.termsTitle") };
}

export default async function TermsPage() {
  const { t, locale } = await getI18n();
  return (
    <article className="space-y-4 leading-relaxed">
      <h1 className="text-3xl font-semibold tracking-tight">{t("legal.termsTitle")}</h1>
      <p className="text-sm text-muted-foreground">{t("legal.updated", { date: formatDate("2026-10-07", locale) })}</p>
      {(["legal.terms1", "legal.terms2", "legal.terms3", "legal.terms4"] as const).map((key) => (
        <p key={key}>{t(key)}</p>
      ))}
    </article>
  );
}
