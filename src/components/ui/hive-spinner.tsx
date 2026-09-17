"use client";

/**
 * A hexagonal "hive" spinner with two layers:
 * - a full hexagon ring (faint, currentColor at low opacity) that anchors the shape,
 * - a bright partial segment (accent) that rotates directly along the first,
 *   so the motion stays visible (a plain hexagon has 60° symmetry).
 */
export function HiveSpinner({
  size = 18,
  className = "",
  accent,
}: {
  size?: number;
  className?: string;
  accent?: string;
}) {
  const d = "M32.66 29 L24 34 L15.34 29 L15.34 19 L24 14 L32.66 19 Z";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d={d}
        stroke="currentColor"
        strokeOpacity={0.2}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d={d}
        stroke={accent ?? "currentColor"}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="15 45"
        className="animate-spin"
        style={{ transformOrigin: "50% 50%", transformBox: "fill-box" }}
      />
    </svg>
  );
}