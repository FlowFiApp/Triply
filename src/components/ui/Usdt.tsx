"use client";

import Image from "next/image";

export function UsdtIcon({
  size = 14,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/usdt.png"
      alt="USDT"
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
      style={{ borderRadius: "50%" }}
    />
  );
}

export function UsdtAmount({
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
      {value.toFixed(2)}
      <UsdtIcon size={iconSize} />
    </span>
  );
}