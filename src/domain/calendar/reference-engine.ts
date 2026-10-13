import type { CalendarEngine, EthiopianDate, GregorianDate, Validation } from "./types.ts";

/**
 * Reference Ethiopian (Amete Mihret) calendar engine: pure integer arithmetic on Julian Day Numbers.
 * Verified in tests against independent fixtures, JS Date (Gregorian side) and an exhaustive round trip.
 * Supported range (PROPOSED in the spec, not yet approved): Ethiopian years 1900..2200.
 */
const EPOCH = 1723856;
const MIN_YEAR = 1900;
const MAX_YEAR = 2200;

const mod = (a: number, n: number) => ((a % n) + n) % n;

function isLeapYear(year: number): boolean {
  return mod(year, 4) === 3;
}

function daysInMonth(year: number, month: number): number {
  if (!Number.isInteger(year) || !Number.isInteger(month)) throw new RangeError("non-integer year/month");
  if (month < 1 || month > 13) throw new RangeError(`month ${month} out of range 1..13`);
  if (month <= 12) return 30;
  return isLeapYear(year) ? 6 : 5;
}

function validate(d: EthiopianDate): Validation {
  if (![d.year, d.month, d.day].every(Number.isInteger)) return { ok: false, reason: "non_integer" };
  if (d.year < MIN_YEAR || d.year > MAX_YEAR) return { ok: false, reason: "range" };
  if (d.month < 1 || d.month > 13) return { ok: false, reason: "month" };
  if (d.day < 1 || d.day > daysInMonth(d.year, d.month)) return { ok: false, reason: "day" };
  return { ok: true };
}

function assertValid(d: EthiopianDate): void {
  const v = validate(d);
  if (!v.ok) throw new RangeError(`invalid Ethiopian date ${d.year}-${d.month}-${d.day} (${v.reason})`);
}

function toAbsoluteDay(d: EthiopianDate): number {
  assertValid(d);
  return EPOCH + 365 * d.year + Math.floor(d.year / 4) + 30 * d.month + d.day - 31;
}

function fromAbsoluteDay(jdn: number): EthiopianDate {
  const delta = jdn - EPOCH;
  const r = mod(delta, 1461);
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor(delta / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const result = { year, month: Math.floor(n / 30) + 1, day: (n % 30) + 1 };
  assertValid(result); // refuses silently-corrupt output outside the supported range
  return result;
}

export function gregorianToAbsoluteDay(g: GregorianDate): number {
  const a = Math.floor((14 - g.month) / 12);
  const y = g.year + 4800 - a;
  const m = g.month + 12 * a - 3;
  return g.day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

export function absoluteDayToGregorian(jdn: number): GregorianDate {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  };
}

export const referenceEngine: CalendarEngine = {
  supportedYears: { min: MIN_YEAR, max: MAX_YEAR },
  validate,
  daysInMonth,
  isLeapYear,
  toGregorian: (d) => absoluteDayToGregorian(toAbsoluteDay(d)),
  toEthiopian: (g) => fromAbsoluteDay(gregorianToAbsoluteDay(g)),
  toAbsoluteDay,
  fromAbsoluteDay,
  addDays: (d, amount) => fromAbsoluteDay(toAbsoluteDay(d) + amount),
  compare: (a, b) => toAbsoluteDay(a) - toAbsoluteDay(b),
  weekday: (d) => mod(toAbsoluteDay(d) + 1, 7),
};
