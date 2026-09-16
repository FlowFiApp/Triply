"use client";

/**
 * A hexagonal "hive" spinner: a rotating hexagon ring with a brightened
 * segment so the rotation stays visible (a plain hexagon has 60° symmetry
 * and looks static while spinning).
 */
export function HiveSpinner({
  size = 18,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={`animate-spin ${className}`}
    >
      <path
        d="M32.66 29 L24 34 L15.34 29 L15.34 19 L24 14 L32.66 19 Z"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="16 44"
      />
    </svg>
  );
}