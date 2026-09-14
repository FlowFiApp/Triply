"use client";

export function directionsUrl(
  destination: string,
  origin?: string,
): string {
  const params = new URLSearchParams({ api: "1", destination });
  if (origin) params.set("origin", origin);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export default function MapEmbed({
  query,
  className = "h-44 w-full",
  zoom = 14,
}: {
  query: string;
  className?: string;
  zoom?: number;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const src = key
    ? `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(
        query,
      )}&zoom=${zoom}`
    : `https://maps.google.com/maps?q=${encodeURIComponent(
        query,
      )}&z=${zoom}&output=embed`;
  return (
    <iframe
      src={src}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      title="Map"
      style={{ border: 0 }}
    />
  );
}