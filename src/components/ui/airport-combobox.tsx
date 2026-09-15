"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

export type PlaceOption = {
  code: string;
  name: string;
  city: string;
  country: string;
};

export default function AirportCombobox({
  value,
  onChange,
  placeholder = "IATA",
  align = "left",
  onKeyDown,
}: {
  value: string;
  onChange: (code: string, option?: PlaceOption) => void;
  placeholder?: string;
  align?: "left" | "right";
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<PlaceOption[]>([]);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noLive, setNoLive] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 2) return;
    debounce.current = setTimeout(() => {
      fetch(`/api/places?query=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => {
          setOptions(d.live ? d.places : []);
          setNoLive(d.live ? false : d.error ? true : false);
        })
        .catch(() => {
          setOptions([]);
          setNoLive(true);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  // Only ever open the suggestions after the user interacts with the field.
  const show = focused && (loading || options.length > 0 || noLive);

  return (
    <div className="relative w-full">
      <input
        value={query}
        onChange={(e) => {
          const v = e.target.value.toUpperCase();
          setQuery(v);
          if (v.trim().length < 2) {
            setOptions([]);
            setLoading(false);
          } else {
            setLoading(true);
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setFocused(false);
          onKeyDown?.(e);
        }}
        placeholder={placeholder}
        className={`w-full bg-transparent text-[28px] font-extrabold leading-[37px] text-foreground outline-none ${
          align === "right" ? "text-right" : "text-left"
        }`}
      />

      {show ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl no-scrollbar">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-muted">
              <Loader2 size={14} className="animate-spin" /> Searching airports…
            </div>
          ) : options.length ? (
            options.map((o) => (
              <button
                key={o.code}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o.code, o);
                  setQuery(o.code);
                  setFocused(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-card-2"
              >
                <MapPin size={14} className="shrink-0 text-accent-fg" />
                <span className="flex flex-col">
                  <span className="text-[13px] font-bold text-foreground">
                    {o.code}
                  </span>
                  <span className="text-[11px] text-muted">
                    {o.city}, {o.country}
                  </span>
                </span>
              </button>
            ))
          ) : noLive ? (
            <p className="px-3 py-2.5 text-[12px] text-muted">
              Airport lookup unavailable — enter an IATA code manually.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}