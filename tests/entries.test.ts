import { test } from "node:test";
import assert from "node:assert/strict";
import { entriesOn, filterEntries, upcomingEntries, categoryOf, ALL_FILTERS } from "../src/domain/entries.ts";
import type { CategoryFilter } from "../src/domain/entries.ts";
import { EMPTY_DATA } from "../src/domain/models.ts";
import type { AppData, EventRecord, Person } from "../src/domain/models.ts";
import { engine } from "../src/domain/calendar/index.ts";

const E = (year: number, month: number, day: number) => ({ year, month, day });
const person = (id: string, name: string, month: number | null, day: number | null, year: number | null = null): Person => ({ id, name, month, day, year, phone: null, notes: null, createdAt: 0, updatedAt: 0 });
const event = (id: string, over: Partial<EventRecord> = {}): EventRecord => ({ id, title: id, date: E(2019, 2, 5), time: null, description: null, category: null, repeat: "none", reminder: "none", createdAt: 0, updatedAt: 0, ...over });
const data = (over: Partial<AppData>): AppData => ({ ...EMPTY_DATA, ...over });

test("two friends, one event and a holiday on the same date all appear (no overwrite)", () => {
  const d = data({ profile: { month: 1, day: 17, year: null, updatedAt: 0 }, people: [person("a", "Zed", 1, 17), person("b", "Abel", 1, 17)], events: [event("e1", { date: E(2019, 1, 17) })] });
  const kinds = entriesOn(d, E(2019, 1, 17)).map((x) => x.kind);
  assert.deepEqual(kinds, ["own_birthday", "birthday", "birthday", "event", "observance", "observance"].slice(0, kinds.length));
  assert.equal(kinds.filter((k) => k === "birthday").length, 2);
  assert.ok(entriesOn(d, E(2019, 1, 17)).some((x) => x.kind === "observance" && x.instance.record.id === "meskel"));
});

test("friends sorted alphabetically; events: all-day first then by time", () => {
  const d = data({ people: [person("a", "Zed", 3, 3), person("b", "Abel", 3, 3)], events: [event("late", { time: "18:00", date: E(2019, 3, 3) }), event("early", { time: "08:00", date: E(2019, 3, 3) }), event("allday", { date: E(2019, 3, 3) })] });
  const list = entriesOn(d, E(2019, 3, 3));
  assert.deepEqual(list.filter((x) => x.kind === "birthday").map((x) => (x as { person: Person }).person.name), ["Abel", "Zed"]);
  assert.deepEqual(list.filter((x) => x.kind === "event").map((x) => (x as { event: EventRecord }).event.id), ["allday", "early", "late"]);
});

test("birthday never appears before the birth year; age is derived only when year known", () => {
  const d = data({ people: [person("a", "A", 3, 3, 2000), person("b", "B", 3, 3, null)] });
  const before = entriesOn(d, E(1999, 3, 3)).filter((x) => x.kind === "birthday");
  assert.equal(before.length, 1); // only B (unknown year)
  const now = entriesOn(d, E(2019, 3, 3)).filter((x): x is Extract<typeof x, { kind: "birthday" }> => x.kind === "birthday");
  assert.deepEqual(now.map((x) => [x.person.id, x.age]), [["a", 19], ["b", null]]);
});

test("Pagume 6 birthday shows on Pagume 5 (adjusted) in five-day years, Pagume 6 in leap years", () => {
  const d = data({ people: [person("a", "A", 13, 6, 2011)] });
  assert.equal(entriesOn(d, E(2020, 13, 5)).filter((x) => x.kind === "birthday").length, 1);
  const adj = entriesOn(d, E(2020, 13, 5)).find((x) => x.kind === "birthday") as Extract<ReturnType<typeof entriesOn>[number], { kind: "birthday" }>;
  assert.equal(adj.adjusted, true);
  assert.equal(entriesOn(d, E(2019, 13, 5)).filter((x) => x.kind === "birthday").length, 0);
  assert.equal(entriesOn(d, E(2019, 13, 6)).filter((x) => x.kind === "birthday").length, 1);
});

test("friends without a birthday never appear", () => {
  const d = data({ people: [person("a", "A", null, null)] });
  for (let m = 1; m <= 13; m++) assert.equal(entriesOn(d, E(2019, m, 1)).filter((x) => x.kind === "birthday").length, 0);
});

test("yearly events recur; one-time events do not; yearly never before first date", () => {
  const d = data({ events: [event("y", { repeat: "yearly", date: E(2015, 5, 5) }), event("o", { date: E(2015, 5, 5) })] });
  assert.equal(entriesOn(d, E(2019, 5, 5)).filter((x) => x.kind === "event").length, 1);
  assert.equal(entriesOn(d, E(2015, 5, 5)).filter((x) => x.kind === "event").length, 2);
  assert.equal(entriesOn(d, E(2014, 5, 5)).filter((x) => x.kind === "event").length, 0);
});

test("filters are category based and every entry maps to one of the filters", () => {
  const d = data({ profile: { month: 1, day: 12, year: null, updatedAt: 0 }, events: [event("e", { date: E(2019, 1, 12) })] });
  const all = entriesOn(d, E(2019, 1, 12));
  for (const en of all) assert.ok(ALL_FILTERS.includes(categoryOf(en)));
  const only = (f: CategoryFilter) => filterEntries(all, new Set([f]));
  assert.ok(only("birthdays").every((x) => x.kind === "own_birthday"));
  assert.ok(only("events").every((x) => x.kind === "event"));
  assert.ok(only("saint").every((x) => x.kind === "observance"));
  assert.equal(filterEntries(all, new Set()).length, 0);
});

test("upcoming list: sorted by date, horizon respected, excludes weekly fasts and monthly saints", () => {
  const today = E(2019, 1, 30);
  const d = data({ people: [person("a", "A", 2, 5)], events: [event("e1", { date: E(2019, 2, 10) }), event("far", { date: E(2019, 6, 1) })] });
  const up = upcomingEntries(d, today, 30);
  assert.ok(up.every((u, i) => i === 0 || up[i - 1].daysRemaining <= u.daysRemaining));
  assert.ok(up.every((u) => u.daysRemaining < 30));
  assert.ok(up.some((u) => u.entry.kind === "birthday") && up.some((u) => u.entry.kind === "event"));
  assert.ok(!up.some((u) => u.entry.kind === "event" && u.entry.event.id === "far"));
  assert.ok(!up.some((u) => u.entry.kind === "observance" && (u.entry.instance.record.category === "fasting" || u.entry.instance.record.category === "saint")));
  assert.equal(engine.toAbsoluteDay(up[0].date) - engine.toAbsoluteDay(today), up[0].daysRemaining);
});
