import { nextEventOccurrence } from "../domain/events/events.ts";
import type { EventStatus } from "../domain/events/events.ts";
import { engine } from "../domain/calendar/index.ts";
import type { EthiopianDate } from "../domain/calendar/index.ts";
import type { EventCategory, EventRecord } from "../domain/models.ts";

export type EventTab = "upcoming" | "past";
export type EventRow = { event: EventRecord; status: EventStatus };

export function eventRows(events: readonly EventRecord[], today: EthiopianDate): EventRow[] {
  return events.map((event) => ({ event, status: nextEventOccurrence(event, today) }));
}

/**
 * Upcoming = has a next occurrence (today counts). Past = one-time events already over. Yearly events are never "past".
 * Upcoming sorts soonest first (timed before later-timed on the same day); past sorts most recent first.
 */
export function selectEvents(rows: EventRow[], tab: EventTab, q: string, category: EventCategory | "all"): EventRow[] {
  const needle = q.trim().toLowerCase();
  const matches = (r: EventRow) => (needle ? r.event.title.toLowerCase().includes(needle) : true) && (category === "all" || r.event.category === category);
  if (tab === "upcoming") {
    return rows.filter((r) => r.status !== null && matches(r)).sort((a, b) =>
      (a.status as NonNullable<EventStatus>).daysRemaining - (b.status as NonNullable<EventStatus>).daysRemaining || (a.event.time ?? "").localeCompare(b.event.time ?? "") || a.event.title.localeCompare(b.event.title));
  }
  return rows.filter((r) => r.status === null && matches(r)).sort((a, b) => engine.compare(b.event.date, a.event.date) || a.event.title.localeCompare(b.event.title));
}
