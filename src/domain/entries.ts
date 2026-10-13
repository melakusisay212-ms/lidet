import type { CalendarEngine, EthiopianDate } from "./calendar/index.ts";
import { engine, sameDate } from "./calendar/index.ts";
import { occurrenceInYear } from "./birthdays/birthday.ts";
import { eventOccursOn } from "./events/events.ts";
import { observancesOn } from "./holidays/resolve.ts";
import type { HolidayInstance } from "./holidays/resolve.ts";
import type { AppData, EventRecord, Person } from "./models.ts";

export type CalendarEntry =
  | { kind: "own_birthday"; adjusted: boolean; age: number | null }
  | { kind: "birthday"; person: Person; adjusted: boolean; age: number | null }
  | { kind: "event"; event: EventRecord }
  | { kind: "observance"; instance: HolidayInstance };

export type CategoryFilter = "birthdays" | "public" | "orthodox_feast" | "saint" | "fasting" | "events";
export const ALL_FILTERS: readonly CategoryFilter[] = ["birthdays", "public", "orthodox_feast", "saint", "fasting", "events"];

export function categoryOf(entry: CalendarEntry): CategoryFilter {
  if (entry.kind === "own_birthday" || entry.kind === "birthday") return "birthdays";
  if (entry.kind === "event") return "events";
  const c = entry.instance.record.category;
  return c === "islamic" ? "public" : c;
}

function birthdayOn(month: number | null, day: number | null, birthYear: number | null, date: EthiopianDate, e: CalendarEngine) {
  if (month === null || day === null) return null;
  if (birthYear !== null && date.year < birthYear) return null; // never before the person was born
  const occ = occurrenceInYear({ month, day }, date.year, e);
  if (!sameDate(occ.date, date)) return null;
  return { adjusted: occ.adjustedForMissingDate, age: birthYear === null ? null : date.year - birthYear };
}

/** Everything on one date. Multiple entries per date are normal; order: birthdays, events (all-day first, then by time), observances. */
export function entriesOn(data: AppData, date: EthiopianDate, e: CalendarEngine = engine): CalendarEntry[] {
  const out: CalendarEntry[] = [];
  if (data.profile) {
    const b = birthdayOn(data.profile.month, data.profile.day, data.profile.year, date, e);
    if (b) out.push({ kind: "own_birthday", ...b });
  }
  for (const person of [...data.people].sort((a, b) => a.name.localeCompare(b.name))) {
    const b = birthdayOn(person.month, person.day, person.year, date, e);
    if (b) out.push({ kind: "birthday", person, ...b });
  }
  const events = data.events.filter((ev) => eventOccursOn(ev, date, e)).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "") || a.title.localeCompare(b.title));
  for (const event of events) out.push({ kind: "event", event });
  for (const instance of observancesOn(date, e)) out.push({ kind: "observance", instance });
  return out;
}

export function filterEntries(entries: readonly CalendarEntry[], active: ReadonlySet<CategoryFilter>): CalendarEntry[] {
  return entries.filter((en) => active.has(categoryOf(en)));
}

/** Home "Coming up": birthdays, events, public holidays and Orthodox feasts only (no weekly fasts or monthly saints). */
export function upcomingEntries(data: AppData, today: EthiopianDate, horizonDays: number, e: CalendarEngine = engine) {
  const keep = new Set<CategoryFilter>(["birthdays", "events", "public", "orthodox_feast"]);
  const out: Array<{ date: EthiopianDate; daysRemaining: number; entry: CalendarEntry }> = [];
  for (let i = 0; i < horizonDays; i++) {
    let date: EthiopianDate;
    try { date = e.addDays(today, i); } catch { break; }
    for (const entry of filterEntries(entriesOn(data, date, e), keep)) out.push({ date, daysRemaining: i, entry });
  }
  return out;
}
