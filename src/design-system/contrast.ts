/** WCAG 2.x contrast helpers (pure; used by the theme tests and nothing at runtime). */
function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
export function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`bad hex ${hex}`);
  const n = parseInt(m[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Matches CSS color-mix(in srgb, a pct%, b): per-channel linear interpolation in sRGB. */
export function mix(a: string, pct: number, b: string): string {
  const n = (h: string) => parseInt(h.slice(1), 16);
  const ch = (x: number, y: number) => Math.round((x * pct + y * (100 - pct)) / 100);
  const [A, B] = [n(a), n(b)];
  const r = ch((A >> 16) & 255, (B >> 16) & 255), g = ch((A >> 8) & 255, (B >> 8) & 255), bl = ch(A & 255, B & 255);
  return "#" + [r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("");
}
