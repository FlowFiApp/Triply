"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Wallet } from "lucide-react";
import { useWalletState } from "@/lib/wallet-state";
import { useToast } from "@/lib/toast";

/**
 * A mutation CTA that requires a signed-in Nimiq identity. When the user is
 * not authenticated, the button shows "Connect Wallet" and triggers the sign-in
 * first; once authenticated it flips to the real action.
 */
export function AuthActionButton({
  onAction,
  children,
  className,
  disabled = false,
  busyLabel = "Connecting…",
}: {
  onAction: () => void | Promise<void>;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  busyLabel?: string;
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label">) {
  const { authState, connectIdentity } = useWalletState();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const authenticated = authState === "authenticated";

  const handle = async () => {
    if (busy) return;
    if (!authenticated) {
      setBusy(true);
      try {
        const result = await connectIdentity();
        if (result.authenticated) return;
      } catch {
        // fall through
      } finally {
        setBusy(false);
      }
      toast(
        "info",
        "Sign in with Nimiq Pay to continue — open Triply inside Nimiq Pay.",
      );
      return;
    }
    await onAction();
  };

  return (
    <button
      onClick={handle}
      disabled={disabled || busy}
      className={className}
      aria-label={authenticated ? undefined : "Connect Wallet"}
    >
      {busy ? (
        busyLabel
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