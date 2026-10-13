import { nextOccurrence } from "../domain/birthdays/birthday.ts";
import type { BirthdayOccurrence } from "../domain/birthdays/birthday.ts";
import type { EthiopianDate } from "../domain/calendar/index.ts";
import type { Person } from "../domain/models.ts";

export type FriendFilter = "all" | "upcoming" | "today" | "missing";
export type FriendSort = "next" | "alpha";
export type FriendRow = { person: Person; occ: BirthdayOccurrence | null };

export function occurrenceOf(p: Person, today: EthiopianDate): BirthdayOccurrence | null {
  return p.month !== null && p.day !== null ? nextOccurrence({ month: p.month, day: p.day }, today) : null;
}

/** Search, filter and sort. Friends without a birthday are excluded from every countdown-based filter. */
export function selectFriends(rows: FriendRow[], q: string, filter: FriendFilter, sort: FriendSort): FriendRow[] {
  const needle = q.trim().toLowerCase();
  let out = rows.filter((r) => (needle ? r.person.name.toLowerCase().includes(needle) : true));
  if (filter === "upcoming") out = out.filter((r) => r.occ !== null && r.occ.daysRemaining <= 30);
  if (filter === "today") out = out.filter((r) => r.occ !== null && r.occ.daysRemaining === 0);
  if (filter === "missing") out = out.filter((r) => r.occ === null);
  const byName = (a: FriendRow, b: FriendRow) => a.person.name.localeCompare(b.person.name);
  if (sort === "alpha") return [...out].sort(byName);
  return [...out].sort((a, b) => {
    if (a.occ === null || b.occ === null) return (a.occ === null ? 1 : 0) - (b.occ === null ? 1 : 0) || byName(a, b); // missing last
    return a.occ.daysRemaining - b.occ.daysRemaining || byName(a, b);
  });
}
