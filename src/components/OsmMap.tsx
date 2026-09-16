"use client";

import { MapPin } from "lucide-react";

export type LatLng = { lat: number; lng: number };

/** Keyless OpenStreetMap embed centered on a coordinate with a marker. */
export default function OsmMap({
  center,
  query,
  zoom = 14,
  className = "h-44 w-full",
}: {
  center: LatLng;
  query: string;
  zoom?: number;
  className?: string;
}) {
  const { lat, lng } = center;
  const span = 360 / Math.pow(2, zoom);
  const bbox = `${lng - span / 2}%2C${lat - span / 2}%2C${lng + span / 2}%2C${lat + span / 2}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <iframe
        src={src}
        className="h-full w-full"
        loading="lazy"
        title={query}
        style={{ border: 0 }}
      />
      <span className="pointer-events-none absolute bottom-2 left-2 flex max-w-[calc(100%-16px)] items-center gap-1 rounded-md bg-card/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow">
        <MapPin size={10} className="shrink-0 text-accent-fg" />
        <span className="truncate">{query}</span>
      </span>
    </div>
  );
}