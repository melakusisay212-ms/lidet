import { test } from "node:test";
import assert from "node:assert/strict";
import { engine } from "../src/domain/calendar/index.ts";
import { nextOccurrence, occurrenceInYear, upcomingOccurrences, isValidRule } from "../src/domain/birthdays/birthday.ts";

const E = (year: number, month: number, day: number) => ({ year, month, day });

test("birthday today -> 0 days", () => {
  const r = nextOccurrence({ month: 1, day: 30 }, E(2019, 1, 30));
  assert.deepEqual(r.date, E(2019, 1, 30));
  assert.equal(r.daysRemaining, 0);
});

test("birthday later this year / earlier this year", () => {
  assert.deepEqual(nextOccurrence({ month: 6, day: 1 }, E(2019, 2, 1)).date, E(2019, 6, 1));
  assert.deepEqual(nextOccurrence({ month: 1, day: 1 }, E(2019, 2, 1)).date, E(2020, 1, 1));
});

test("exact day counts use the real year length (2019 is a 366-day year)", () => {
  // 2019-01-30 -> 2020-01-29 = 366 - 1
  assert.equal(nextOccurrence({ month: 1, day: 29 }, E(2019, 1, 30)).daysRemaining, 365);
  // 2020 is 365 days: 2020-01-30 -> 2021-01-29 = 364
  assert.equal(nextOccurrence({ month: 1, day: 29 }, E(2020, 1, 30)).daysRemaining, 364);
});

test("Pagume 6: unchanged in six-day Pagume year, adjusted to Pagume 5 otherwise", () => {
  const leap = nextOccurrence({ month: 13, day: 6 }, E(2019, 1, 1));
  assert.deepEqual(leap.date, E(2019, 13, 6));
  assert.equal(leap.adjustedForMissingDate, false);
  assert.equal(leap.daysRemaining, 365);

  const ordinary = nextOccurrence({ month: 13, day: 6 }, E(2020, 1, 1));
  assert.deepEqual(ordinary.date, E(2020, 13, 5));
  assert.equal(ordinary.adjustedForMissingDate, true);
  assert.equal(ordinary.daysRemaining, 364); // 12*30 + 4

  const onTheDay = nextOccurrence({ month: 13, day: 6 }, E(2020, 13, 5));
  assert.equal(onTheDay.daysRemaining, 0);
  assert.equal(onTheDay.adjustedForMissingDate, true);
});

test("after the adjusted day passes, next occurrence is the following year (no duplicate or missed)", () => {
  // 2019 is leap so Pagume 6 2019 literal; the day after it is 2020-01-01 -> next is 2020-13-5.
  assert.deepEqual(nextOccurrence({ month: 13, day: 6 }, E(2020, 1, 1)).date, E(2020, 13, 5));
  // after 2020-13-5 passes (today = 2021-01-01) next is 2021-13-5 (2021 non-leap), then 2023-13-6 literal.
  assert.deepEqual(nextOccurrence({ month: 13, day: 6 }, E(2021, 1, 1)).date, E(2021, 13, 5));
  const seq = upcomingOccurrences({ month: 13, day: 6 }, E(2021, 1, 1), 4).map((o) => o.date);
  assert.deepEqual(seq, [E(2021, 13, 5), E(2022, 13, 5), E(2023, 13, 6), E(2024, 13, 5)]);
});

test("New Year boundary", () => {
  const r = nextOccurrence({ month: 1, day: 1 }, E(2019, 13, 6));
  assert.deepEqual(r.date, E(2020, 1, 1));
  assert.equal(r.daysRemaining, 1);
});

test("rule validation", () => {
  assert.ok(isValidRule({ month: 13, day: 6 }));
  for (const bad of [{ month: 13, day: 7 }, { month: 1, day: 31 }, { month: 0, day: 1 }, { month: 14, day: 1 }, { month: 1, day: 0 }, { month: 1.5, day: 1 }]) {
    assert.equal(isValidRule(bad), false, JSON.stringify(bad));
  }
  assert.throws(() => occurrenceInYear({ month: 1, day: 31 }, 2019), RangeError);
});

test("every valid rule yields a valid future-or-today occurrence from every day of a 4-year window", () => {
  const start = engine.toAbsoluteDay(E(2018, 1, 1));
  const rules = [{ month: 1, day: 1 }, { month: 12, day: 30 }, { month: 13, day: 5 }, { month: 13, day: 6 }, { month: 6, day: 15 }];
  for (let j = start; j < start + 1461; j++) {
    const today = engine.fromAbsoluteDay(j);
    for (const rule of rules) {
      const o = nextOccurrence(rule, today);
      assert.ok(engine.validate(o.date).ok);
      assert.ok(o.daysRemaining >= 0 && o.daysRemaining <= 366);
    }
  }
});
