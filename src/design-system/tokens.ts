import type { Appearance, ThemeFamily } from "../domain/models.ts";

/** Semantic tokens (spec 2.5). Components must only ever use these, never raw palette values. */
export type Tokens = {
  background: string; surface: string; surfaceSecondary: string;
  textPrimary: string; textSecondary: string;
  primary: string; primaryPressed: string; onPrimary: string;
  birthday: string; holiday: string; fasting: string; event: string;
  success: string; warning: string; error: string;
  border: string; focusRing: string; disabled: string; accent: string;
};
export type ResolvedAppearance = "light" | "dark";

export const THEME_FAMILIES: readonly ThemeFamily[] = ["signature", "midnight_velvet", "highland_sage", "rose_celebration", "blue_hour"];
export const APPEARANCES: readonly Appearance[] = ["system", "light", "dark"];

const lightCats = { birthday: "#A63F5B", holiday: "#2F6B57", fasting: "#8A5600", success: "#2F6B57", warning: "#8A5600", error: "#B3261E", disabled: "#9C93A6" };
const darkCats = { birthday: "#F08AA3", holiday: "#7FC4A8", fasting: "#E1C18B", success: "#7FC4A8", warning: "#E1C18B", error: "#FF8A80", disabled: "#6F6580" };

export const THEMES: Record<ThemeFamily, Record<ResolvedAppearance, Tokens>> = {
  signature: {
    light: { ...lightCats, background: "#F8F3EB", surface: "#FFFFFF", surfaceSecondary: "#F0E8DC", textPrimary: "#261832", textSecondary: "#5A4A68", primary: "#6A44BC", primaryPressed: "#55349C", onPrimary: "#FFFFFF", event: "#6A44BC", border: "#E3D8C8", focusRing: "#6A44BC", accent: "#E1C18B" },
    dark: { ...darkCats, background: "#1A1022", surface: "#261832", surfaceSecondary: "#321F42", textPrimary: "#F8F3EB", textSecondary: "#CBBDD8", primary: "#B79BF0", primaryPressed: "#A183E3", onPrimary: "#1A1022", event: "#B79BF0", border: "#3E2B50", focusRing: "#E1C18B", accent: "#E1C18B" },
  },
  midnight_velvet: {
    light: { ...lightCats, background: "#F5F2FB", surface: "#FFFFFF", surfaceSecondary: "#ECE7F7", textPrimary: "#1B1230", textSecondary: "#54496E", primary: "#5B3FB0", primaryPressed: "#482F95", onPrimary: "#FFFFFF", event: "#5B3FB0", border: "#DDD5EE", focusRing: "#5B3FB0", accent: "#C9A24E" },
    dark: { ...darkCats, background: "#0F0B18", surface: "#1A1426", surfaceSecondary: "#251D35", textPrimary: "#EFEAFB", textSecondary: "#C2B8DA", primary: "#BBA8F5", primaryPressed: "#A892EA", onPrimary: "#0F0B18", event: "#BBA8F5", border: "#33294A", focusRing: "#E3C27A", accent: "#E3C27A" },
  },
  highland_sage: {
    light: { ...lightCats, background: "#F3F6EF", surface: "#FFFFFF", surfaceSecondary: "#E7EDE0", textPrimary: "#17241D", textSecondary: "#4A5D52", primary: "#35705A", primaryPressed: "#285845", onPrimary: "#FFFFFF", event: "#5B3FB0", border: "#D6DFCB", focusRing: "#35705A", accent: "#C9A24E" },
    dark: { ...darkCats, background: "#0F1A15", surface: "#17261F", surfaceSecondary: "#1F3329", textPrimary: "#EAF3ED", textSecondary: "#B5C9BC", primary: "#8CCBAE", primaryPressed: "#74BA9A", onPrimary: "#0F1A15", event: "#BBA8F5", border: "#2A4235", focusRing: "#E1C18B", accent: "#E1C18B" },
  },
  rose_celebration: {
    light: { ...lightCats, background: "#FCF3F3", surface: "#FFFFFF", surfaceSecondary: "#F6E4E7", textPrimary: "#2D1620", textSecondary: "#6A4553", primary: "#A8365F", primaryPressed: "#8C284B", onPrimary: "#FFFFFF", event: "#5B3FB0", border: "#EBD3D8", focusRing: "#A8365F", accent: "#E1C18B" },
    dark: { ...darkCats, background: "#1F1017", surface: "#2C1822", surfaceSecondary: "#3A202D", textPrimary: "#FBEFF2", textSecondary: "#DDBFCA", primary: "#F29BB6", primaryPressed: "#E884A4", onPrimary: "#1F1017", event: "#BBA8F5", border: "#4A2B3A", focusRing: "#E1C18B", accent: "#E1C18B" },
  },
  blue_hour: {
    light: { ...lightCats, background: "#F1F5FA", surface: "#FFFFFF", surfaceSecondary: "#E3EAF4", textPrimary: "#0F1B2D", textSecondary: "#46566E", primary: "#2B5A9E", primaryPressed: "#1F4680", onPrimary: "#FFFFFF", event: "#2B5A9E", border: "#D3DDEB", focusRing: "#2B5A9E", accent: "#C9A24E" },
    dark: { ...darkCats, background: "#0B1422", surface: "#121E31", surfaceSecondary: "#1A2A42", textPrimary: "#E9F0FA", textSecondary: "#B3C3DA", primary: "#8DB6F2", primaryPressed: "#76A5EA", onPrimary: "#0B1422", event: "#8DB6F2", border: "#23364F", focusRing: "#E1C18B", accent: "#E1C18B" },
  },
};

export function resolveAppearance(appearance: Appearance, systemPrefersDark: boolean): ResolvedAppearance {
  return appearance === "system" ? (systemPrefersDark ? "dark" : "light") : appearance;
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
export const cssVarName = (token: keyof Tokens) => `--c-${kebab(token)}`;

/** Applies a theme to the document root as CSS custom properties. */
export function applyTheme(root: HTMLElement, family: ThemeFamily, appearance: ResolvedAppearance): void {
  const t = THEMES[family][appearance];
  for (const key of Object.keys(t) as Array<keyof Tokens>) root.style.setProperty(cssVarName(key), t[key]);
  root.style.colorScheme = appearance;
  root.dataset.theme = `${family}-${appearance}`;
}
