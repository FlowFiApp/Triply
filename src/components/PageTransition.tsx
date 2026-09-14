"use client";

import { type ReactNode } from "react";
// import { usePathname } from "next/navigation";

// Replays a subtle fade-in on every route change. Opacity-only (no transform)
// so `position: fixed` children (bottom nav, sheets) stay viewport-anchored.
export default function PageTransition({ children }: { children: ReactNode }) {
  // const pathname = usePathname();
  return (
    // <div key={pathname} className="animate-fade-in">
    <>{children}</>
    // </div>
  );
}
