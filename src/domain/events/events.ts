import type { CalendarEngine, EthiopianDate } from "../calendar/index.ts";
import { engine, diffDays, sameDate } from "../calendar/index.ts";
import { occurrenceInYear } from "../birthdays/birthday.ts";
import type { EventRecord } from "../models.ts";

/**
 * Yearly recurrence policy (explicit, per spec 4.10): an event on Pagume 6 recurs on Pagume 6 in
 * six-day Pagume years and on Pagume 5 otherwise (same as birthdays). One-time events never recur.
 */
export function eventOccursOn(ev: EventRecord, date: EthiopianDate, e: CalendarEngine = engine): boolean {
  if (ev.repeat === "none") return sameDate(ev.date, date);
  if (date.year < ev.date.year) return false; // a yearly event does not occur before its first date
  return sameDate(occurrenceInYear({ month: ev.date.month, day: ev.date.day }, date.year, e).date, date);
}

export type EventStatus = { date: EthiopianDate; daysRemaining: number; adjustedForMissingDate: boolean } | null;

/** Next occurrence on/after today, or null when a one-time event is in the past. */
export function nextEventOccurrence(ev: EventRecord, today: EthiopianDate, e: CalendarEngine = engine): EventStatus {
  if (ev.repeat === "none") {
    const n = diffDays(today, ev.date, e);
    return n >= 0 ? { date: ev.date, daysRemaining: n, adjustedForMissingDate: false } : null;
  }
  let year = Math.max(today.year, ev.date.year);
  for (let i = 0; i < 2; i++, year++) {
    const occ = occurrenceInYear({ month: ev.date.month, day: ev.date.day }, year, e);
    const n = diffDays(today, occ.date, e);
    if (n >= 0 && e.compare(occ.date, ev.date) >= 0) return { date: occ.date, daysRemaining: n, adjustedForMissingDate: occ.adjustedForMissingDate };
  }
  return null;
}
