"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Sheet } from "@/components/ui";
import { HiveSpinner } from "@/components/ui/hive-spinner";
import type { CityOption } from "@/lib/cities";

export default function CitiesSheet({
  open,
  onClose,
  onSelect,
  title = "Select a city",
  exclude,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (city: CityOption) => void;
  title?: string;
  exclude?: string[];
}) {
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [noLive, setNoLive] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    setLoading(true);
    debounce.current = setTimeout(() => {
      fetch(`/api/cities?query=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => {
          const list = (d.cities ?? []) as CityOption[];
          const filtered = exclude?.length
            ? list.filter((c) => !exclude.includes(c.id))
            : list;
          setCities(filtered);
          setNoLive(!d.live && Boolean(query.trim()));
        })
        .catch(() => {
          setCities([]);
          setNoLive(true);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, exclude]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCities([]);
    }
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} height="85vh">
      <div className="sticky top-0 z-10 bg-card px-4 pb-2">
        <h2 className="mb-3 text-[18px] font-extrabold text-foreground">
          {title}
        </h2>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3">
          <Search size={16} className="shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cities…"
            autoFocus
            className="h-11 w-full bg-transparent text-[16px] font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-6 no-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-muted">
            <HiveSpinner size={16} /> Loading cities…
          </div>
        ) : noLive ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted">
            No cities found for &ldquo;{query}&rdquo;.
          </p>
        ) : cities.length === 0 && !query ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted">
            Type to search cities.
          </p>
        ) : cities.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted">
            No cities found.
          </p>
        ) : (
          <div className="flex flex-col">
            {cities.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onSelect(c);
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-card-2"
              >
                <MapPin size={16} className="shrink-0 text-accent-fg" />
                <span className="flex flex-1 flex-col">
                  <span className="text-[14px] font-bold text-foreground">
                    {c.name}
                  </span>
                  <span className="text-[11px] text-muted">
                    {c.country}
                    {c.code ? ` · ${c.code}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}