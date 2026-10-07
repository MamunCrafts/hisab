import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/settings/language-switcher";
import { getI18n } from "@/lib/i18n/server";

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="rounded-lg">
          <Logo label={t("app.name")} />
        </Link>
        <LanguageToggle />
      </header>
      <main className="py-10">{children}</main>
    </div>
  );
}
