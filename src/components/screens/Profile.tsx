"use client";

import Link from "next/link";
import {
  BedDouble,
  Car,
  ChevronRight,
  Moon,
  Plane,
  Sun,
  Wallet,
} from "lucide-react";
import {
  Avatar,
  BottomTabBar,
  MobileShell,
} from "@/components/shell";
import { useTheme } from "@/lib/theme";
import { useWalletState } from "@/lib/wallet-state";
import { CHAINS } from "@/lib/wallet";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5">
      <span className="text-[14px] font-semibold text-foreground">{label}</span>
      {children}
    </div>
  );
}

export default function Profile() {
  const { theme, setTheme } = useTheme();
  const { state, connect, disconnect } = useWalletState();
  const short = state.address
    ? `${state.address.slice(0, 6)}…${state.address.slice(-4)}`
    : null;

  return (
    <MobileShell>
      <div className="flex min-h-screen flex-col justify-between">
        <div className="w-full">
          <div className="flex flex-col items-center gap-2 px-5 pb-4 pt-8">
            <Avatar size={80} href="/profile" />
            <h1 className="text-[20px] font-extrabold text-foreground">
              Triply Traveler
            </h1>
            <p className="text-[12px] text-muted">
              {short ? `${short} · ${CHAINS[state.chain ?? "base"].name}` : "No wallet connected"}
            </p>
          </div>

          <div className="flex flex-col gap-3 px-5 py-4">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted">
              Appearance
            </h2>
            <Row label="Theme">
              <div className="flex items-center gap-1 rounded-full border border-border bg-card-2 p-1">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex h-7 items-center gap-1 rounded-full px-3 text-[12px] font-semibold ${
                    theme === "light"
                      ? "bg-accent-2 text-accent"
                      : "text-muted"
                  }`}
                >
                  <Sun size={13} /> Light
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex h-7 items-center gap-1 rounded-full px-3 text-[12px] font-semibold ${
                    theme === "dark"
                      ? "bg-accent-2 text-accent"
                      : "text-muted"
                  }`}
                >
                  <Moon size={13} /> Dark
                </button>
              </div>
            </Row>
          </div>

          <div className="flex flex-col gap-3 px-5 py-4">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted">
              Wallet
            </h2>
            <Row label={short ?? "Connect wallet"}>
              <button
                onClick={() => (state.connected ? disconnect() : connect())}
                className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold ${
                  state.connected
                    ? "border border-border bg-card-2 text-foreground"
                    : "bg-accent text-accent-2"
                }`}
              >
                <Wallet size={13} />
                {state.connected ? "Disconnect" : "Connect"}
              </button>
            </Row>
          </div>

          <div className="flex flex-col gap-3 px-5 py-4">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted">
              More
            </h2>
            <Link
              href="/trips"
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <span className="text-[14px] font-semibold text-foreground">
                My Bookings
              </span>
              <ChevronRight size={16} className="text-muted" />
            </Link>
            <Link
              href="/designs"
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <span className="text-[14px] font-semibold text-foreground">
                Design Gallery
              </span>
              <ChevronRight size={16} className="text-muted" />
            </Link>
            <Link
              href="/onboarding"
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <span className="text-[14px] font-semibold text-foreground">
                Onboarding
              </span>
              <ChevronRight size={16} className="text-muted" />
            </Link>
            <Link
              href="/webhooks"
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <span className="text-[14px] font-semibold text-foreground">
                Webhooks
              </span>
              <ChevronRight size={16} className="text-muted" />
            </Link>
            <Link
              href="/search"
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <span className="text-[14px] font-semibold text-foreground">
                Search Flights
              </span>
              <Plane size={16} className="text-accent-2" />
            </Link>
            <Link
              href="/stays"
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <span className="text-[14px] font-semibold text-foreground">
                Book a Stay
              </span>
              <BedDouble size={16} className="text-accent-2" />
            </Link>
            <Link
              href="/cars"
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <span className="text-[14px] font-semibold text-foreground">
                Rent a Car
              </span>
              <Car size={16} className="text-accent-2" />
            </Link>
          </div>
        </div>

        <BottomTabBar active="Profile" />
      </div>
    </MobileShell>
  );
}