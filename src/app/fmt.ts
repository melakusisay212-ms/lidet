import { engine } from "../domain/calendar/index.ts";
import type { EthiopianDate } from "../domain/calendar/index.ts";
import { formatEthiopian, formatGregorian } from "../i18n/format.ts";
import type { Translate } from "../i18n/index.ts";
import type { Language } from "../domain/models.ts";

export function ethiopianLabel(d: EthiopianDate, lang: Language): string { return formatEthiopian(d, lang); }

/** Safe Gregorian equivalent (never throws in the UI). */
export function gregorianLabel(d: EthiopianDate, lang: Language): string {
  try { return formatGregorian(engine.toGregorian(d), lang); } catch { return ""; }
}

/** "Meskerem 30, 2019" plus, when enabled, " · October 10, 2026". */
export function dualLabel(d: EthiopianDate, lang: Language, showGregorian: boolean): string {
  const g = showGregorian ? gregorianLabel(d, lang) : "";
  return g ? `${formatEthiopian(d, lang)} · ${g}` : formatEthiopian(d, lang);
}

export function daysLabel(t: Translate, n: number): string {
  if (n === 0) return t("count.today");
  if (n === 1) return t("count.tomorrow");
  if (n === -1) return t("count.yesterday");
  return n > 0 ? t("count.inDays", { n }) : t("count.daysAgo", { n: -n });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "?";
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? "" : "";
  return (first + last).toUpperCase();
}
