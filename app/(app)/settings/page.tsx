import { ChevronRight, Database, Palette, ShieldCheck, Tags, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("settings.title") };
}

const SECTIONS: Array<{ href: string; icon: typeof Tags; title: TranslationKey; description: TranslationKey }> = [
  { href: "/settings/profile", icon: UserRound, title: "settings.profile", description: "settings.profileDescription" },
  { href: "/settings/preferences", icon: Palette, title: "settings.preferences", description: "settings.preferencesDescription" },
  { href: "/settings/categories", icon: Tags, title: "settings.categories", description: "settings.categoriesDescription" },
  { href: "/settings/security", icon: ShieldCheck, title: "settings.security", description: "settings.securityDescription" },
  { href: "/settings/data", icon: Database, title: "settings.data", description: "settings.dataDescription" },
];

export default async function SettingsPage() {
  await requireUser();
  const { t } = await getI18n();
  return (
    <div className="max-w-2xl">
      <PageHeader title={t("settings.title")} description={t("settings.description")} />
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-card">
        {SECTIONS.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="flex items-center gap-4 px-4 py-4 hover:bg-muted/50 focus-visible:bg-muted focus-visible:outline-none">
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <s.icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{t(s.title)}</span>
                <span className="block text-sm text-muted-foreground">{t(s.description)}</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-center text-xs text-muted-foreground">{t("settings.appVersion", { version: "1.0.0" })}</p>
    </div>
  );
}
