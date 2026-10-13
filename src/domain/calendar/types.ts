export type EthiopianDate = { year: number; month: number; day: number };
export type GregorianDate = { year: number; month: number; day: number };
export type Validation = { ok: true } | { ok: false; reason: "non_integer" | "month" | "day" | "range" };

/**
 * Adapter boundary (spec 5.2 / 6.3). UI and domain code depend on this interface only,
 * so the reference engine can later be swapped for an audited third-party engine (e.g. Kenat).
 */
export interface CalendarEngine {
  readonly supportedYears: { readonly min: number; readonly max: number };
  validate(d: EthiopianDate): Validation;
  daysInMonth(year: number, month: number): number;
  isLeapYear(year: number): boolean;
  toGregorian(d: EthiopianDate): GregorianDate;
  toEthiopian(g: GregorianDate): EthiopianDate;
  /** Stable absolute day number (Julian Day Number). Differences are exact day counts. */
  toAbsoluteDay(d: EthiopianDate): number;
  fromAbsoluteDay(n: number): EthiopianDate;
  addDays(d: EthiopianDate, amount: number): EthiopianDate;
  compare(a: EthiopianDate, b: EthiopianDate): number;
  /** 0 = Sunday ... 6 = Saturday */
  weekday(d: EthiopianDate): number;
}
