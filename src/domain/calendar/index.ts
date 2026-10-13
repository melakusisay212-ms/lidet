import type { CalendarEngine, EthiopianDate, GregorianDate } from "./types.ts";
import { referenceEngine } from "./reference-engine.ts";

export type { CalendarEngine, EthiopianDate, GregorianDate, Validation } from "./types.ts";
export { gregorianToAbsoluteDay, absoluteDayToGregorian } from "./reference-engine.ts";

/** The single place the active engine is chosen. Swap here to adopt another engine. */
export const engine: CalendarEngine = referenceEngine;

export const diffDays = (from: EthiopianDate, to: EthiopianDate, e: CalendarEngine = engine) =>
  e.toAbsoluteDay(to) - e.toAbsoluteDay(from);

export const sameDate = (a: EthiopianDate, b: EthiopianDate) =>
  a.year === b.year && a.month === b.month && a.day === b.day;

/** Device-local calendar date (not UTC) as Gregorian parts. */
export function localGregorian(now: Date = new Date()): GregorianDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

export function todayEthiopian(now: Date = new Date(), e: CalendarEngine = engine): EthiopianDate {
  return e.toEthiopian(localGregorian(now));
}

/**
 * Add whole months in the 13-month calendar. If the day does not exist in the target month
 * (e.g. day 30 -> Pagume) it is clamped to the last day of that month. PROPOSED rule, see README.
 */
export function addMonthsClamped(d: EthiopianDate, n: number, e: CalendarEngine = engine): EthiopianDate {
  const total = d.year * 13 + (d.month - 1) + n;
  const year = Math.floor(total / 13);
  const month = (((total % 13) + 13) % 13) + 1;
  return { year, month, day: Math.min(d.day, e.daysInMonth(year, month)) };
}
