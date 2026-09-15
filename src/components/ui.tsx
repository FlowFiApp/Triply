"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { X } from "lucide-react";

export function Chip({
  children,
  active = false,
  className = "",
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`tap flex h-8 shrink-0 items-center rounded-full border px-3 text-[12px] font-semibold transition ${
        active
          ? "border-border bg-accent-2 text-accent"
          : "border-border bg-card text-foreground"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  className = "",
  disabled,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`tap flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent-2 bg-accent px-4 text-[15px] font-bold text-on-accent transition disabled:opacity-60 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function SubtleButton({
  children,
  className = "",
  onClick,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`tap flex h-[37px] w-full items-center justify-center rounded-lg border border-border bg-card-2 text-[13px] font-semibold text-foreground transition disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function PricePill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-[19px] items-center rounded px-2 py-0.5 text-[9px] font-bold tracking-wide text-accent-2 bg-accent ${className}`}
    >
      {children}
    </span>
  );
}

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-[21px] items-center rounded-md border border-border bg-card-2 px-2 text-[10px] font-semibold text-accent-fg ${className}`}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`text-[15px] font-bold text-foreground ${className}`}>
      {children}
    </h2>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold leading-[14.6px] text-muted">
      {children}
    </p>
  );
}

export function InputShell({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex h-[43px] w-full cursor-pointer items-center justify-between rounded-[10px] border border-border bg-card px-3 ${className}`}
    >
      {children}
    </div>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <div className={`h-px w-full bg-border ${className}`} />;
}

export function Sheet({
  open,
  onClose,
  children,
  height,
  footer,
  zIndex = "z-[90]",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  height?: string;
  footer?: ReactNode;
  zIndex?: string;
}) {
  if (!open) return null;
  return (
    <div className={`fixed inset-0 ${zIndex} flex items-end justify-center`}>
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/60 animate-fade-in"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-[768px] flex-col rounded-t-2xl border-t border-border bg-card animate-sheet-up"
        style={height ? { height } : undefined}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-muted/50" />
        <button
          onClick={onClose}
          aria-label="Close sheet"
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-card-2 text-muted"
        >
          <X size={16} />
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-4 no-scrollbar">
          {children}
          {footer ? null : <div className="h-8 w-full" />}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SheetHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="px-5 pb-4 pt-2">
      <h2 className="text-[18px] font-extrabold leading-6 text-foreground">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-1 text-[12px] text-muted">{subtitle}</p>
      ) : null}
    </div>
  );
}

export function IconCircle({
  children,
  size = 32,
  className = "",
}: {
  children: ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`flex items-center justify-center rounded-full border border-border bg-card-2 text-foreground ${className}`}
    >
      {children}
    </div>
  );
}