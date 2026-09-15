"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Compass,
  GalleryHorizontal,
  Home,
  Bookmark,
  User,
} from "lucide-react";
import Identicon from "@/components/ui/identicon";
import TriplyLogo from "@/components/ui/triply-logo";
import { useI18n } from "@/lib/i18n";
import { useWalletState } from "@/lib/wallet-state";
import { useProfile } from "@/lib/api/hooks";
import { getDeviceId } from "@/lib/identity";

export function MobileShell({
  children,
  header,
}: {
  children: ReactNode;
  header?: ReactNode;
}) {
  return (
    <div className="flex h-screen w-full justify-center overflow-hidden bg-card-2/40 dark:bg-black">
      <div className="relative flex h-full w-full max-w-[768px] flex-col overflow-hidden bg-background shadow-2xl">
        {header ? (
          <div className="relative w-full shrink-0 bg-background">
            {header}
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-clip overscroll-contain">
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
  const { data: profile } = useProfile();
  const seedValue = seed ?? state.nimiqAddress ?? (getDeviceId() || "triply");
  const avatarSrc = profile?.avatar;
  return (
    <Link href={href} aria-label="Profile">
      <span
        className="block overflow-hidden rounded-full"
        style={{ width: size, height: size }}
      >
        {avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarSrc}
            alt="Avatar"
            width={size}
            height={size}
            className="h-full w-full object-cover"
          />
        ) : (
          <Identicon seed={seedValue} size={size} />
        )}
      </span>
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
    <div className="flex h-[60px] w-full items-center justify-between bg-background px-4 py-3">
      <div>
        <TriplyLogo size={30} />
        {subtitle ? (
          <p className="mt-0.5 text-[11px] font-medium text-muted">{subtitle}</p>
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
    <div className="flex h-[60px] w-full items-center gap-3 bg-background px-4 py-3">
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
  { key: "home", icon: Home, href: "/", center: false },
  { key: "explore", icon: Compass, href: "/stays", center: false },
  { key: "feed", icon: GalleryHorizontal, href: "/feed", center: true },
  { key: "bookmarks", icon: Bookmark, href: "/trips", center: false },
  { key: "profile", icon: User, href: "/profile", center: false },
] as const;

export function BottomTabBar({ active = "Home" }: { active?: string }) {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <>
      <div aria-hidden className="h-[84px] w-full shrink-0" />
      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[768px] -translate-x-1/2 border-t border-border bg-card pb-[calc(18px+env(safe-area-inset-bottom))]">
        <div className="flex h-16 w-full items-center justify-between px-4">
          {TABS.map((tab) => {
            const label = t(tab.key);
            const isActive = active === label || pathname === tab.href;
            const Icon = tab.icon;
            if (tab.center) {
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className="relative -top-4 flex w-16 flex-col items-center gap-1"
                >
                  <span className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-accent shadow-[0_4px_8px_rgba(0,0,0,0.20)]">
                    <Icon size={22} className="text-accent-2" />
                  </span>
                  <span className="text-[10px] leading-[13px] font-semibold text-accent-2">
                    {label}
                  </span>
                </Link>
              );
            }
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
                    isActive ? "text-accent-fg" : "text-muted"
                  }
                />
                <span
                  className={`text-[10px] leading-[13px] ${
                    isActive ? "font-semibold text-accent-fg" : "font-normal text-muted"
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