import type { EthiopianDate } from "./calendar/types.ts";

export type Language = "en" | "am";
export type ThemeFamily = "signature" | "midnight_velvet" | "highland_sage" | "rose_celebration" | "blue_hour";
export type Appearance = "system" | "light" | "dark";
export type EventRepeat = "none" | "yearly";
export type EventReminder = "none" | "on_day" | "day_before";
export type EventCategory = "graduation" | "anniversary" | "exam" | "travel" | "work" | "gathering" | "other";
export const EVENT_CATEGORIES: readonly EventCategory[] = ["graduation", "anniversary", "exam", "travel", "work", "gathering", "other"];

/** The user own recurring birthday. Birth year is optional; month/day is the recurring rule. */
export type Profile = { month: number; day: number; year: number | null; updatedAt: number };

export type Person = {
  id: string;
  name: string;
  month: number | null; // null = birthday not set (friend is excluded from countdowns)
  day: number | null;
  year: number | null;
  phone: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
};

export type EventRecord = {
  id: string;
  title: string;
  date: EthiopianDate; // stored as Ethiopian date-only; never as a formatted string or JS Date
  time: string | null; // "HH:MM" local, null = all-day
  description: string | null;
  category: EventCategory | null;
  repeat: EventRepeat;
  reminder: EventReminder;
  createdAt: number;
  updatedAt: number;
};

export type ReminderPrefs = {
  enabled: boolean;
  time: string; // "HH:MM" device-local
  birthdayDayBefore: boolean;
  birthdayOnDay: boolean;
  eventDefault: EventReminder;
};

export type Preferences = {
  language: Language;
  themeFamily: ThemeFamily;
  appearance: Appearance;
  showGregorian: boolean; // show Gregorian equivalents next to Ethiopian dates
  gregorianPrimary: boolean; // calendar grid: Gregorian day as primary label
  timeFormat: "24h" | "12h";
  reminders: ReminderPrefs;
  onboardingDone: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
  language: "en",
  themeFamily: "signature",
  appearance: "system",
  showGregorian: true,
  gregorianPrimary: false,
  timeFormat: "24h",
  reminders: { enabled: false, time: "09:00", birthdayDayBefore: true, birthdayOnDay: true, eventDefault: "on_day" },
  onboardingDone: false,
};

export type AppData = { profile: Profile | null; people: Person[]; events: EventRecord[]; prefs: Preferences };
export const EMPTY_DATA: AppData = { profile: null, people: [], events: [], prefs: DEFAULT_PREFERENCES };
