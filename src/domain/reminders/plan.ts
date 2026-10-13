import type { CalendarEngine, EthiopianDate } from "../calendar/index.ts";
import { engine } from "../calendar/index.ts";
import { upcomingOccurrences } from "../birthdays/birthday.ts";
import { eventOccursOn, nextEventOccurrence } from "../events/events.ts";
import type { AppData, EventRecord } from "../models.ts";
import type { MessageKey } from "../../i18n/en.ts";

export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

export type PlannedReminder = {
  id: number; // stable positive 31-bit id (Android notification id)
  key: string; // human-readable identity: kind:recordId:type:occurrence
  fireAt: { year: number; month: number; day: number; hour: number; minute: number }; // Gregorian, device-local
  title: string;
  body: string;
};

/** How many future occurrences of a recurring item to schedule (so reminders survive if the app is not opened for a while). */
export const OCCURRENCES_AHEAD = 2;

function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function parseTime(hhmm: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  const hour = m ? Number(m[1]) : 9;
  const minute = m ? Number(m[2]) : 0;
  return hour > 23 || minute > 59 ? { hour: 9, minute: 0 } : { hour, minute };
}

type Draft = Omit<PlannedReminder, "id">;

/**
 * Pure: derive the complete set of notifications that SHOULD exist from current records and settings.
 * The platform layer diffs this against what is scheduled (cancel stale, add missing), so edits, deletes,
 * permission changes and repeated app opens never produce duplicates or leave orphans.
 */
export function planReminders(
  data: AppData,
  today: EthiopianDate,
  now: Date,
  t: Translate,
  formatTime: (hhmm: string) => string,
  e: CalendarEngine = engine,
): PlannedReminder[] {
  const prefs = data.prefs.reminders;
  if (!prefs.enabled) return [];
  const pref = parseTime(prefs.time);
  const drafts: Draft[] = [];

  const at = (date: EthiopianDate, hour: number, minute: number) => {
    const g = e.toGregorian(date);
    return { year: g.year, month: g.month, day: g.day, hour, minute };
  };
  const isFuture = (f: Draft["fireAt"]) => new Date(f.year, f.month - 1, f.day, f.hour, f.minute).getTime() > now.getTime();
  const push = (d: Draft) => { if (isFuture(d.fireAt)) drafts.push(d); };
  const dayBefore = (date: EthiopianDate) => { try { return e.addDays(date, -1); } catch { return null; } };
  const occ = (d: EthiopianDate) => `${d.year}-${d.month}-${d.day}`;

  const birthday = (kind: string, id: string, month: number, day: number, own: boolean, name: string) => {
    for (const o of upcomingOccurrences({ month, day }, today, OCCURRENCES_AHEAD, e)) {
      if (prefs.birthdayOnDay) {
        push({ key: `${kind}:${id}:day:${occ(o.date)}`, fireAt: at(o.date, pref.hour, pref.minute),
          title: t(own ? "notif.ownToday.title" : "notif.friendToday.title"), body: own ? t("notif.ownToday.body") : t("notif.friendToday.body", { name }) });
      }
      if (prefs.birthdayDayBefore) {
        const eve = dayBefore(o.date);
        if (eve) push({ key: `${kind}:${id}:eve:${occ(o.date)}`, fireAt: at(eve, pref.hour, pref.minute),
          title: t(own ? "notif.ownTomorrow.title" : "notif.friendTomorrow.title"), body: own ? t("notif.ownTomorrow.body") : t("notif.friendTomorrow.body", { name }) });
      }
    }
  };

  if (data.profile) birthday("own", "me", data.profile.month, data.profile.day, true, t("notif.you"));
  for (const p of data.people) if (p.month !== null && p.day !== null) birthday("friend", p.id, p.month, p.day, false, p.name);

  const eventDates = (ev: EventRecord): EthiopianDate[] => {
    if (ev.repeat === "none") return [ev.date];
    const out: EthiopianDate[] = [];
    let probe = today;
    for (let i = 0; i < OCCURRENCES_AHEAD; i++) {
      const n = nextEventOccurrence(ev, probe, e);
      if (!n) break;
      out.push(n.date);
      probe = e.addDays(n.date, 1);
    }
    return out;
  };
  for (const ev of data.events) {
    if (ev.reminder === "none") continue;
    for (const date of eventDates(ev)) {
      if (!eventOccursOn(ev, date, e)) continue;
      if (ev.reminder === "on_day") {
        const time = ev.time ? parseTime(ev.time) : pref;
        push({ key: `event:${ev.id}:day:${occ(date)}`, fireAt: at(date, time.hour, time.minute), title: ev.title,
          body: ev.time ? t("notif.eventTodayAt.body", { time: formatTime(ev.time) }) : t("notif.eventToday.body") });
      } else {
        const eve = dayBefore(date);
        if (eve) push({ key: `event:${ev.id}:eve:${occ(date)}`, fireAt: at(eve, pref.hour, pref.minute), title: ev.title, body: t("notif.eventTomorrow.body") });
      }
    }
  }

  // Stable ids. The id hashes the whole content, so any change (time, language, text) yields a new id and the
  // platform layer replaces the old notification. Collisions are resolved deterministically.
  drafts.sort((a, b) => a.key.localeCompare(b.key));
  const used = new Set<number>();
  return drafts.map((d) => {
    const f = d.fireAt;
    let id = (fnv1a(`${d.key}|${f.year}-${f.month}-${f.day} ${f.hour}:${f.minute}|${d.title}|${d.body}`) & 0x7fffffff) || 1;
    while (used.has(id)) id = ((id + 1) & 0x7fffffff) || 1;
    used.add(id);
    return { ...d, id };
  });
}

/** Which currently-scheduled ids to cancel and which planned reminders to schedule. */
export function diffSchedules(pendingIds: readonly number[], planned: readonly PlannedReminder[]) {
  const wanted = new Set(planned.map((p) => p.id));
  const have = new Set(pendingIds);
  return { cancel: pendingIds.filter((id) => !wanted.has(id)), schedule: planned.filter((p) => !have.has(p.id)) };
}

/** Android limits how many alarms an app may hold; keep the soonest ones. Re-planned on every app open. */
export const MAX_SCHEDULED = 400;
export function capReminders(planned: readonly PlannedReminder[], max: number = MAX_SCHEDULED): PlannedReminder[] {
  const when = (p: PlannedReminder) => new Date(p.fireAt.year, p.fireAt.month - 1, p.fireAt.day, p.fireAt.hour, p.fireAt.minute).getTime();
  return [...planned].sort((a, b) => when(a) - when(b) || a.id - b.id).slice(0, max);
}
