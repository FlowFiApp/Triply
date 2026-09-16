"use client";

/** OpenStreetMap directions / search link (no Google). */
export function directionsUrl(destination: string, origin?: string): string {
  if (origin) {
    const params = new URLSearchParams({
      engine: "fossgis_osrm_car",
      route: `${origin};${destination}`,
    });
    return `https://www.openstreetmap.org/directions?${params.toString()}`;
  }
  const params = new URLSearchParams({ query: destination });
  return `https://www.openstreetmap.org/search?${params.toString()}`;
}