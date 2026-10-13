import { EMPTY_DATA } from "../domain/models.ts";
import type { AppData, EventRecord, Person, Preferences, Profile } from "../domain/models.ts";
import type { Repository, StorageKind } from "./repository.ts";
import { validateAppData } from "./validate.ts";

export const BROWSER_KEY = "lidet.data.v1";
export const CORRUPT_KEY = "lidet.data.corrupt";

type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * localStorage-backed repository (web preview, tests, and automatic fallback if SQLite fails).
 * Corrupt data is quarantined under CORRUPT_KEY and never silently destroyed.
 */
export class BrowserRepository implements Repository {
  readonly warnings: string[] = [];
  readonly kind: StorageKind;
  private readonly kv: KV;
  private data: AppData = EMPTY_DATA;

  constructor(kv: KV, kind: StorageKind = "browser") {
    this.kv = kv;
    this.kind = kind;
  }

  async load(): Promise<AppData> {
    const raw = this.kv.getItem(BROWSER_KEY);
    if (raw === null) { this.data = EMPTY_DATA; return this.data; }
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { parsed = undefined; }
    const valid = parsed === undefined ? null : validateAppData(parsed);
    if (!valid) {
      this.kv.setItem(CORRUPT_KEY, raw); // keep a copy for recovery before anything can overwrite it
      this.warnings.push("corrupt_data_quarantined");
      this.data = EMPTY_DATA;
      return this.data;
    }
    this.data = valid;
    return this.data;
  }

  private persist(next: AppData): void {
    this.kv.setItem(BROWSER_KEY, JSON.stringify(next)); // throws on quota errors -> caller surfaces it, memory unchanged
    this.data = next;
  }

  async saveProfile(profile: Profile | null) { this.persist({ ...this.data, profile }); }
  async upsertPerson(p: Person) {
    const rest = this.data.people.filter((x) => x.id !== p.id);
    this.persist({ ...this.data, people: [...rest, p] });
  }
  async deletePerson(id: string) { this.persist({ ...this.data, people: this.data.people.filter((x) => x.id !== id) }); }
  async upsertEvent(e: EventRecord) {
    const rest = this.data.events.filter((x) => x.id !== e.id);
    this.persist({ ...this.data, events: [...rest, e] });
  }
  async deleteEvent(id: string) { this.persist({ ...this.data, events: this.data.events.filter((x) => x.id !== id) }); }
  async savePrefs(prefs: Preferences) { this.persist({ ...this.data, prefs }); }
  async replaceAll(data: AppData) { this.persist(data); }
  async clearAll() { this.kv.removeItem(BROWSER_KEY); this.data = EMPTY_DATA; }
}
