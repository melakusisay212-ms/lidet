import type { CalendarEngine, EthiopianDate } from "../calendar/index.ts";
import { engine } from "../calendar/index.ts";
import { gregorianToAbsoluteDay } from "../calendar/index.ts";
import { HOLIDAYS } from "./dataset.ts";
import type { HolidayCategory, HolidayRecord } from "./dataset.ts";

export type HolidayInstance = { record: HolidayRecord; start: EthiopianDate; end: EthiopianDate };

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Julian-calendar date -> absolute day number (JDN). */
export function julianToAbsoluteDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
}

/** Orthodox/Alexandrian Easter (Meeus Julian algorithm). `year` is the Julian year number. Returns the JDN. */
export function orthodoxEasterAbsoluteDay(year: number): number {
  const a = mod(year, 4);
  const b = mod(year, 7);
  const c = mod(year, 19);
  const d = mod(19 * c + 15, 30);
  const e = mod(2 * a + 4 * b - d + 34, 7);
  const month = Math.floor((d + e + 114) / 31);
  const day = mod(d + e + 114, 31) + 1;
  return julianToAbsoluteDay(year, month, day);
}

const cache = new Map<string, Map<number, HolidayInstance[]>>();

function safeFromAbs(n: number, e: CalendarEngine): EthiopianDate | null {
  try { return e.fromAbsoluteDay(n); } catch { return null; }
}

/** Instances of non-recurring-by-rule records (fixed, Julian, Easter-relative) within an Ethiopian year. */
export function instancesForYear(year: number, e: CalendarEngine = engine): HolidayInstance[] {
  const out: HolidayInstance[] = [];
  for (const record of HOLIDAYS) {
    const r = record.rule;
    const push = (start: EthiopianDate | null, length = 1) => {
      if (!start || start.year !== year) return;
      const end = safeFromAbs(e.toAbsoluteDay(start) + length - 1, e);
      if (end) out.push({ record, start, end });
    };
    switch (r.kind) {
      case "ethiopianFixed":
        if (e.validate({ year, month: r.month, day: r.day }).ok) push({ year, month: r.month, day: r.day });
        break;
      case "gregorianFixed":
        for (const gy of [year + 7, year + 8]) push(safeFromAbs(gregorianToAbsoluteDay({ year: gy, month: r.month, day: r.day }), e));
        break;
      case "julianFixed":
        for (const jy of [year + 7, year + 8]) push(safeFromAbs(julianToAbsoluteDay(jy, r.month, r.day), e));
        break;
      case "easterOffset":
        // Ethiopian year Y runs Sept(Y+7)..Sept(Y+8), so its Easter falls in spring of Y+8.
        push(safeFromAbs(orthodoxEasterAbsoluteDay(year + 8) + r.offset, e), r.length);
        break;
      default:
        break; // monthly/weekly rules are evaluated per day below
    }
  }
  return out;
}

function indexForYear(year: number, e: CalendarEngine): Map<number, HolidayInstance[]> {
  const key = `${year}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const map = new Map<number, HolidayInstance[]>();
  for (const inst of instancesForYear(year, e)) {
    const s = e.toAbsoluteDay(inst.start);
    const t = e.toAbsoluteDay(inst.end);
    for (let n = s; n <= t; n++) {
      const list = map.get(n) ?? [];
      list.push(inst);
      map.set(n, list);
    }
  }
  cache.set(key, map);
  return map;
}

const ORDER: Record<HolidayCategory, number> = { public: 0, orthodox_feast: 1, fasting: 2, saint: 3, islamic: 4 };

/** Every system observance on an Ethiopian date, ordered by category importance. Multiple per date are normal. */
export function observancesOn(date: EthiopianDate, e: CalendarEngine = engine): HolidayInstance[] {
  const abs = e.toAbsoluteDay(date);
  const list: HolidayInstance[] = [...(indexForYear(date.year, e).get(abs) ?? [])];
  const wd = e.weekday(date);
  for (const record of HOLIDAYS) {
    if (record.rule.kind === "ethiopianMonthly" && record.rule.day === date.day) list.push({ record, start: date, end: date });
    if (record.rule.kind === "weekly" && record.rule.weekday === wd) list.push({ record, start: date, end: date });
  }
  return list.sort((a, b) => ORDER[a.record.category] - ORDER[b.record.category]);
}
