import type { CalendarEngine, EthiopianDate } from "../calendar/index.ts";
import { engine, diffDays } from "../calendar/index.ts";

/** Recurring birthday rule. Policy (CONFIRMED): Pagume 6 in a five-day Pagume year -> last_day_of_pagume. */
export type BirthdayRule = { month: number; day: number };
export type BirthdayOccurrence = {
  date: EthiopianDate;
  daysRemaining: number;
  adjustedForMissingDate: boolean;
};

export function isValidRule(rule: BirthdayRule): boolean {
  if (!Number.isInteger(rule.month) || !Number.isInteger(rule.day)) return false;
  if (rule.month < 1 || rule.month > 13 || rule.day < 1) return false;
  // Judged against a leap year so that Pagume 6 is accepted as a recurring rule.
  return rule.day <= (rule.month <= 12 ? 30 : 6);
}

/** The occurrence of a recurring month/day in a specific Ethiopian year, applying the missing-date policy. */
export function occurrenceInYear(rule: BirthdayRule, year: number, e: CalendarEngine = engine) {
  if (!isValidRule(rule)) throw new RangeError(`invalid recurring date ${rule.month}/${rule.day}`);
  const literal = { year, month: rule.month, day: rule.day };
  if (e.validate(literal).ok) return { date: literal, adjustedForMissingDate: false };
  if (rule.month === 13 && rule.day === 6) {
    return { date: { year, month: 13, day: 5 }, adjustedForMissingDate: true }; // last_day_of_pagume
  }
  throw new RangeError(`date ${literal.year}-${literal.month}-${literal.day} not representable`);
}

export function nextOccurrence(rule: BirthdayRule, today: EthiopianDate, e: CalendarEngine = engine): BirthdayOccurrence {
  let occ = occurrenceInYear(rule, today.year, e);
  if (e.compare(occ.date, today) < 0) occ = occurrenceInYear(rule, today.year + 1, e);
  return { date: occ.date, adjustedForMissingDate: occ.adjustedForMissingDate, daysRemaining: diffDays(today, occ.date, e) };
}

/** The next `count` occurrences, used for reminder scheduling. */
export function upcomingOccurrences(rule: BirthdayRule, today: EthiopianDate, count: number, e: CalendarEngine = engine) {
  const out: BirthdayOccurrence[] = [];
  let probe = today;
  for (let i = 0; i < count; i++) {
    const occ = nextOccurrence(rule, probe, e);
    out.push(occ);
    probe = e.addDays(occ.date, 1);
  }
  return out;
}
