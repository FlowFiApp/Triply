"use client";

function formatDate(iso: string): string {
  return iso.replace(/[-:]/g, "").slice(0, 15) + "Z";
}

function formatDay(iso: string): string {
  return iso.replace(/-/g, "");
}

function esc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function downloadIcs({
  title,
  description,
  location,
  start,
  end,
  allDay = true,
}: {
  title: string;
  description?: string;
  location?: string;
  start: string;
  end?: string;
  allDay?: boolean;
}) {
  const stamp = formatDate(new Date().toISOString());
  const dtStart = allDay ? `DTSTART;VALUE=DATE:${formatDay(start)}` : `DTSTART:${formatDate(start)}`;
  const dtEnd = allDay
    ? `DTEND;VALUE=DATE:${formatDay(end ?? start)}`
    : `DTEND:${formatDate(end ?? start)}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Triply//NIM 1.0//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@triply`,
    `DTSTAMP:${stamp}`,
    dtStart,
    dtEnd,
    `SUMMARY:${esc(title)}`,
    ...(location ? [`LOCATION:${esc(location)}`] : []),
    ...(description ? [`DESCRIPTION:${esc(description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "triply.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}