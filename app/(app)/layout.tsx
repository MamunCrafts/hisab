import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PrivacyProvider } from "@/components/providers/privacy-provider";
import { QuickAddProvider } from "@/components/layout/quick-add-context";
import { QuickAddSheet } from "@/components/layout/quick-add-sheet";
import { getUnreadCount } from "@/db/queries/notifications";
import { getProfile } from "@/db/queries/profile";
import { requireUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [profile, unread] = await Promise.all([getProfile(user.id, user.name), getUnreadCount(user.id)]);
  if (!profile.onboardingCompletedAt) redirect("/onboarding");

  const shellUser = { name: profile.displayName, email: user.email, image: profile.avatarUrl ? `/api/avatar?v=${profile.updatedAt.getTime()}` : user.image };

  return (
    <PrivacyProvider>
    <QuickAddProvider>
      <AppSidebar user={shellUser} />
      <div className="flex min-h-dvh flex-col md:pl-64 print:pl-0">
        <AppHeader user={shellUser} unread={unread} currency={profile.preferredCurrency} timezone={profile.timezone} />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-28 md:px-8 md:pt-6 md:pb-12 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
      <MobileNav user={shellUser} />
      <QuickAddSheet />
    </QuickAddProvider>
    </PrivacyProvider>
  );
}
