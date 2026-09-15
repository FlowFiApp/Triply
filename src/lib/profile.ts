"use client";

export type Profile = { username: string; avatar: string };

const STORAGE_KEY = "triply-profile";

export function getStoredProfile(): Profile {
  if (typeof window === "undefined") return { username: "", avatar: "" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Profile>;
      return {
        username: parsed.username ?? "",
        avatar: parsed.avatar ?? "",
      };
    }
  } catch {
    // ignore
  }
  return { username: "", avatar: "" };
}

export function saveStoredProfile(p: Profile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}