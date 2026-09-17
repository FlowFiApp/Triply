export function formatDuration(iso: unknown): string {
  if (typeof iso === "number" && Number.isFinite(iso)) {
    return `${Math.floor(iso / 60)}h ${iso % 60}m`;
  }
  if (typeof iso !== "string") return "--h";
  const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return "--h";
  const h = Number(m[2] ?? 0) + Number(m[1] ?? 0) * 24;
  const min = Number(m[3] ?? 0);
  if (!h && !min) return "--h";
  return `${h}h ${min}m`;
}

export function formatAMPM(iso: string | null): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
}

export function format24(iso: string | null): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

/** Formats an ISO date (YYYY-MM-DD or full ISO) as a short friendly date. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}