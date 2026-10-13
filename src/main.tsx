import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "@fontsource/noto-sans-ethiopic/400.css";
import "@fontsource/noto-sans-ethiopic/700.css";
import "./design-system/base.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App.tsx";
import { BOOT_KEY } from "./app/store.tsx";
import { applyTheme, resolveAppearance, THEME_FAMILIES, APPEARANCES } from "./design-system/tokens.ts";

// Theme before first paint, from a tiny mirror of the saved preference (the store re-applies the authoritative value).
try {
  const raw = localStorage.getItem(BOOT_KEY);
  const b = raw ? (JSON.parse(raw) as { f?: string; a?: string; l?: string }) : {};
  const family = THEME_FAMILIES.find((f) => f === b.f) ?? "signature";
  const appearance = APPEARANCES.find((a) => a === b.a) ?? "system";
  applyTheme(document.documentElement, family, resolveAppearance(appearance, window.matchMedia("(prefers-color-scheme: dark)").matches));
  if (b.l === "am" || b.l === "en") document.documentElement.lang = b.l;
} catch { /* defaults from CSS apply */ }

createRoot(document.getElementById("root") as HTMLElement).render(<StrictMode><App /></StrictMode>);
