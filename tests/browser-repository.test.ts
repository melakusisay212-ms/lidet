import { test } from "node:test";
import assert from "node:assert/strict";
import { BrowserRepository, BROWSER_KEY, CORRUPT_KEY } from "../src/data/browser-repository.ts";
import { DEFAULT_PREFERENCES, EMPTY_DATA } from "../src/domain/models.ts";
import type { EventRecord, Person } from "../src/domain/models.ts";

function fakeKv(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}
const person = (id: string, name: string): Person => ({ id, name, month: 3, day: 3, year: null, phone: null, notes: null, createdAt: 1, updatedAt: 1 });
const event = (id: string): EventRecord => ({ id, title: "T", date: { year: 2019, month: 2, day: 2 }, time: null, description: null, category: null, repeat: "none", reminder: "none", createdAt: 1, updatedAt: 1 });

test("empty store loads defaults; writes persist across a new instance (restart)", async () => {
  const kv = fakeKv();
  const a = new BrowserRepository(kv);
  assert.deepEqual(await a.load(), EMPTY_DATA);
  await a.upsertPerson(person("1", "Abel"));
  await a.saveProfile({ month: 1, day: 1, year: null, updatedAt: 5 });
  await a.savePrefs({ ...DEFAULT_PREFERENCES, language: "am" });
  const b = new BrowserRepository(kv);
  const d = await b.load();
  assert.equal(d.people.length, 1);
  assert.equal(d.profile?.day, 1);
  assert.equal(d.prefs.language, "am");
});

test("upsert replaces by id (edit), delete removes, many entries may share a date", async () => {
  const r = new BrowserRepository(fakeKv());
  await r.load();
  await r.upsertPerson(person("1", "A")); await r.upsertPerson(person("2", "B"));
  await r.upsertPerson({ ...person("1", "A2") });
  await r.upsertEvent(event("e1")); await r.upsertEvent(event("e2")); // same date twice
  let d = await r.load();
  assert.deepEqual(d.people.map((p) => p.name).sort(), ["A2", "B"]);
  assert.equal(d.events.length, 2);
  await r.deletePerson("1"); await r.deleteEvent("e1");
  d = await r.load();
  assert.equal(d.people.length, 1); assert.equal(d.events.length, 1);
});

test("corrupt data is quarantined, not silently destroyed, and a warning is raised", async () => {
  const kv = fakeKv({ [BROWSER_KEY]: "{ this is not json" });
  const r = new BrowserRepository(kv);
  const d = await r.load();
  assert.deepEqual(d, EMPTY_DATA);
  assert.equal(kv.m.get(CORRUPT_KEY), "{ this is not json");
  assert.deepEqual(r.warnings, ["corrupt_data_quarantined"]);
});

test("structurally invalid data (bad record) is quarantined too", async () => {
  const bad = JSON.stringify({ profile: null, people: [{ id: "x", name: "N", month: 99, day: 1 }], events: [], prefs: {} });
  const kv = fakeKv({ [BROWSER_KEY]: bad });
  const r = new BrowserRepository(kv);
  await r.load();
  assert.equal(kv.m.get(CORRUPT_KEY), bad);
});

test("a failed write (e.g. quota) throws and leaves in-memory state unchanged", async () => {
  const kv = fakeKv();
  const r = new BrowserRepository({ ...kv, setItem: () => { throw new Error("QuotaExceededError"); } });
  await r.load();
  await assert.rejects(() => r.upsertPerson(person("1", "A")), /Quota/);
  assert.equal((await r.load()).people.length, 0);
});

test("replaceAll and clearAll", async () => {
  const kv = fakeKv();
  const r = new BrowserRepository(kv);
  await r.load();
  await r.replaceAll({ ...EMPTY_DATA, people: [person("1", "A")] });
  assert.equal((await new BrowserRepository(kv).load()).people.length, 1);
  await r.clearAll();
  assert.equal(kv.m.has(BROWSER_KEY), false);
  assert.deepEqual(await new BrowserRepository(kv).load(), EMPTY_DATA);
});
