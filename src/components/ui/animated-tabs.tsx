"use client";

import { motion } from "framer-motion";

/**
 * Segmented tabs with a sliding active background (framer-motion layoutId).
 * Each instance needs a unique `id` so shared layout animations don't clash.
 */
export default function AnimatedTabs({
  id,
  options,
  value,
  onChange,
  className = "",
  activeClassName = "bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)]",
  selectedTextClassName = "text-foreground",
}: {
  id: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  activeClassName?: string;
  selectedTextClassName?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-[10px] bg-card-2 p-[3px] ${className}`}
    >
      {options.map((opt) => {
        const selected = opt === value;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`relative flex h-[33px] flex-1 items-center justify-center overflow-hidden rounded-lg text-[13px] leading-[17px] transition-colors duration-200 ${
              selected
                ? `font-semibold ${selectedTextClassName}`
                : "font-medium text-muted"
            }`}
          >
            {selected ? (
              <motion.span
                layoutId={`${id}-active-tab`}
                className={`absolute inset-0 rounded-lg ${activeClassName}`}
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            ) : null}
            <span className="relative z-10">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}