import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getProfile } from "@/db/queries/profile";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("app.name") };
}

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id, user.name);
  if (profile.onboardingCompletedAt) redirect("/dashboard");
  return <OnboardingFlow name={profile.displayName.split(" ")[0] ?? profile.displayName} />;
}
