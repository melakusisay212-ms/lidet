import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBirthday, parseDate, validTime } from "../src/features/date-logic.ts";
import { makeTranslator } from "../src/i18n/index.ts";

const t = makeTranslator("en");
const TODAY = { year: 2019, month: 1, day: 30 };
const bd = (month: number | null, day: number | null, year = "") => ({ month, day, year });

test("optional birthday: empty is fine when not required, error when required", () => {
  assert.deepEqual(parseBirthday(bd(null, null), { required: false, today: TODAY }, t), { ok: true, month: null, day: null, year: null });
  assert.equal(parseBirthday(bd(null, null), { required: true, today: TODAY }, t).ok, false);
});

test("half-filled month/day is rejected; year without month/day is rejected", () => {
  assert.equal(parseBirthday(bd(3, null), { required: false, today: TODAY }, t).ok, false);
  assert.equal(parseBirthday(bd(null, 3), { required: false, today: TODAY }, t).ok, false);
  assert.equal(parseBirthday(bd(null, null, "2000"), { required: false, today: TODAY }, t).ok, false);
});

test("unknown birth year keeps the recurring rule and never invents an age", () => {
  assert.deepEqual(parseBirthday(bd(1, 30), { required: true, today: TODAY }, t), { ok: true, month: 1, day: 30, year: null });
});

test("Pagume 6 requires a leap birth year; Pagume 7 and Meskerem 31 never valid", () => {
  assert.equal(parseBirthday(bd(13, 6, "2016"), { required: true, today: TODAY }, t).ok, false);
  assert.deepEqual(parseBirthday(bd(13, 6, "2015"), { required: true, today: TODAY }, t), { ok: true, month: 13, day: 6, year: 2015 });
  assert.deepEqual(parseBirthday(bd(13, 6), { required: true, today: TODAY }, t), { ok: true, month: 13, day: 6, year: null });
  assert.equal(parseBirthday(bd(13, 7), { required: true, today: TODAY }, t).ok, false);
  assert.equal(parseBirthday(bd(1, 31), { required: true, today: TODAY }, t).ok, false);
});

test("birth year: must be 4 digits, in supported range, and not in the future", () => {
  for (const y of ["99", "20000", "abcd", "1899", "2201"]) assert.equal(parseBirthday(bd(2, 2, y), { required: true, today: TODAY }, t).ok, false, y);
  assert.equal(parseBirthday(bd(2, 2, "2019"), { required: true, today: TODAY }, t).ok, false, "2019-02-02 is after today 2019-01-30");
  assert.equal(parseBirthday(bd(1, 30, "2019"), { required: true, today: TODAY }, t).ok, true, "born today is allowed");
  assert.equal(parseBirthday(bd(2, 2, "2018"), { required: true, today: TODAY }, t).ok, true);
});

test("event date parsing", () => {
  assert.deepEqual(parseDate({ year: "2019", month: 2, day: 5 }), { year: 2019, month: 2, day: 5 });
  assert.equal(parseDate({ year: "2018", month: 13, day: 6 }), null);
  assert.equal(parseDate({ year: "20", month: 2, day: 5 }), null);
  assert.equal(parseDate({ year: "2019", month: null, day: 5 }), null);
  assert.equal(parseDate({ year: "1850", month: 2, day: 5 }), null);
});

test("time validation", () => {
  for (const ok of ["00:00", "09:30", "23:59"]) assert.ok(validTime(ok));
  for (const bad of ["24:00", "9:30", "12:60", "", "ab:cd"]) assert.equal(validTime(bad), false);
});
