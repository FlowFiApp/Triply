"use client";

import { useState } from "react";

export function useQueryParam(key: string, fallback: string) {
  const [value] = useState<string>(() => {
    if (typeof window === "undefined") return fallback;
    const params = new URLSearchParams(window.location.search);
    return params.get(key) ?? fallback;
  });
  return value;
}