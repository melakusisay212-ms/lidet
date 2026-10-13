import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import { EMPTY_DATA } from "../domain/models.ts";
import type { AppData, EventRecord, Person, Preferences, Profile } from "../domain/models.ts";
import type { Repository } from "./repository.ts";
import { sanitizePrefs, validateEvent, validatePerson, validateProfile } from "./validate.ts";

/** Minimal structural view of the plugin connection, so a plugin typing change cannot break compilation. */
type SqlValue = string | number | null;
interface SqlDb {
  open(): Promise<void>;
  execute(statements: string, transaction?: boolean): Promise<unknown>;
  run(statement: string, values?: SqlValue[], transaction?: boolean): Promise<unknown>;
  query(statement: string, values?: SqlValue[]): Promise<{ values?: Array<Record<string, unknown>> }>;
  executeSet(set: Array<{ statement: string; values?: SqlValue[] }>, transaction?: boolean): Promise<unknown>;
}

const DB_NAME = "lidet";

/**
 * Forward-only migrations. Index 0 creates schema version 1. NEVER edit an existing entry or drop user tables;
 * add a new entry instead (spec 8.4: no destructive migrations).
 * No UNIQUE constraint on any date column: many entries may share a date (spec 5.7).
 */
export const MIGRATIONS: readonly string[][] = [
  [
    "CREATE TABLE IF NOT EXISTS profile (id INTEGER PRIMARY KEY CHECK (id = 1), month INTEGER NOT NULL, day INTEGER NOT NULL, year INTEGER, updated_at INTEGER NOT NULL)",
    "CREATE TABLE IF NOT EXISTS people (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, bmonth INTEGER, bday INTEGER, byear INTEGER, phone TEXT, notes TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
    "CREATE INDEX IF NOT EXISTS idx_people_birthday ON people (bmonth, bday)",
    "CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, e_year INTEGER NOT NULL, e_month INTEGER NOT NULL, e_day INTEGER NOT NULL, time TEXT, description TEXT, category TEXT, repeat TEXT NOT NULL, reminder TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
    "CREATE INDEX IF NOT EXISTS idx_events_date ON events (e_year, e_month, e_day)",
    "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
  ],
];
export const SCHEMA_VERSION = MIGRATIONS.length;

const nz = (v: unknown): string | number | null => (v === undefined ? null : (v as string | number | null));

export class SqliteRepository implements Repository {
  readonly kind = "sqlite" as const;
  readonly warnings: string[] = [];
  private readonly db: SqlDb;
  private constructor(db: SqlDb) {
    this.db = db;
  }

  static async open(): Promise<SqliteRepository> {
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    const consistent = (await sqlite.checkConnectionsConsistency()).result;
    const exists = (await sqlite.isConnection(DB_NAME, false)).result;
    const conn = consistent && exists
      ? await sqlite.retrieveConnection(DB_NAME, false)
      : await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);
    const db = conn as unknown as SqlDb;
    await db.open();
    const repo = new SqliteRepository(db);
    await repo.migrate();
    return repo;
  }

  private async migrate(): Promise<void> {
    await this.db.execute("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)");
    const res = await this.db.query("SELECT value FROM meta WHERE key = ?", ["schema_version"]);
    const current = res.values && res.values[0] ? Number(res.values[0].value) : 0;
    for (let v = current; v < MIGRATIONS.length; v++) {
      const steps = MIGRATIONS[v].map((statement) => ({ statement }));
      steps.push({ statement: "INSERT OR REPLACE INTO meta (key, value) VALUES (\u0027schema_version\u0027, \u0027" + (v + 1) + "\u0027)" });
      await this.db.executeSet(steps, true); // each migration is atomic
    }
  }

  async load(): Promise<AppData> {
    const [prof, ppl, evs, set] = await Promise.all([
      this.db.query("SELECT month, day, year, updated_at AS updatedAt FROM profile WHERE id = 1"),
      this.db.query("SELECT id, name, bmonth AS month, bday AS day, byear AS year, phone, notes, created_at AS createdAt, updated_at AS updatedAt FROM people"),
      this.db.query("SELECT id, title, e_year, e_month, e_day, time, description, category, repeat, reminder, created_at AS createdAt, updated_at AS updatedAt FROM events"),
      this.db.query("SELECT value FROM settings WHERE key = ?", ["prefs"]),
    ]);
    let skipped = 0;
    const people: Person[] = [];
    for (const row of ppl.values ?? []) { const p = validatePerson(row); if (p) people.push(p); else skipped++; }
    const events: EventRecord[] = [];
    for (const row of evs.values ?? []) {
      const ev = validateEvent({ ...row, date: { year: row.e_year, month: row.e_month, day: row.e_day } });
      if (ev) events.push(ev); else skipped++;
    }
    if (skipped > 0) this.warnings.push(`skipped_invalid_rows:${skipped}`); // rows stay in the DB; nothing is deleted
    let prefs = EMPTY_DATA.prefs;
    try { prefs = sanitizePrefs(set.values && set.values[0] ? JSON.parse(String(set.values[0].value)) : undefined); } catch { /* defaults */ }
    const profile = prof.values && prof.values[0] ? validateProfile(prof.values[0]) : null;
    return { profile, people, events, prefs };
  }

  async saveProfile(profile: Profile | null): Promise<void> {
    if (!profile) { await this.db.run("DELETE FROM profile WHERE id = 1"); return; }
    await this.db.run("INSERT OR REPLACE INTO profile (id, month, day, year, updated_at) VALUES (1, ?, ?, ?, ?)", [profile.month, profile.day, nz(profile.year), profile.updatedAt]);
  }
  private personValues(p: Person): SqlValue[] { return [p.id, p.name, nz(p.month), nz(p.day), nz(p.year), nz(p.phone), nz(p.notes), p.createdAt, p.updatedAt]; }
  async upsertPerson(p: Person): Promise<void> {
    await this.db.run("INSERT OR REPLACE INTO people (id, name, bmonth, bday, byear, phone, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", this.personValues(p));
  }
  async deletePerson(id: string): Promise<void> { await this.db.run("DELETE FROM people WHERE id = ?", [id]); }
  private eventValues(e: EventRecord): SqlValue[] { return [e.id, e.title, e.date.year, e.date.month, e.date.day, nz(e.time), nz(e.description), nz(e.category), e.repeat, e.reminder, e.createdAt, e.updatedAt]; }
  async upsertEvent(e: EventRecord): Promise<void> {
    await this.db.run("INSERT OR REPLACE INTO events (id, title, e_year, e_month, e_day, time, description, category, repeat, reminder, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", this.eventValues(e));
  }
  async deleteEvent(id: string): Promise<void> { await this.db.run("DELETE FROM events WHERE id = ?", [id]); }
  async savePrefs(prefs: Preferences): Promise<void> {
    await this.db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["prefs", JSON.stringify(prefs)]);
  }

  async replaceAll(data: AppData): Promise<void> {
    const set: Array<{ statement: string; values?: SqlValue[] }> = [
      { statement: "DELETE FROM profile" }, { statement: "DELETE FROM people" }, { statement: "DELETE FROM events" },
    ];
    if (data.profile) set.push({ statement: "INSERT INTO profile (id, month, day, year, updated_at) VALUES (1, ?, ?, ?, ?)", values: [data.profile.month, data.profile.day, nz(data.profile.year), data.profile.updatedAt] });
    for (const p of data.people) set.push({ statement: "INSERT INTO people (id, name, bmonth, bday, byear, phone, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", values: this.personValues(p) });
    for (const e of data.events) set.push({ statement: "INSERT INTO events (id, title, e_year, e_month, e_day, time, description, category, repeat, reminder, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", values: this.eventValues(e) });
    set.push({ statement: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", values: ["prefs", JSON.stringify(data.prefs)] });
    await this.db.executeSet(set, true); // one transaction: all or nothing
  }

  async clearAll(): Promise<void> {
    await this.db.executeSet([{ statement: "DELETE FROM profile" }, { statement: "DELETE FROM people" }, { statement: "DELETE FROM events" }, { statement: "DELETE FROM settings" }], true);
  }
}
