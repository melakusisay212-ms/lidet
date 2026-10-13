import type { AppData, EventRecord, Person, Preferences, Profile } from "../domain/models.ts";

export type StorageKind = "sqlite" | "browser" | "browser-fallback";

/** Persistence boundary. UI and domain never touch a database directly. */
export interface Repository {
  readonly kind: StorageKind;
  /** Non-fatal problems found while loading (e.g. quarantined corrupt data). */
  readonly warnings: string[];
  load(): Promise<AppData>;
  saveProfile(profile: Profile | null): Promise<void>;
  upsertPerson(person: Person): Promise<void>;
  deletePerson(id: string): Promise<void>;
  upsertEvent(event: EventRecord): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  savePrefs(prefs: Preferences): Promise<void>;
  /** Replace everything atomically (used by import). */
  replaceAll(data: AppData): Promise<void>;
  /** Delete all personal data and preferences. */
  clearAll(): Promise<void>;
}
