import { CheckCircle2, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/settings/language-switcher";
import { getCurrentUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { t } = await getI18n();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Logo label={t("app.name")} className="[&_rect]:fill-primary-foreground [&_path]:stroke-primary" />
        <div className="max-w-md space-y-6">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight">{t("auth.heroTitle")}</h1>
          <p className="text-lg text-primary-foreground/80">{t("auth.heroBody")}</p>
          <ul className="space-y-3 text-primary-foreground/90">
            {(["auth.heroPoint1", "auth.heroPoint2", "auth.heroPoint3"] as const).map((key) => (
              <li key={key} className="flex items-center gap-3">
                <CheckCircle2 className="size-5 shrink-0 opacity-80" aria-hidden />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
        <p className="flex items-center gap-2 text-sm text-primary-foreground/70">
          <ShieldCheck className="size-4" aria-hidden />
          {t("auth.secureNote")}
        </p>
        <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full border-[48px] border-primary-foreground/5" />
      </aside>
      <main className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo label={t("app.name")} className="lg:invisible" />
          <LanguageToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground lg:hidden">
          <ShieldCheck className="size-3.5" aria-hidden />
          {t("auth.secureNote")}
        </p>
      </main>
    </div>
  );
}
