"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BedDouble,
  Car,
  ChevronRight,
  Copy,
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
import { usePoints } from "@/lib/points";
import { useToast } from "@/lib/toast";
import { NimiqAmount } from "@/components/ui/Nimiq";
import RedeemSheet from "@/components/screens/RedeemSheet";
import { CHAINS } from "@/lib/wallet";
import { copyNimiqAddress, copyText } from "@/lib/nimiq";

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
  const { earned, available } = usePoints();
  const { toast } = useToast();
  const [redeemOpen, setRedeemOpen] = useState(false);
  const walletAddr = state.nimiqAddress ?? state.evmAddress;
  const short = walletAddr
    ? `${walletAddr.slice(0, 6)}…${walletAddr.slice(-4)}`
    : null;

  const copyAddress = () => {
    if (!walletAddr) return;
    const ok = state.nimiqAddress
      ? copyNimiqAddress(state.nimiqAddress)
      : copyText(walletAddr);
    toast(ok ? "success" : "error", ok ? "Address copied." : "Copy failed.");
  };

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
              {short ? (
                <button onClick={copyAddress} className="tap inline-flex items-center gap-1 font-semibold text-foreground">
                  {short} · {CHAINS.polygon.name}
                  <Copy size={12} className="text-muted" />
                </button>
              ) : (
                "No wallet connected"
              )}
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
              <div className="flex items-center gap-2">
                {state.connected ? (
                  <button
                    onClick={copyAddress}
                    aria-label="Copy address"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card-2 text-foreground"
                  >
                    <Copy size={13} />
                  </button>
                ) : null}
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
              </div>
            </Row>
          </div>

          <div className="flex flex-col gap-3 px-5 py-4">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted">
              Nimiq Points
            </h2>
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">
                  Points available
                </span>
                <span className="text-[18px] font-extrabold text-foreground">
                  <NimiqAmount value={available} iconSize={18} />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted">Points earned</span>
                <span className="text-[12px] font-semibold text-foreground">
                  {earned.toLocaleString()} NIM
                </span>
              </div>
              <button
                onClick={() => setRedeemOpen(true)}
                disabled={available <= 0}
                className="tap flex h-11 w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[14px] font-bold text-accent-2 disabled:opacity-50"
              >
                Redeem Points
              </button>
            </div>
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
              href="/onboarding"
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <span className="text-[14px] font-semibold text-foreground">
                Onboarding
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

      <RedeemSheet open={redeemOpen} onClose={() => setRedeemOpen(false)} />
    </MobileShell>
  );
}