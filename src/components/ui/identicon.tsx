"use client";

import { useEffect, useState } from "react";
import Identicons from "@nimiq/identicons";

export default function Identicon({
  seed,
  size = 32,
  className = "",
  rounded = true,
}: {
  seed: string;
  size?: number;
  className?: string;
  rounded?: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    Identicons.toDataUrl(seed)
      .then((d) => {
        if (!ignore) setSrc(d);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [seed]);

  return (
    <span
      className={`block shrink-0 overflow-hidden ${rounded ? "rounded-full" : "rounded-lg"} ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="shimmer block h-full w-full" />
      )}
    </span>
  );
}