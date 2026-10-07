import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.createAccount") };
}

export default function SignupPage() {
  return <SignupForm />;
}
