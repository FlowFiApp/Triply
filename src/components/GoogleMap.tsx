"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { useTheme } from "@/lib/theme";
import {
  DARK_MAP_STYLES,
  LIGHT_MAP_STYLES,
  loadGoogleMaps,
  makeMarkerIcon,
} from "@/lib/maps";
import MapEmbed from "@/components/MapEmbed";

export type LatLng = { lat: number; lng: number };

type Status = "loading" | "ready" | "fallback";

export default function GoogleMap({
  center,
  query,
  zoom = 14,
  className = "h-44 w-full",
  markers,
}: {
  center: LatLng;
  query: string;
  zoom?: number;
  className?: string;
  markers?: LatLng[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<google.maps.Marker[]>([]);
  const { theme } = useTheme();
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [status, setStatus] = useState<Status>(key ? "loading" : "fallback");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    loadGoogleMaps(key)
      .then(() => {
        if (cancelled || !ref.current) return;
        const map = new google.maps.Map(ref.current, {
          center,
          zoom,
          disableDefaultUI: true,
          zoomControl: true,
          styles: theme === "dark" ? DARK_MAP_STYLES : LIGHT_MAP_STYLES,
        });
        mapRef.current = map;
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("fallback");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const points = markers && markers.length ? markers : [center];

  useEffect(() => {
    if (!mapRef.current) return;
    markerRefs.current.forEach((m) => m.setMap(null));
    markerRefs.current = [];
    for (const p of points) {
      const marker = new google.maps.Marker({
        position: p,
        map: mapRef.current,
        icon: makeMarkerIcon(),
      });
      markerRefs.current.push(marker);
    }
    mapRef.current.panTo(points[0]);
    mapRef.current.setZoom(zoom);
  }, [points[0].lat, points[0].lng, points.length, zoom]);

  // Re-style the map when the theme changes.
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setOptions({
      styles: theme === "dark" ? DARK_MAP_STYLES : LIGHT_MAP_STYLES,
    });
  }, [theme]);

  if (status === "fallback") {
    return <MapEmbed query={query} className={className} zoom={zoom} />;
  }

  if (status === "loading") {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 rounded-lg bg-card-2 ${className}`}
      >
        <Loader2 size={20} className="animate-spin text-accent-2" />
        <span className="text-[11px] text-muted">Loading map…</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={ref} className="h-full w-full rounded-lg" />
      <span className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-card/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow">
        <MapPin size={10} className="text-accent-2" />
        {query}
      </span>
    </div>
  );
}