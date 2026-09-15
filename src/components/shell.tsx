"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Compass,
  Home,
  Bookmark,
  User,
} from "lucide-react";
import Identicon from "@/components/ui/identicon";
import { useI18n } from "@/lib/i18n";
import { useWalletState } from "@/lib/wallet-state";
import { ensureDeviceId } from "@/lib/identity";

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full justify-center overflow-hidden bg-card-2/40 dark:bg-black">
      <div className="relative flex h-full w-full max-w-[768px] flex-col overflow-hidden bg-background shadow-2xl">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Avatar({
  size = 34,
  href = "/profile",
  seed,
}: {
  size?: number;
  href?: string;
  seed?: string;
}) {
  const { state } = useWalletState();
  const seedValue = seed ?? state.nimiqAddress ?? (ensureDeviceId() || "triply");
  return (
    <Link href={href} aria-label="Profile">
      <Identicon seed={seedValue} size={size} />
    </Link>
  );
}

export function BrandHeader({
  right,
  subtitle,
}: {
  right?: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="sticky top-0 z-30 flex h-[60px] w-full items-center justify-between bg-background px-5 py-3">
      <div>
        <h1 className="text-[26px] font-extrabold leading-[34px] text-foreground">
          Triply
        </h1>
        {subtitle ? (
          <p className="text-[11px] font-medium text-muted">{subtitle}</p>
        ) : null}
      </div>
      {right}
    </div>
  );
}

export function BackHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  const router = usePathname();
  return (
    <div className="sticky top-0 z-30 flex h-[60px] w-full items-center gap-3 bg-background px-5 py-3">
      <Link
        href={onBack ? "#" : router.split("/").slice(0, -1).join("/") || "/"}
        onClick={onBack}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card-2 text-foreground"
      >
        <ArrowLeft size={16} strokeWidth={2.5} />
      </Link>
      <div className="flex flex-col">
        <h2 className="text-[16px] font-bold leading-[21px] text-foreground">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-[12px] font-normal leading-4 text-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

const TABS = [
  { key: "home", icon: Home, href: "/" },
  { key: "explore", icon: Compass, href: "/stays" },
  { key: "bookmarks", icon: Bookmark, href: "/trips" },
  { key: "profile", icon: User, href: "/profile" },
] as const;

export function BottomTabBar({ active = "Home" }: { active?: string }) {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <>
      <div aria-hidden className="h-[84px] w-full shrink-0" />
      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[768px] -translate-x-1/2 border-t border-border bg-card pb-3 pb-safe">
        <div className="flex h-16 w-full items-center justify-between px-6">
          {TABS.map((tab) => {
            const label = t(tab.key);
            const isActive = active === label || pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className="flex w-16 flex-col items-center gap-1"
              >
                <Icon
                  size={22}
                  strokeWidth={2}
                  className={
                    isActive ? "text-accent-2" : "text-muted"
                  }
                />
                <span
                  className={`text-[10px] leading-[13px] ${
                    isActive ? "font-semibold text-accent-2" : "font-normal text-muted"
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function ScrollContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`w-full ${className}`}>{children}</div>;
}