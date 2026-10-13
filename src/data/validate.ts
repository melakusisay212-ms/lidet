import type { CalendarEngine } from "../domain/calendar/index.ts";
import { engine } from "../domain/calendar/index.ts";
import { isValidRule } from "../domain/birthdays/birthday.ts";
import { DEFAULT_PREFERENCES, EVENT_CATEGORIES } from "../domain/models.ts";
import type { AppData, EventCategory, EventRecord, EventReminder, EventRepeat, Person, Preferences, Profile, ReminderPrefs } from "../domain/models.ts";
import { THEME_FAMILIES } from "../design-system/tokens.ts";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const str = (v: unknown, max = 2000): string | null => (typeof v === "string" && v.length <= max ? v : null);
const optStr = (v: unknown, max = 2000): string | null | undefined => (v === null || v === undefined ? null : str(v, max) ?? undefined);
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const MAX_RECORDS = 5000;

export function validBirthYear(year: number, e: CalendarEngine = engine): boolean {
  return isInt(year) && year >= e.supportedYears.min && year <= e.supportedYears.max;
}

/** A birth date is a real calendar date only if the year can hold it (Pagume 6 needs a leap year). */
export function validBirthDate(year: number, month: number, day: number, e: CalendarEngine = engine): boolean {
  return e.validate({ year, month, day }).ok;
}

export function validateProfile(raw: unknown, e: CalendarEngine = engine): Profile | null {
  if (!isObj(raw) || !isInt(raw.month) || !isInt(raw.day) || !isValidRule({ month: raw.month, day: raw.day })) return null;
  const year = raw.year === null || raw.year === undefined ? null : raw.year;
  if (year !== null && (!isInt(year) || !validBirthDate(year, raw.month, raw.day, e))) return null;
  return { month: raw.month, day: raw.day, year, updatedAt: isInt(raw.updatedAt) ? raw.updatedAt : 0 };
}

export function validatePerson(raw: unknown, e: CalendarEngine = engine): Person | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id, 100);
  const name = str(raw.name, 200)?.trim();
  if (!id || !name) return null;
  const hasBirthday = raw.month !== null && raw.month !== undefined;
  let month: number | null = null, day: number | null = null, year: number | null = null;
  if (hasBirthday) {
    if (!isInt(raw.month) || !isInt(raw.day) || !isValidRule({ month: raw.month, day: raw.day })) return null;
    month = raw.month; day = raw.day;
    if (raw.year !== null && raw.year !== undefined) {
      if (!isInt(raw.year) || !validBirthDate(raw.year, month, day, e)) return null;
      year = raw.year;
    }
  }
  const phone = optStr(raw.phone, 60), notes = optStr(raw.notes, 4000);
  if (phone === undefined || notes === undefined) return null;
  return { id, name, month, day, year, phone, notes, createdAt: isInt(raw.createdAt) ? raw.createdAt : 0, updatedAt: isInt(raw.updatedAt) ? raw.updatedAt : 0 };
}

export function validateEvent(raw: unknown, e: CalendarEngine = engine): EventRecord | null {
  if (!isObj(raw) || !isObj(raw.date)) return null;
  const id = str(raw.id, 100);
  const title = str(raw.title, 300)?.trim();
  const d = raw.date;
  if (!id || !title || !isInt(d.year) || !isInt(d.month) || !isInt(d.day)) return null;
  const date = { year: d.year, month: d.month, day: d.day };
  if (!e.validate(date).ok) return null;
  const time = raw.time === null || raw.time === undefined ? null : typeof raw.time === "string" && TIME.test(raw.time) ? raw.time : undefined;
  if (time === undefined) return null;
  const description = optStr(raw.description, 4000);
  if (description === undefined) return null;
  const category = raw.category === null || raw.category === undefined ? null : (EVENT_CATEGORIES as readonly unknown[]).includes(raw.category) ? (raw.category as EventCategory) : undefined;
  if (category === undefined) return null;
  if (raw.repeat !== "none" && raw.repeat !== "yearly") return null;
  if (raw.reminder !== "none" && raw.reminder !== "on_day" && raw.reminder !== "day_before") return null;
  return { id, title, date, time, description, category, repeat: raw.repeat as EventRepeat, reminder: raw.reminder as EventReminder, createdAt: isInt(raw.createdAt) ? raw.createdAt : 0, updatedAt: isInt(raw.updatedAt) ? raw.updatedAt : 0 };
}

/** Forward-compatible: unknown/invalid fields fall back to defaults instead of failing the whole load. */
export function sanitizePrefs(raw: unknown): Preferences {
  const d = DEFAULT_PREFERENCES;
  if (!isObj(raw)) return d;
  const r = isObj(raw.reminders) ? raw.reminders : {};
  const bool = (v: unknown, fb: boolean) => (typeof v === "boolean" ? v : fb);
  const reminders: ReminderPrefs = {
    enabled: bool(r.enabled, d.reminders.enabled),
    time: typeof r.time === "string" && TIME.test(r.time) ? r.time : d.reminders.time,
    birthdayDayBefore: bool(r.birthdayDayBefore, d.reminders.birthdayDayBefore),
    birthdayOnDay: bool(r.birthdayOnDay, d.reminders.birthdayOnDay),
    eventDefault: r.eventDefault === "none" || r.eventDefault === "on_day" || r.eventDefault === "day_before" ? r.eventDefault : d.reminders.eventDefault,
  };
  return {
    language: raw.language === "am" ? "am" : "en",
    themeFamily: (THEME_FAMILIES as readonly unknown[]).includes(raw.themeFamily) ? (raw.themeFamily as Preferences["themeFamily"]) : d.themeFamily,
    appearance: raw.appearance === "light" || raw.appearance === "dark" || raw.appearance === "system" ? raw.appearance : d.appearance,
    showGregorian: bool(raw.showGregorian, d.showGregorian),
    gregorianPrimary: bool(raw.gregorianPrimary, d.gregorianPrimary),
    timeFormat: raw.timeFormat === "12h" ? "12h" : "24h",
    reminders,
    onboardingDone: bool(raw.onboardingDone, d.onboardingDone),
  };
}

/** Validates a whole data set. Returns null if anything is structurally wrong (callers never half-apply). */
export function validateAppData(raw: unknown, e: CalendarEngine = engine): AppData | null {
  if (!isObj(raw)) return null;
  const profile = raw.profile === null || raw.profile === undefined ? null : validateProfile(raw.profile, e);
  if (raw.profile !== null && raw.profile !== undefined && !profile) return null;
  if (!Array.isArray(raw.people) || !Array.isArray(raw.events) || raw.people.length > MAX_RECORDS || raw.events.length > MAX_RECORDS) return null;
  const people: Person[] = [];
  for (const p of raw.people) { const v = validatePerson(p, e); if (!v) return null; people.push(v); }
  const events: EventRecord[] = [];
  for (const ev of raw.events) { const v = validateEvent(ev, e); if (!v) return null; events.push(v); }
  if (new Set(people.map((p) => p.id)).size !== people.length || new Set(events.map((x) => x.id)).size !== events.length) return null;
  return { profile, people, events, prefs: sanitizePrefs(raw.prefs) };
}
