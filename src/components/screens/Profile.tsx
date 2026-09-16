"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BedDouble,
  Car,
  ChevronRight,
  Copy,
  Pencil,
  Plane,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  BottomTabBar,
  MobileShell,
} from "@/components/shell";
import Identicon from "@/components/ui/identicon";
import { ProgressButton } from "@/components/ui/progress-button";
import { useWalletState } from "@/lib/wallet-state";
import { usePoints } from "@/lib/points";
import { useToast } from "@/lib/toast";
import { useProfile } from "@/lib/api/hooks";
import { NimiqAmount } from "@/components/ui/Nimiq";
import RedeemSheet from "@/components/screens/RedeemSheet";
import EditProfileSheet from "@/components/screens/EditProfileSheet";
import { CHAINS } from "@/lib/wallet";
import { copyNimiqAddress, copyText } from "@/lib/nimiq";
import { identityKey } from "@/lib/identity";

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

function AddressRow({
  label,
  address,
  isNimiq,
}: {
  label: string;
  address?: string;
  isNimiq: boolean;
}) {
  const { toast } = useToast();
  if (!address) {
    return (
      <Row label={label}>
        <span className="text-[11px] text-muted">Not connected</span>
      </Row>
    );
  }
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const copy = () => {
    const ok = isNimiq ? copyNimiqAddress(address) : copyText(address);
    toast(ok ? "success" : "error", ok ? "Address copied." : "Copy failed.");
  };
  return (
    <Row label={label}>
      <button
        onClick={copy}
        className="tap inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground"
      >
        {short}
        <Copy size={12} className="text-muted" />
      </button>
    </Row>
  );
}

export default function Profile() {
  const { state, authState, connectIdentity, disconnect } = useWalletState();
  const { earned, available } = usePoints();
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const username = profile?.username || "Triply Traveler";
  const avatar = profile?.avatar ?? "";
  const signedIn = authState === "authenticated";

  const handleWalletAction = async () => {
    if (signedIn) {
      disconnect();
      toast("success", "Signed out.");
      return;
    }
    try {
      const result = await connectIdentity();
      toast(
        "success",
        result.authenticated
          ? "Signed in with Nimiq."
          : "Open Triply inside Nimiq Pay to sign in.",
      );
    } catch (err) {
      toast(
        "error",
        err instanceof Error ? err.message : "Could not sign in with Nimiq.",
      );
    }
  };

  return (
    <MobileShell>
      <div className="flex min-h-full flex-col justify-between">
        <div className="w-full">
          <div className="flex flex-col items-center gap-2 px-4 pb-4 pt-8">
            <button
              onClick={() => setEditOpen(true)}
              aria-label="Edit profile"
              className="relative"
            >
              <span className="block h-20 w-20 overflow-hidden rounded-full">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt="Avatar"
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Identicon seed={identityKey() || "triply-user"} size={80} />
                )}
              </span>
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-2">
                <Pencil size={13} />
              </span>
            </button>
            <h1 className="text-[20px] font-extrabold text-foreground">
              {username}
            </h1>
            <p className="text-[12px] text-muted">
              {signedIn
                ? "Signed in with Nimiq"
                : "Not signed in"}
            </p>
          </div>

          <div className="flex flex-col gap-3 px-4 py-4">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted">
              Wallet
            </h2>
            <AddressRow
              label="Nimiq"
              address={state.nimiqAddress}
              isNimiq
            />
            <AddressRow
              label={`Polygon (${CHAINS.polygon.name})`}
              address={state.evmAddress}
              isNimiq={false}
            />
            <ProgressButton
              onAction={handleWalletAction}
              busyLabel="Connecting…"
              className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border ${
                signedIn
                  ? "border-border bg-card-2 text-foreground"
                  : "border-accent-2 bg-accent text-accent-2"
              } text-[13px] font-bold`}
            >
              <Wallet size={15} />
              {signedIn ? "Sign Out" : "Sign In with Nimiq"}
            </ProgressButton>
          </div>

          <div className="flex flex-col gap-3 px-4 py-4">
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

          <div className="flex flex-col gap-3 px-4 py-4">
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
              href="/saved-passengers"
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <span className="text-[14px] font-semibold text-foreground">
                Saved Passengers
              </span>
              <UserRound size={16} className="text-accent-fg" />
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
              <Plane size={16} className="text-accent-fg" />
            </Link>
            <Link
              href="/stays"
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <span className="text-[14px] font-semibold text-foreground">
                Book a Stay
              </span>
              <BedDouble size={16} className="text-accent-fg" />
            </Link>
            <Link
              href="/cars"
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <span className="text-[14px] font-semibold text-foreground">
                Rent a Car
              </span>
              <Car size={16} className="text-accent-fg" />
            </Link>
          </div>
        </div>

        <BottomTabBar active="Profile" />
      </div>

      <RedeemSheet open={redeemOpen} onClose={() => setRedeemOpen(false)} />
      <EditProfileSheet
        key={editOpen ? "open" : "closed"}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={{ username: profile?.username ?? "", avatar }}
      />
    </MobileShell>
  );
}