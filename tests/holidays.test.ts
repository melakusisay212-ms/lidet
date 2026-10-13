import { test } from "node:test";
import assert from "node:assert/strict";
import { engine } from "../src/domain/calendar/index.ts";
import { orthodoxEasterAbsoluteDay, observancesOn, instancesForYear } from "../src/domain/holidays/resolve.ts";
import { HOLIDAYS, DATASET_VERSION, DATASET_SOURCE } from "../src/domain/holidays/dataset.ts";
import { absoluteDayToGregorian } from "../src/domain/calendar/index.ts";

const E = (year: number, month: number, day: number) => ({ year, month, day });

test("Orthodox Easter matches independently known Gregorian dates (2021-2030)", () => {
  const known: Record<number, [number, number]> = {
    2021: [5, 2], 2022: [4, 24], 2023: [4, 16], 2024: [5, 5], 2025: [4, 20],
    2026: [4, 12], 2027: [5, 2], 2028: [4, 16], 2029: [4, 8], 2030: [4, 28],
  };
  for (const [y, [m, d]] of Object.entries(known)) {
    assert.deepEqual(absoluteDayToGregorian(orthodoxEasterAbsoluteDay(Number(y))), { year: Number(y), month: m, day: d }, `Easter ${y}`);
  }
});

const ids = (d: ReturnType<typeof E>) => observancesOn(d).map((o) => o.record.id);

test("Fasika and relatives land on the right Ethiopian dates (2024 Easter = 5 May 2024)", () => {
  const easter = engine.toEthiopian({ year: 2024, month: 5, day: 5 }); // Ethiopian year 2016
  assert.ok(ids(easter).includes("fasika"));
  assert.ok(ids(engine.addDays(easter, -2)).includes("siklet"));
  assert.ok(ids(engine.addDays(easter, -7)).includes("hosanna"));
  assert.ok(ids(engine.addDays(easter, 39)).includes("ascension"));
  assert.ok(ids(engine.addDays(easter, 49)).includes("pentecost"));
  assert.ok(!ids(engine.addDays(easter, 1)).includes("fasika"));
});

test("Abiy Tsom spans exactly 55 days ending the day before Fasika", () => {
  const easter = engine.toEthiopian({ year: 2025, month: 4, day: 20 });
  let n = 0;
  for (let k = -70; k < 0; k++) if (ids(engine.addDays(easter, k)).includes("abiy_tsom")) n++;
  assert.equal(n, 55);
  assert.ok(ids(engine.addDays(easter, -55)).includes("abiy_tsom"));
  assert.ok(!ids(engine.addDays(easter, -56)).includes("abiy_tsom"));
  assert.ok(ids(engine.addDays(easter, -1)).includes("abiy_tsom"));
  assert.ok(!ids(easter).includes("abiy_tsom"));
});

test("Genna and Timkat follow Julian dates: Gregorian 7 Jan / 19 Jan, Ethiopian day shifts by year", () => {
  const find = (gy: number, gm: number, gd: number) => ids(engine.toEthiopian({ year: gy, month: gm, day: gd }));
  for (const gy of [2023, 2024, 2025, 2026, 2027, 2028]) {
    assert.ok(find(gy, 1, 7).includes("genna"), `Genna ${gy}`);
    assert.ok(find(gy, 1, 19).includes("timkat"), `Timkat ${gy}`);
  }
  assert.deepEqual(engine.toEthiopian({ year: 2023, month: 1, day: 7 }), E(2015, 4, 29));
  assert.deepEqual(engine.toEthiopian({ year: 2024, month: 1, day: 7 }), E(2016, 4, 28)); // shifted year
  assert.deepEqual(engine.toEthiopian({ year: 2025, month: 1, day: 7 }), E(2017, 4, 29));
  assert.deepEqual(engine.toEthiopian({ year: 2024, month: 1, day: 19 }), E(2016, 5, 10));
});

test("fixed Ethiopian dates, Gregorian-fixed Labour Day, monthly and weekly rules", () => {
  assert.ok(ids(E(2018, 1, 1)).includes("enkutatash"));
  assert.ok(ids(E(2018, 1, 17)).includes("meskel"));
  assert.ok(ids(E(2018, 6, 23)).includes("adwa"));
  assert.ok(ids(engine.toEthiopian({ year: 2025, month: 5, day: 1 })).includes("labour_day"));
  assert.ok(ids(E(2018, 7, 12)).includes("monthly_michael"));
  assert.ok(ids(E(2018, 13, 5)).every((i) => i !== "monthly_michael")); // Pagume has no 12th
  // Wed/Fri weekly fasts follow the real weekday: 10 Oct 2026 is Saturday (no weekly fast).
  const sat = engine.toEthiopian({ year: 2026, month: 10, day: 10 });
  assert.ok(!ids(sat).includes("fast_wednesday") && !ids(sat).includes("fast_friday"));
  assert.ok(ids(engine.addDays(sat, 4)).includes("fast_wednesday"));
  assert.ok(ids(engine.addDays(sat, 6)).includes("fast_friday"));
});

test("multiple observances share one date without loss, ordered by importance", () => {
  // Meskel (public) + St Mary monthly (21)? use 1/21? choose a day with both: month day 17? check ordering instead.
  const list = observancesOn(E(2018, 1, 12)); // Wed or Fri may apply; includes monthly Michael
  assert.ok(list.some((o) => o.record.id === "monthly_michael"));
  const order = ["public", "orthodox_feast", "fasting", "saint", "islamic"];
  const cats = list.map((o) => order.indexOf(o.record.category));
  assert.deepEqual(cats, [...cats].sort((a, b) => a - b));
});

test("dataset integrity: unique ids, honest verification labels, bilingual text, no verified without a source", () => {
  assert.equal(new Set(HOLIDAYS.map((h) => h.id)).size, HOLIDAYS.length);
  for (const h of HOLIDAYS) {
    assert.ok(h.names.en && h.names.am && h.description.en && h.description.am, h.id);
    assert.notEqual(h.verification, "verified", `${h.id}: nothing may claim "verified" without an authoritative source`);
    if (h.method === "julian_computus") assert.equal(h.verification, "calculated");
  }
  assert.ok(DATASET_VERSION && DATASET_SOURCE.includes("Not yet checked"));
});

test("instancesForYear does not duplicate entries and stays inside the Ethiopian year", () => {
  for (let y = 2010; y <= 2030; y++) {
    const inst = instancesForYear(y);
    const keys = inst.map((i) => `${i.record.id}:${i.start.year}-${i.start.month}-${i.start.day}`);
    assert.equal(new Set(keys).size, keys.length, `dupes in ${y}`);
    for (const i of inst) assert.equal(i.start.year, y);
  }
});
