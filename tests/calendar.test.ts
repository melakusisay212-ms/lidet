import { test } from "node:test";
import assert from "node:assert/strict";
import { engine, addMonthsClamped, todayEthiopian, localGregorian, diffDays } from "../src/domain/calendar/index.ts";
import { gregorianToAbsoluteDay, absoluteDayToGregorian } from "../src/domain/calendar/index.ts";

const E = (year: number, month: number, day: number) => ({ year, month, day });
const G = (year: number, month: number, day: number) => ({ year, month, day });

// Independent fixtures: civil/historical dates, NOT derived from the engine.
const GOLDEN: Array<[string, ReturnType<typeof E>, ReturnType<typeof G>, number]> = [
  ["Millennium 2007-09-12 (Wed)", E(2000, 1, 1), G(2007, 9, 12), 3],
  ["Pagume 6 in leap year 2015", E(2015, 13, 6), G(2023, 9, 11), 1],
  ["Enkutatash 2016", E(2016, 1, 1), G(2023, 9, 12), 2],
  ["Enkutatash 2017", E(2017, 1, 1), G(2024, 9, 11), 3],
  ["Enkutatash 2018", E(2018, 1, 1), G(2025, 9, 11), 4],
  ["Genna 2023-01-07 (Sat)", E(2015, 4, 29), G(2023, 1, 7), 6],
  ["Meskel 2024-09-27 (Fri)", E(2017, 1, 17), G(2024, 9, 27), 5],
];

test("golden fixtures convert both ways and weekdays match", () => {
  for (const [name, e, g, wd] of GOLDEN) {
    assert.deepEqual(engine.toGregorian(e), g, name);
    assert.deepEqual(engine.toEthiopian(g), e, name);
    assert.equal(engine.weekday(e), wd, name);
  }
});

test("Gregorian side agrees with JS Date across the whole supported range", () => {
  const start = engine.toAbsoluteDay(E(1900, 1, 1));
  const end = engine.toAbsoluteDay(E(2200, 13, 5));
  for (let j = start; j <= end; j++) {
    const g = absoluteDayToGregorian(j);
    const ms = Date.UTC(g.year, g.month - 1, g.day);
    assert.equal(Math.floor(ms / 86400000) + 2440588, j);
    assert.equal(new Date(ms).getUTCDay(), engine.weekday(engine.fromAbsoluteDay(j)));
    assert.equal(gregorianToAbsoluteDay(g), j);
  }
});

test("exhaustive round trip 1900-2200, contiguous days, all valid", () => {
  const start = engine.toAbsoluteDay(E(1900, 1, 1));
  const end = engine.toAbsoluteDay(E(2200, 13, 5));
  for (let j = start; j <= end; j++) {
    const d = engine.fromAbsoluteDay(j);
    assert.ok(engine.validate(d).ok);
    assert.equal(engine.toAbsoluteDay(d), j);
  }
});

test("validation: months, days, Pagume lengths, range", () => {
  assert.ok(engine.validate(E(2016, 4, 29)).ok);
  assert.ok(engine.validate(E(2016, 13, 5)).ok);
  assert.equal(engine.validate(E(2016, 13, 6)).ok, false);
  assert.ok(engine.validate(E(2015, 13, 6)).ok);
  for (const bad of [E(2016, 0, 1), E(2016, 14, 1), E(2016, 1, 0), E(2016, 1, 31), E(2016, 1.5, 1), E(1899, 1, 1), E(2201, 1, 1)]) {
    assert.equal(engine.validate(bad).ok, false, JSON.stringify(bad));
  }
  assert.throws(() => engine.toAbsoluteDay(E(2016, 13, 6)), RangeError);
});

test("range boundary: no silent corruption", () => {
  assert.throws(() => engine.addDays(E(2200, 13, 5), 1), RangeError);
  assert.throws(() => engine.addDays(E(1900, 1, 1), -1), RangeError);
  assert.deepEqual(engine.addDays(E(2200, 13, 4), 1), E(2200, 13, 5));
});

test("rollover and add/subtract symmetry", () => {
  assert.deepEqual(engine.addDays(E(2015, 13, 6), 1), E(2016, 1, 1));
  assert.deepEqual(engine.addDays(E(2016, 13, 5), 1), E(2017, 1, 1));
  assert.deepEqual(engine.addDays(E(2016, 1, 30), 1), E(2016, 2, 1));
  for (const n of [1, 29, 30, 365, 366, 1461, 10000]) {
    const d = E(2019, 6, 15);
    assert.deepEqual(engine.addDays(engine.addDays(d, n), -n), d);
  }
});

test("addMonthsClamped across Pagume and year boundary", () => {
  assert.deepEqual(addMonthsClamped(E(2016, 12, 30), 1), E(2016, 13, 5)); // clamp to 5-day Pagume
  assert.deepEqual(addMonthsClamped(E(2015, 12, 30), 1), E(2015, 13, 6)); // leap year keeps 6
  assert.deepEqual(addMonthsClamped(E(2016, 13, 5), 1), E(2017, 1, 5));
  assert.deepEqual(addMonthsClamped(E(2016, 1, 10), 13), E(2017, 1, 10));
  assert.deepEqual(addMonthsClamped(E(2016, 1, 10), -1), E(2015, 13, 6)); // day 10 clamps to Pagume 6
});

test("anchor: Sat 10 Oct 2026 = Meskerem 30, 2019 EC (local date, not UTC)", () => {
  const now = new Date(2026, 9, 10, 23, 59, 59); // local time, late evening
  assert.deepEqual(localGregorian(now), G(2026, 10, 10));
  assert.deepEqual(todayEthiopian(now), E(2019, 1, 30));
  assert.equal(diffDays(E(2019, 1, 30), E(2019, 2, 1)), 1);
});
