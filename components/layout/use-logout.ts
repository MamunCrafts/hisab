"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { authClient } from "@/lib/auth/client";

export function useLogout() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const logout = () =>
    startTransition(async () => {
      await authClient.signOut();
      router.replace("/login");
      router.refresh();
    });
  return { logout, pending };
}
