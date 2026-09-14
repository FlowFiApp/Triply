"use client";

import Image from "next/image";
import { formatAmount } from "@/lib/nimiq";

export function NimiqIcon({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/nimiq.png"
      alt="NIM"
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
      style={{ borderRadius: "50%" }}
    />
  );
}

export function NimiqAmount({
  value,
  className = "",
  iconSize = 16,
}: {
  value: number;
  className?: string;
  iconSize?: number;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {formatAmount(value, 0)}
      <NimiqIcon size={iconSize} />
    </span>
  );
}