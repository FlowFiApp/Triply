"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// First-time users are routed through the onboarding flow. Returning users
// land straight on Home.
export default function OnboardingGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/") return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem("triply-onboarded") === "1") return;
    router.replace("/onboarding");
  }, [pathname, router]);

  return null;
}