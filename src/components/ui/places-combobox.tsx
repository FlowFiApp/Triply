"use client";

import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/maps";

export type PlaceSelection = {
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
};

export default function PlacesCombobox({
  value,
  onChange,
  onSelect,
  placeholder = "Search for a place…",
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (p: PlaceSelection) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    let autocomplete: google.maps.places.Autocomplete | null = null;
    loadGoogleMaps(key)
      .then(() => {
        if (cancelled || !inputRef.current) return;
        autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          types: ["(regions)"],
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete?.getPlace();
          if (place && place.geometry?.location) {
            onSelect({
              placeId: place.place_id ?? "",
              name: place.formatted_address ?? place.name ?? "",
              latitude: place.geometry.location.lat(),
              longitude: place.geometry.location.lng(),
            });
          }
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      google.maps.event?.clearInstanceListeners(autocomplete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent text-[14px] font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted"
    />
  );
}