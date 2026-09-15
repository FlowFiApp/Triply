"use client";

import type { FeedMoment } from "@/lib/feed";
import { identityKey } from "@/lib/identity";

export function feedKey(): string {
  return identityKey();
}

export function feedHandle(key: string): string {
  const compact = key.replace(/^NQ[\d A-Z]+/i, "").replace(/[^0-9a-z]/gi, "").slice(-4);
  return `Traveler ${compact || "Trip"}`;
}

export async function fetchFeed(): Promise<FeedMoment[]> {
  const res = await fetch(`/api/feed?key=${encodeURIComponent(feedKey())}`);
  const d = await res.json();
  if (!res.ok || !d.live) return [];
  return (d.moments ?? []) as FeedMoment[];
}

export async function uploadFeedImage(dataUrl: string): Promise<{ url: string; error?: string }> {
  const res = await fetch("/api/feed/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: dataUrl }),
  });
  return res.json();
}

export async function postMoment(input: {
  caption: string;
  location?: string;
  images: string[];
}): Promise<{ moment?: FeedMoment; error?: string }> {
  const res = await fetch("/api/feed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: feedKey(),
      authorName: feedHandle(feedKey()),
      caption: input.caption,
      location: input.location,
      images: input.images,
    }),
  });
  return res.json();
}

export async function toggleMomentLike(id: string): Promise<boolean> {
  const res = await fetch(`/api/feed/${id}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: feedKey() }),
  });
  const d = await res.json();
  return d.ok ? Boolean(d.liked) : false;
}

export async function addMomentComment(
  id: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/feed/${id}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: feedKey(), text }),
  });
  return res.json();
}

export async function incrementMomentShare(id: string): Promise<boolean> {
  const res = await fetch(`/api/feed/${id}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return res.ok;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function compactCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}