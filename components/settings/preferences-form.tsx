"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { setThemeAction } from "@/actions/preferences";
import { updatePreferencesAction } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LOCALE_LABELS, SUPPORTED_CURRENCIES, TIMEZONES } from "@/lib/constants";
import { LOCALES } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

type Prefs = { preferredCurrency: string; locale: string; timezone: string; startOfWeek: number };

const THEMES = [
  { value: "light", icon: Sun, label: "theme.light" },
  { value: "dark", icon: Moon, label: "theme.dark" },
  { value: "system", icon: Monitor, label: "theme.system" },
] as const;

export function PreferencesForm({ initial }: { initial: Prefs }) {
  const { t } = useI18n();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  const weekdays = t("settings.weekdays").split(",");

  const row = (id: string, label: string, control: React.ReactNode) => (
    <div className="grid gap-1.5 sm:grid-cols-[200px_1fr] sm:items-center">
      <Label htmlFor={id}>{label}</Label>
      {control}
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-base font-semibold">{t("settings.appearance")}</h2>
          <div role="radiogroup" aria-label={t("settings.appearance")} className="grid grid-cols-3 gap-2">
            {THEMES.map((option) => {
              const active = mounted && theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setTheme(option.value);
                    void setThemeAction(option.value);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-sm font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    active ? "border-primary bg-accent/60" : "hover:bg-muted/60",
                  )}
                >
                  <option.icon className="size-5" aria-hidden />
                  {t(option.label as TranslationKey)}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const result = await updatePreferencesAction(values);
                if (!result.ok) return void toast.error(t(result.error as TranslationKey));
                toast.success(t("settings.saved"));
                router.refresh();
              });
            }}
          >
            <h2 className="text-base font-semibold">{t("settings.preferences")}</h2>
            {row(
              "p-lang",
              t("settings.language"),
              <Select value={values.locale} onValueChange={(v) => setValues((s) => ({ ...s, locale: v }))}>
                <SelectTrigger id="p-lang" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOCALES.map((l) => <SelectItem key={l} value={l}>{LOCALE_LABELS[l]}</SelectItem>)}
                </SelectContent>
              </Select>,
            )}
            {row(
              "p-cur",
              t("settings.currency"),
              <Select value={values.preferredCurrency} onValueChange={(v) => setValues((s) => ({ ...s, preferredCurrency: v }))}>
                <SelectTrigger id="p-cur" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c === "BDT" ? "BDT (৳)" : c}</SelectItem>)}
                </SelectContent>
              </Select>,
            )}
            {row(
              "p-tz",
              t("settings.timezone"),
              <Select value={values.timezone} onValueChange={(v) => setValues((s) => ({ ...s, timezone: v }))}>
                <SelectTrigger id="p-tz" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                </SelectContent>
              </Select>,
            )}
            {row(
              "p-week",
              t("settings.startOfWeek"),
              <Select value={String(values.startOfWeek)} onValueChange={(v) => setValues((s) => ({ ...s, startOfWeek: Number(v) }))}>
                <SelectTrigger id="p-week" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {weekdays.map((d, i) => <SelectItem key={d} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>,
            )}
            <Button type="submit" disabled={pending}>{pending ? t("common.saving") : t("common.save")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
