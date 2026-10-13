import { engine } from "../domain/calendar/index.ts";
import type { EthiopianDate } from "../domain/calendar/index.ts";
import { validBirthDate, validBirthYear } from "../data/validate.ts";
import type { Translate } from "../i18n/index.ts";

export type BirthdayValue = { month: number | null; day: number | null; year: string };
export type BirthdayParsed = { ok: true; month: number | null; day: number | null; year: number | null } | { ok: false; error: string };
export type DateValue = { year: string; month: number | null; day: number | null };

/**
 * Pure validation shared by the setup and friend forms. Month/day are a recurring rule; the year is optional.
 * `today` is injected (no hidden clock) so this is deterministic and testable.
 */
export function parseBirthday(v: BirthdayValue, opts: { required: boolean; today: EthiopianDate }, t: Translate): BirthdayParsed {
  if (v.month === null && v.day === null) {
    if (v.year.trim() !== "") return { ok: false, error: t("state.invalid") };
    return opts.required ? { ok: false, error: t("common.required") } : { ok: true, month: null, day: null, year: null };
  }
  if (v.month === null || v.day === null) return { ok: false, error: t("common.required") };
  if (v.month < 1 || v.month > 13 || v.day < 1 || v.day > (v.month === 13 ? 6 : 30)) return { ok: false, error: t("event.dateInvalid") };
  const raw = v.year.trim();
  if (raw === "") return { ok: true, month: v.month, day: v.day, year: null };
  if (!/^\d{4}$/.test(raw)) return { ok: false, error: t("state.invalid") };
  const year = Number(raw);
  if (!validBirthYear(year) || !validBirthDate(year, v.month, v.day)) return { ok: false, error: t("event.dateInvalid") };
  if (engine.compare({ year, month: v.month, day: v.day }, opts.today) > 0) return { ok: false, error: t("state.invalid") };
  return { ok: true, month: v.month, day: v.day, year };
}

export function parseDate(v: DateValue): EthiopianDate | null {
  if (v.month === null || v.day === null || !/^\d{4}$/.test(v.year)) return null;
  const d = { year: Number(v.year), month: v.month, day: v.day };
  return engine.validate(d).ok ? d : null;
}

/** Normalises "HH:MM" from an <input type=time>. */
export function validTime(s: string): boolean { return /^([01]\d|2[0-3]):[0-5]\d$/.test(s); }
