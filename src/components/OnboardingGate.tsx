"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useProfile } from "@/lib/api/hooks";

// First-time users are routed through the onboarding flow. Returning users
// land straight on Home. Onboarding state is stored on the user (MongoDB).
export default function OnboardingGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { data, isSuccess } = useProfile();

  useEffect(() => {
    if (pathname !== "/") return;
    if (isSuccess && data && !data.onboarded) {
      router.replace("/onboarding");
    }
  }, [pathname, router, isSuccess, data]);

  return null;
}