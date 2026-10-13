import { test } from "node:test";
import assert from "node:assert/strict";
import { engine, addMonthsClamped } from "../src/domain/calendar/index.ts";
import { calculateAge, anniversaryInYear } from "../src/domain/age/age.ts";

const E = (year: number, month: number, day: number) => ({ year, month, day });
const A = (years: number, months: number, days: number) => ({ years, months, days });
const strip = (a: ReturnType<typeof calculateAge>) => (a ? { years: a.years, months: a.months, days: a.days } : null);

test("zero age, one day, one month", () => {
  assert.deepEqual(calculateAge(E(2000, 1, 1), E(2000, 1, 1)), { ...A(0, 0, 0), totalDays: 0 });
  assert.deepEqual(strip(calculateAge(E(2000, 1, 1), E(2000, 1, 2))), A(0, 0, 1));
  assert.deepEqual(calculateAge(E(2000, 1, 1), E(2000, 2, 1)), { ...A(0, 1, 0), totalDays: 30 });
});

test("day before and day of birthday", () => {
  assert.deepEqual(strip(calculateAge(E(2000, 5, 10), E(2019, 5, 9))), A(18, 12, 29));
  assert.deepEqual(strip(calculateAge(E(2000, 5, 10), E(2019, 5, 10))), A(19, 0, 0));
});

test("Ethiopian New Year / Pagume boundary", () => {
  assert.deepEqual(strip(calculateAge(E(2000, 1, 1), E(2019, 13, 6))), A(19, 12, 5));
  assert.deepEqual(strip(calculateAge(E(2000, 1, 1), E(2020, 1, 1))), A(20, 0, 0));
});

test("regression: clamped Pagume anniversary never yields 13 months", () => {
  // Born Pagume 6 1999 (leap). On Pagume 5 2003 (leap year) the true anniversary (Pagume 6) is tomorrow.
  assert.deepEqual(strip(calculateAge(E(1999, 13, 6), E(2003, 13, 5))), A(3, 12, 30));
  assert.deepEqual(strip(calculateAge(E(1999, 13, 6), E(2003, 13, 6))), A(4, 0, 0));
});

test("future birth date is not an age", () => {
  assert.equal(calculateAge(E(2020, 1, 1), E(2019, 1, 1)), null);
});

test("PROPOSED Pagume 6 rule: anniversary lands on Pagume 5 in five-day years", () => {
  const birth = E(2015, 13, 6);
  assert.deepEqual(anniversaryInYear(birth, 2016), E(2016, 13, 5));
  assert.deepEqual(anniversaryInYear(birth, 2019), E(2019, 13, 6));
  assert.deepEqual(strip(calculateAge(birth, E(2016, 13, 5))), A(1, 0, 0));
  assert.deepEqual(strip(calculateAge(birth, E(2016, 13, 4))), A(0, 12, 28));
  assert.deepEqual(strip(calculateAge(birth, E(2019, 13, 6))), A(4, 0, 0));
});

test("totalDays is the exact day difference, never days/365 based", () => {
  const a = calculateAge(E(2000, 1, 1), E(2019, 1, 30))!;
  assert.equal(a.totalDays, engine.toAbsoluteDay(E(2019, 1, 30)) - engine.toAbsoluteDay(E(2000, 1, 1)));
});

test("invariants over thousands of days: reconstructable, non-negative, monotonic", () => {
  const births = [E(2000, 1, 1), E(2000, 12, 30), E(2000, 13, 5), E(1999, 13, 6), E(2003, 13, 6), E(2001, 7, 17)];
  for (const birth of births) {
    const start = engine.toAbsoluteDay(birth);
    let prev: number[] | null = null;
    for (let j = start; j < start + 3000; j++) {
      const today = engine.fromAbsoluteDay(j);
      const age = calculateAge(birth, today)!;
      assert.ok(age.years >= 0 && age.months >= 0 && age.months <= 12 && age.days >= 0 && age.days <= 36, JSON.stringify([birth, today, age]));
      const anchor = addMonthsClamped(anniversaryInYear(birth, birth.year + age.years), age.months);
      assert.deepEqual(engine.addDays(anchor, age.days), today, JSON.stringify([birth, today, age]));
      const tuple = [age.years, age.months, age.days];
      if (prev) assert.ok(tuple[0] > prev[0] || (tuple[0] === prev[0] && (tuple[1] > prev[1] || (tuple[1] === prev[1] && tuple[2] >= prev[2]))), JSON.stringify([birth, today, prev, tuple]));
      prev = tuple;
    }
  }
});
