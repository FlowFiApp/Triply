"use client";

import { useEffect } from "react";
import { useTheme, type Theme } from "@/lib/theme";

export default function ThemeSync({
  theme,
}: {
  theme?: Theme;
}) {
  const { setTheme } = useTheme();
  useEffect(() => {
    if (theme) {
      setTheme(theme);
      return;
    }
    const t = new URLSearchParams(window.location.search).get("t");
    if (t === "dark" || t === "light") setTheme(t);
  }, [theme, setTheme]);
  return null;
}