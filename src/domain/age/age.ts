import type { CalendarEngine, EthiopianDate } from "../calendar/index.ts";
import { engine, diffDays, addMonthsClamped } from "../calendar/index.ts";
import { occurrenceInYear } from "../birthdays/birthday.ts";

export type AgeBreakdown = { years: number; months: number; days: number; totalDays: number };

/**
 * Age = largest completed calendar-anniversary interval (years, then months, then days).
 * Never uses days/365 or days/30.
 *
 * OPEN DECISION (spec 5.5): anniversary when the birth date is Pagume 6 and the target year has a
 * five-day Pagume. PROPOSED here: anniversary falls on Pagume 5, matching the recurring-birthday
 * policy. It is isolated in `anniversaryInYear` and covered by tests so it can be changed in one place.
 */
export function anniversaryInYear(birth: EthiopianDate, year: number, e: CalendarEngine = engine): EthiopianDate {
  return occurrenceInYear({ month: birth.month, day: birth.day }, year, e).date;
}

export function calculateAge(birth: EthiopianDate, today: EthiopianDate, e: CalendarEngine = engine): AgeBreakdown | null {
  if (e.compare(birth, today) > 0) return null; // birth in the future: not an age
  let years = today.year - birth.year;
  if (e.compare(anniversaryInYear(birth, birth.year + years, e), today) > 0) years -= 1;
  const base = anniversaryInYear(birth, birth.year + years, e);

  let months = today.year * 13 + today.month - (base.year * 13 + base.month);
  if (e.compare(addMonthsClamped(base, months, e), today) > 0) months -= 1;
  // A clamped base (Pagume 6 -> 5) can make 13 months look reached while the true anniversary has not
  // arrived yet; by definition fewer than one full year (13 months) remains past `base`.
  months = Math.min(months, 12);
  const anchor = addMonthsClamped(base, months, e);

  return { years, months, days: diffDays(anchor, today, e), totalDays: diffDays(birth, today, e) };
}
