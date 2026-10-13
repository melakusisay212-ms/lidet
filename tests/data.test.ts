import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAppData, validatePerson, validateEvent, sanitizePrefs, validBirthDate } from "../src/data/validate.ts";
import { serializeExport, parseExport, DATA_FORMAT_VERSION } from "../src/data/export.ts";
import { EMPTY_DATA, DEFAULT_PREFERENCES } from "../src/domain/models.ts";
import type { AppData } from "../src/domain/models.ts";

const good: AppData = {
  profile: { month: 1, day: 30, year: 1995, updatedAt: 1 },
  people: [
    { id: "p1", name: "Abel", month: 13, day: 6, year: 2015, phone: null, notes: "college", createdAt: 1, updatedAt: 1 },
    { id: "p2", name: "No Birthday", month: null, day: null, year: null, phone: null, notes: null, createdAt: 1, updatedAt: 1 },
  ],
  events: [{ id: "e1", title: "Graduation", date: { year: 2019, month: 6, day: 15 }, time: "10:00", description: null, category: "graduation", repeat: "none", reminder: "on_day", createdAt: 1, updatedAt: 1 }],
  prefs: { ...DEFAULT_PREFERENCES, language: "am" },
};

test("export -> import round trip preserves everything", () => {
  const r = parseExport(serializeExport(good));
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.data, good);
  assert.equal(JSON.parse(serializeExport(good)).formatVersion, DATA_FORMAT_VERSION);
});

test("empty data round trips", () => {
  const r = parseExport(serializeExport(EMPTY_DATA));
  assert.ok(r.ok);
});

test("corrupt / foreign / newer files are rejected, never half-applied", () => {
  assert.deepEqual(parseExport("not json at all"), { ok: false, reason: "not_json" });
  assert.deepEqual(parseExport("42"), { ok: false, reason: "invalid" });
  assert.deepEqual(parseExport(JSON.stringify({ app: "other", formatVersion: 1, data: {} })), { ok: false, reason: "wrong_app" });
  assert.deepEqual(parseExport(JSON.stringify({ app: "lidet", formatVersion: 99, data: good })), { ok: false, reason: "newer_version" });
  const bad = JSON.parse(serializeExport(good));
  bad.data.people[0].month = 14;
  assert.deepEqual(parseExport(JSON.stringify(bad)), { ok: false, reason: "invalid" });
  const dup = JSON.parse(serializeExport(good));
  dup.data.people.push({ ...dup.data.people[0] });
  assert.deepEqual(parseExport(JSON.stringify(dup)), { ok: false, reason: "invalid" });
});

test("Pagume 6 birth date only valid in a leap birth year", () => {
  assert.ok(validBirthDate(2015, 13, 6));
  assert.equal(validBirthDate(2016, 13, 6), false);
  assert.equal(validatePerson({ ...good.people[0], year: 2016 }), null);
  assert.ok(validatePerson({ ...good.people[0], year: null }));
});

test("person: blank name, half-set birthday, out-of-range year all rejected", () => {
  assert.equal(validatePerson({ ...good.people[0], name: "   " }), null);
  assert.equal(validatePerson({ ...good.people[0], day: null }), null);
  assert.equal(validatePerson({ ...good.people[0], year: 1800 }), null);
  assert.equal(validatePerson({ ...good.people[0], name: "x".repeat(201) }), null);
  assert.equal(validatePerson("nope"), null);
});

test("event: invalid date, bad time, bad enums rejected; valid accepted", () => {
  const ev = good.events[0];
  assert.ok(validateEvent(ev));
  assert.equal(validateEvent({ ...ev, date: { year: 2018, month: 13, day: 6 } }), null);
  assert.equal(validateEvent({ ...ev, time: "25:00" }), null);
  assert.equal(validateEvent({ ...ev, repeat: "monthly" }), null);
  assert.equal(validateEvent({ ...ev, reminder: "weekly" }), null);
  assert.equal(validateEvent({ ...ev, category: "party" }), null);
  assert.equal(validateEvent({ ...ev, title: "" }), null);
});

test("prefs sanitising falls back to defaults field by field", () => {
  assert.deepEqual(sanitizePrefs(undefined), DEFAULT_PREFERENCES);
  const p = sanitizePrefs({ language: "fr", themeFamily: "nope", appearance: "dark", reminders: { time: "99:99", enabled: true } });
  assert.equal(p.language, "en");
  assert.equal(p.themeFamily, "signature");
  assert.equal(p.appearance, "dark");
  assert.equal(p.reminders.time, "09:00");
  assert.equal(p.reminders.enabled, true);
});

test("validateAppData tolerates a missing profile and rejects an invalid one", () => {
  assert.ok(validateAppData({ ...good, profile: null }));
  assert.equal(validateAppData({ ...good, profile: { month: 40, day: 1, year: null } }), null);
});
