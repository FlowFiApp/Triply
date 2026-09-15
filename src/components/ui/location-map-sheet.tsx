"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Sheet } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  DARK_MAP_STYLES,
  LIGHT_MAP_STYLES,
  loadGoogleMaps,
  makeMarkerIcon,
} from "@/lib/maps";

export type MapPick = { name: string; latitude: number; longitude: number };

export default function LocationMapSheet({
  open,
  onClose,
  initial,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  initial: MapPick;
  onSelect: (pick: MapPick) => void;
}) {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [pos, setPos] = useState({ lat: initial.latitude, lng: initial.longitude });
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open || !key) return;
    let cancelled = false;
    loadGoogleMaps(key)
      .then(() => {
        if (cancelled || !ref.current) return;
        const map = new google.maps.Map(ref.current, {
          center: { lat: initial.latitude, lng: initial.longitude },
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          styles: theme === "dark" ? DARK_MAP_STYLES : LIGHT_MAP_STYLES,
        });
        mapRef.current = map;
        const marker = new google.maps.Marker({
          position: { lat: initial.latitude, lng: initial.longitude },
          map,
          icon: makeMarkerIcon(),
          draggable: true,
          title: "Drag to adjust location",
        });
        marker.addListener("dragend", () => {
          const p = marker.getPosition();
          if (p) setPos({ lat: p.lat(), lng: p.lng() });
        });
        markerRef.current = marker;
        setReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key, theme]);

  const confirm = () => {
    onSelect({ name: initial.name, latitude: pos.lat, longitude: pos.lng });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-4 pb-6 pt-1">
        <h2 className="mb-3 text-[16px] font-extrabold text-foreground">
          Choose location
        </h2>
        <div ref={ref} className="h-64 w-full rounded-2xl bg-card-2" />
        {ready ? (
          <p className="mt-2 text-[11px] text-muted">
            Drag the marker to fine-tune the location.
          </p>
        ) : null}
        <button
          onClick={confirm}
          className="tap mt-4 flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-bold text-accent-2"
        >
          <Check size={18} />
          Use this location
        </button>
      </div>
    </Sheet>
  );
}