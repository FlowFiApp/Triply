"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

export type StaySuggestion = {
  id: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
};

export default function SuggestionsCombobox({
  value,
  onChange,
  onSelect,
  placeholder = "e.g. London, UK",
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (s: StaySuggestion) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<StaySuggestion[]>([]);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 2) return;
    debounce.current = setTimeout(() => {
      setLoading(true);
      fetch(`/api/stays/suggestions?query=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => setOptions(d.live ? d.suggestions : []))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  const show = focused && (loading || options.length > 0);

  return (
    <div className="relative w-full">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[14px] font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted"
      />
      {show ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl no-scrollbar">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-muted">
              <Loader2 size={14} className="animate-spin" /> Searching…
            </div>
          ) : (
            options.map((o) => (
              <button
                key={o.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery(o.name);
                  onChange(o.name);
                  onSelect?.(o);
                  setFocused(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-card-2"
              >
                <MapPin size={14} className="shrink-0 text-accent-fg" />
                <span className="flex flex-col">
                  <span className="text-[13px] font-bold text-foreground">
                    {o.name}
                  </span>
                  <span className="text-[11px] text-muted">
                    {o.city}
                    {o.country ? `, ${o.country}` : ""}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}