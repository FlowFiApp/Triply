"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Wallet } from "lucide-react";
import { HiveSpinner } from "@/components/ui/hive-spinner";
import { useWalletState } from "@/lib/wallet-state";
import { useToast } from "@/lib/toast";

/**
 * A mutation CTA that requires a signed-in Nimiq identity. When the user is
 * not authenticated, the button shows "Connect Wallet" and triggers the sign-in
 * first; once authenticated it flips to the real action. While the action (or
 * the identity connect) is in flight, a spinner is shown instead of the label.
 */
export function AuthActionButton({
  onAction,
  children,
  className,
  disabled = false,
  busy = false,
  busyLabel = "Connecting…",
}: {
  onAction: () => void | Promise<void>;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  busy?: boolean;
  busyLabel?: string;
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label">) {
  const { authState, connectIdentity } = useWalletState();
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);
  const authenticated = authState === "authenticated";
  const isLoading = connecting || busy;

  const handle = async () => {
    if (isLoading) return;
    if (!authenticated) {
      setConnecting(true);
      try {
        const result = await connectIdentity();
        if (result.authenticated) return;
      } catch {
        // fall through
      } finally {
        setConnecting(false);
      }
      toast(
        "info",
        "Sign in with Nimiq Pay to continue — open Triply inside Nimiq Pay.",
      );
      return;
    }
    setConnecting(true);
    try {
      await onAction();
    } finally {
      setConnecting(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={disabled || isLoading}
      className={className}
      aria-label={authenticated ? undefined : "Connect Wallet"}
    >
      {isLoading ? (
        <>
          <HiveSpinner size={22} />
          <span>{busyLabel}</span>
        </>
      ) : !authenticated ? (
        <>
          <Wallet size={16} />
          Connect Wallet
        </>
      ) : (
        children
      )}
    </button>
  );
}