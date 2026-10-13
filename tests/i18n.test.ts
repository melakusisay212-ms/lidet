import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/i18n/en.ts";
import { am } from "../src/i18n/am.ts";
import { makeTranslator } from "../src/i18n/index.ts";
import { formatEthiopian, formatGregorian, formatTime, interpolate } from "../src/i18n/format.ts";
import { buildGreeting, GREETING_STYLES } from "../src/i18n/greetings.ts";
import { ET_MONTHS, WEEKDAYS, WEEKDAYS_SHORT } from "../src/i18n/names.ts";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("English and Amharic have identical keys, none empty", () => {
  assert.deepEqual(Object.keys(am).sort(), Object.keys(en).sort());
  for (const [k, v] of Object.entries(en)) assert.ok(v.trim().length > 0, `en ${k}`);
  for (const [k, v] of Object.entries(am)) assert.ok(v.trim().length > 0, `am ${k}`);
});

test("placeholders match across languages for every key", () => {
  for (const k of Object.keys(en) as Array<keyof typeof en>) {
    assert.deepEqual(placeholders(am[k]), placeholders(en[k]), `placeholders differ for ${k}`);
  }
});

test("Amharic strings actually contain Ethiopic script (guards against untranslated copies)", () => {
  const ethiopic = /[\u1200-\u137F]/;
  const allowedLatin = new Set(["region.english", "data.storageSqlite", "greeting.forBirthday"]) // names or pure placeholder templates;
  for (const [k, v] of Object.entries(am)) {
    if (allowedLatin.has(k)) continue;
    assert.ok(ethiopic.test(v), `am ${k} has no Ethiopic characters: ${v}`);
  }
});

test("translator interpolates and formats dates from structured values", () => {
  assert.equal(makeTranslator("en")("count.inDays", { n: 5 }), "In 5 days");
  assert.equal(makeTranslator("am")("count.inDays", { n: 5 }), "በ5 ቀናት ውስጥ");
  assert.equal(interpolate("{a}-{b}", { a: 1 }), "1-{b}");
  assert.equal(formatEthiopian({ year: 2019, month: 1, day: 30 }, "en"), "Meskerem 30, 2019");
  assert.equal(formatEthiopian({ year: 2019, month: 13, day: 6 }, "am"), "ጳጉሜን 6፣ 2019");
  assert.equal(formatGregorian({ year: 2026, month: 10, day: 10 }, "en"), "October 10, 2026");
  assert.equal(formatTime("00:05", "12h"), "12:05 AM");
  assert.equal(formatTime("13:30", "12h"), "1:30 PM");
  assert.equal(formatTime("13:30", "24h"), "13:30");
});

test("name tables are complete (13 Ethiopian months, 7 weekdays)", () => {
  for (const l of ["en", "am"] as const) {
    assert.equal(ET_MONTHS[l].length, 13);
    assert.equal(WEEKDAYS[l].length, 7);
    assert.equal(WEEKDAYS_SHORT[l].length, 7);
  }
});

test("greetings: every language/style works, name inserted safely, blank name omitted gracefully", () => {
  for (const l of ["en", "am"] as const) {
    for (const s of GREETING_STYLES) {
      const named = buildGreeting(l, s, "  Selam  ");
      assert.ok(named.includes("Selam") && !named.includes("{name}"));
      for (const blank of [null, undefined, "", "   "]) {
        const anon = buildGreeting(l, s, blank);
        assert.ok(anon.length > 0 && !anon.includes("{name}") && !anon.includes("undefined") && !anon.includes("null"));
      }
    }
  }
  // "$&" style replacement patterns in a name must not be interpreted
  assert.ok(buildGreeting("en", "short", "A$&B").includes("A$&B"));
});
