import { test } from "node:test";
import assert from "node:assert/strict";
import { selectFriends, occurrenceOf } from "../src/features/friends-logic.ts";
import { selectEvents, eventRows } from "../src/features/events-logic.ts";
import type { EventRecord, Person } from "../src/domain/models.ts";

const TODAY = { year: 2019, month: 1, day: 30 };
const p = (id: string, name: string, month: number | null, day: number | null): Person => ({ id, name, month, day, year: null, phone: null, notes: null, createdAt: 0, updatedAt: 0 });
const rows = (ps: Person[]) => ps.map((person) => ({ person, occ: occurrenceOf(person, TODAY) }));
const ids = (r: { person: Person }[]) => r.map((x) => x.person.id);

const people = [p("far", "Zed", 12, 1), p("today", "Today", 1, 30), p("soon", "Soon", 2, 5), p("none", "Nobody", null, null), p("also", "Alice", 2, 5)];

test("friends: next-birthday sort puts today first, same-day ties alphabetical, missing last", () => {
  assert.deepEqual(ids(selectFriends(rows(people), "", "all", "next")), ["today", "also", "soon", "far", "none"]);
});
test("friends: alphabetical sort", () => {
  assert.deepEqual(ids(selectFriends(rows(people), "", "all", "alpha")), ["also", "none", "soon", "today", "far"]);
});
test("friends: filters exclude missing-birthday records from countdown filters", () => {
  assert.deepEqual(ids(selectFriends(rows(people), "", "today", "next")), ["today"]);
  assert.deepEqual(ids(selectFriends(rows(people), "", "upcoming", "next")), ["today", "also", "soon"]);
  assert.deepEqual(ids(selectFriends(rows(people), "", "missing", "next")), ["none"]);
});
test("friends: search is trimmed, case-insensitive, composes with filters; no results -> empty", () => {
  assert.deepEqual(ids(selectFriends(rows(people), "  ALI ", "all", "next")), ["also"]);
  assert.deepEqual(ids(selectFriends(rows(people), "ali", "today", "next")), []);
  assert.deepEqual(ids(selectFriends(rows(people), "zzz", "all", "next")), []);
});
test("friends: several people sharing a birthday all appear", () => {
  const same = [p("a", "A", 3, 3), p("b", "B", 3, 3), p("c", "C", 3, 3)];
  assert.equal(selectFriends(rows(same), "", "all", "next").length, 3);
});

const ev = (id: string, over: Partial<EventRecord>): EventRecord => ({ id, title: id, date: { year: 2019, month: 3, day: 3 }, time: null, description: null, category: null, repeat: "none", reminder: "none", createdAt: 0, updatedAt: 0, ...over });
const events = [
  ev("later", { date: { year: 2019, month: 5, day: 1 }, category: "exam" }),
  ev("today-late", { date: TODAY, time: "18:00" }),
  ev("today-early", { date: TODAY, time: "08:00" }),
  ev("past-old", { date: { year: 2018, month: 1, day: 1 } }),
  ev("past-new", { date: { year: 2019, month: 1, day: 29 } }),
  ev("yearly", { date: { year: 2010, month: 1, day: 1 }, repeat: "yearly" }),
];

test("events: upcoming sorted soonest first; same day by time; yearly counts as upcoming, never past", () => {
  const up = selectEvents(eventRows(events, TODAY), "upcoming", "", "all").map((r) => r.event.id);
  assert.deepEqual(up, ["today-early", "today-late", "later", "yearly"]);
  const past = selectEvents(eventRows(events, TODAY), "past", "", "all").map((r) => r.event.id);
  assert.deepEqual(past, ["past-new", "past-old"]);
});
test("events: today is upcoming, yesterday is past", () => {
  const up = selectEvents(eventRows(events, TODAY), "upcoming", "", "all").map((r) => r.event.id);
  assert.ok(up.includes("today-early") && !up.includes("past-new"));
});
test("events: search and category filter compose", () => {
  assert.deepEqual(selectEvents(eventRows(events, TODAY), "upcoming", "", "exam").map((r) => r.event.id), ["later"]);
  assert.deepEqual(selectEvents(eventRows(events, TODAY), "upcoming", "TODAY", "all").map((r) => r.event.id), ["today-early", "today-late"]);
  assert.deepEqual(selectEvents(eventRows(events, TODAY), "upcoming", "nothing", "all"), []);
});
