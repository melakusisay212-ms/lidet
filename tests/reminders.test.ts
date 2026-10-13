import { test } from "node:test";
import assert from "node:assert/strict";
import { planReminders, diffSchedules, capReminders } from "../src/domain/reminders/plan.ts";
import { makeTranslator } from "../src/i18n/index.ts";
import { formatTime } from "../src/i18n/format.ts";
import { EMPTY_DATA, DEFAULT_PREFERENCES } from "../src/domain/models.ts";
import type { AppData, Person, EventRecord } from "../src/domain/models.ts";
import { todayEthiopian } from "../src/domain/calendar/index.ts";

const NOW = new Date(2026, 9, 10, 8, 0); // Sat 10 Oct 2026 08:00 local = Meskerem 30, 2019
const TODAY = todayEthiopian(NOW);
const t = makeTranslator("en");
const ft = (s: string) => formatTime(s, "24h");
const person = (id: string, name: string, month: number | null, day: number | null): Person => ({ id, name, month, day, year: null, phone: null, notes: null, createdAt: 0, updatedAt: 0 });
const event = (over: Partial<EventRecord>): EventRecord => ({ id: "e1", title: "Exam", date: { year: 2019, month: 2, day: 5 }, time: null, description: null, category: null, repeat: "none", reminder: "on_day", createdAt: 0, updatedAt: 0, ...over });
const data = (over: Partial<AppData>, enabled = true): AppData => ({ ...EMPTY_DATA, ...over, prefs: { ...DEFAULT_PREFERENCES, reminders: { ...DEFAULT_PREFERENCES.reminders, enabled } } });
const plan = (d: AppData, now = NOW) => planReminders(d, todayEthiopian(now), now, t, ft);

test("disabled -> nothing scheduled", () => {
  assert.deepEqual(plan(data({ people: [person("a", "A", 1, 30)] }, false)), []);
});

test("birthday today at 09:00 (after now) is planned; past day-before is not; next-year pair exists", () => {
  const p = plan(data({ people: [person("a", "Abel", 1, 30)] }));
  const keys = p.map((x) => x.key);
  assert.ok(keys.some((k) => k.startsWith("friend:a:day:2019-1-30")));
  assert.ok(!keys.some((k) => k.startsWith("friend:a:eve:2019-1-30")), "eve was yesterday 09:00 -> already past");
  assert.ok(keys.some((k) => k.startsWith("friend:a:eve:2020-1-30")) && keys.some((k) => k.startsWith("friend:a:day:2020-1-30")));
  const today9 = p.find((x) => x.key.startsWith("friend:a:day:2019-1-30"))!;
  assert.deepEqual(today9.fireAt, { year: 2026, month: 10, day: 10, hour: 9, minute: 0 });
  assert.equal(today9.body, "It’s Abel’s birthday today.");
});

test("same-day birthdays for several people do not collide", () => {
  const p = plan(data({ people: [person("a", "A", 3, 3), person("b", "B", 3, 3), person("c", "C", 3, 3)] }));
  assert.equal(new Set(p.map((x) => x.id)).size, p.length);
  assert.ok(p.length >= 6);
  for (const x of p) assert.ok(Number.isInteger(x.id) && x.id > 0 && x.id <= 0x7fffffff);
});

test("friends without a birthday never schedule anything", () => {
  assert.deepEqual(plan(data({ people: [person("a", "A", null, null)] })), []);
});

test("own birthday uses own wording", () => {
  const p = plan(data({ profile: { month: 1, day: 30, year: null, updatedAt: 0 } }));
  assert.ok(p.some((x) => x.title === "Happy birthday! 🎉"));
});

test("Pagume 6 birthday: adjusted Pagume 5 in a five-day year, literal in a six-day year", () => {
  const p = plan(data({ people: [person("a", "A", 13, 6)] }));
  const dayKeys = p.filter((x) => x.key.includes(":day:")).map((x) => x.key);
  assert.deepEqual(dayKeys, ["friend:a:day:2019-13-6", "friend:a:day:2020-13-5"]);
});

test("events: on-day uses event time; day-before uses preference time; past one-time events are skipped", () => {
  const timed = plan(data({ events: [event({ time: "14:30" })] }));
  assert.deepEqual(timed[0].fireAt.hour, 14);
  assert.equal(timed[0].body, "Today at 14:30");
  const eve = plan(data({ events: [event({ reminder: "day_before" })] }));
  assert.equal(eve[0].fireAt.hour, 9);
  assert.equal(eve[0].body, "Tomorrow");
  assert.deepEqual(plan(data({ events: [event({ date: { year: 2019, month: 1, day: 1 } })] })), []);
  assert.deepEqual(plan(data({ events: [event({ reminder: "none" })] })), []);
});

test("yearly events schedule the next occurrences", () => {
  const p = plan(data({ events: [event({ repeat: "yearly", date: { year: 2015, month: 1, day: 1 } })] }));
  assert.deepEqual(p.map((x) => x.key), ["event:e1:day:2020-1-1", "event:e1:day:2021-1-1"]);
});

test("ids are stable across runs and change when time or language changes", () => {
  const d = data({ people: [person("a", "A", 3, 3)] });
  assert.deepEqual(plan(d).map((x) => x.id), plan(d).map((x) => x.id));
  const later = { ...d, prefs: { ...d.prefs, reminders: { ...d.prefs.reminders, time: "18:00" } } };
  assert.notDeepEqual(plan(d).map((x) => x.id), plan(later).map((x) => x.id));
  const am = planReminders(d, TODAY, NOW, makeTranslator("am"), ft);
  assert.notDeepEqual(plan(d).map((x) => x.id), am.map((x) => x.id));
});

test("diff: edit/delete cancels stale, reopening the app adds no duplicates", () => {
  const d1 = data({ people: [person("a", "A", 3, 3), person("b", "B", 4, 4)] });
  const first = plan(d1);
  const afterOpenAgain = diffSchedules(first.map((x) => x.id), plan(d1));
  assert.deepEqual(afterOpenAgain, { cancel: [], schedule: [] });
  const d2 = data({ people: [person("a", "A", 3, 3)] }); // friend b deleted
  const del = diffSchedules(first.map((x) => x.id), plan(d2));
  assert.equal(del.schedule.length, 0);
  assert.deepEqual(del.cancel.sort(), first.filter((x) => x.key.startsWith("friend:b")).map((x) => x.id).sort());
  const d3 = data({ people: [person("a", "A", 5, 5), person("b", "B", 4, 4)] }); // friend a edited
  const edit = diffSchedules(first.map((x) => x.id), plan(d3));
  assert.ok(edit.cancel.length > 0 && edit.schedule.length > 0);
  assert.ok(edit.schedule.every((x) => x.key.startsWith("friend:a")));
});

test("cap keeps the soonest reminders and is stable", () => {
  const many = data({ people: Array.from({ length: 300 }, (_, i) => person(`p${i}`, `P${i}`, 1 + (i % 12), 1 + (i % 28))) });
  const all = plan(many);
  assert.ok(all.length > 400);
  const capped = capReminders(all, 400);
  assert.equal(capped.length, 400);
  const when = (p: (typeof all)[number]) => new Date(p.fireAt.year, p.fireAt.month - 1, p.fireAt.day, p.fireAt.hour, p.fireAt.minute).getTime();
  const latestKept = Math.max(...capped.map(when));
  const keptIds = new Set(capped.map((c) => c.id));
  for (const p of all) if (!keptIds.has(p.id)) assert.ok(when(p) >= latestKept);
  assert.deepEqual(capReminders(all, 400).map((x) => x.id), capped.map((x) => x.id));
});
