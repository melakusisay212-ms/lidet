import type { EthiopianDate, GregorianDate } from "../domain/calendar/types.ts";
import type { Language } from "../domain/models.ts";
import { ET_MONTHS, GREG_MONTHS } from "./names.ts";

/** Dates are always formatted from structured values, never stored as strings. */
export function formatEthiopian(d: EthiopianDate, lang: Language): string {
  return lang === "am" ? `${ET_MONTHS.am[d.month - 1]} ${d.day}፣ ${d.year}` : `${ET_MONTHS.en[d.month - 1]} ${d.day}, ${d.year}`;
}
export function formatEthiopianMonthDay(month: number, day: number, lang: Language): string {
  return `${ET_MONTHS[lang][month - 1]} ${day}`;
}
export function formatGregorian(g: GregorianDate, lang: Language): string {
  return lang === "am" ? `${GREG_MONTHS.am[g.month - 1]} ${g.day}፣ ${g.year}` : `${GREG_MONTHS.en[g.month - 1]} ${g.day}, ${g.year}`;
}
export function formatTime(hhmm: string, fmt: "24h" | "12h"): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  if (fmt === "24h") return hhmm;
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in params ? String(params[key]) : whole));
}
