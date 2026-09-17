"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { HiveSpinner } from "@/components/ui/hive-spinner";

/**
 * A button that shows an inline spinner while its async action is in flight.
 * Pass `busy` to drive the spinner externally (e.g. a react-query isPending);
 * otherwise the component tracks the promise returned by `onAction` itself.
 */
export function ProgressButton({
  onAction,
  busy,
  busyLabel,
  children,
  disabled,
  className,
  type = "button",
  ...rest
}: {
  onAction?: () => void | Promise<void>;
  busy?: boolean;
  busyLabel?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const [pending, setPending] = useState(false);
  const isLoading = Boolean(busy) || pending;

  const handle = async () => {
    if (isLoading || !onAction) return;
    setPending(true);
    try {
      await onAction();
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type={type}
      onClick={handle}
      disabled={disabled || isLoading}
      className={className}
      {...rest}
    >
      {isLoading ? (
        <>
          <HiveSpinner size={26} />
          {busyLabel ? <span>{busyLabel}</span> : null}
        </>
      ) : (
        children
      )}
    </button>
  );
}