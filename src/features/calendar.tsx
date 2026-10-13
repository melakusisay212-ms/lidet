import { useEffect, useMemo, useState } from "react";
import { Button, Chip, EmptyState, IconButton, Screen, SelectField, TextField } from "../design-system/components.tsx";
import { Icon } from "../design-system/icons.tsx";
import { useApp } from "../app/store.tsx";
import { useNav } from "../app/nav.tsx";
import { engine, sameDate } from "../domain/calendar/index.ts";
import type { EthiopianDate } from "../domain/calendar/index.ts";
import { ALL_FILTERS, categoryOf, entriesOn, filterEntries } from "../domain/entries.ts";
import type { CalendarEntry, CategoryFilter } from "../domain/entries.ts";
import { DATASET_COVERAGE } from "../domain/holidays/dataset.ts";
import { ET_MONTHS, WEEKDAYS, WEEKDAYS_SHORT } from "../i18n/names.ts";
import { formatGregorian } from "../i18n/format.ts";
import type { MessageKey } from "../i18n/index.ts";
import { dualLabel, ethiopianLabel } from "./fmt-helpers.ts";
import { EntryRow, categoryClass } from "./entry-row.tsx";

const DEFAULT_FILTERS: CategoryFilter[] = ["birthdays", "public", "orthodox_feast", "events"];
const MIN_Y = engine.supportedYears.min;
const MAX_Y = engine.supportedYears.max;

export function CalendarScreen({ hidden }: { hidden: boolean }) {
  const { t, data, today, setPrefs } = useApp();
  const nav = useNav();
  const lang = data.prefs.language;
  const [view, setView] = useState({ year: today.year, month: today.month });
  const [selected, setSelected] = useState<EthiopianDate>(today);
  const [filters, setFilters] = useState<Set<CategoryFilter>>(new Set(DEFAULT_FILTERS));
  const [mode, setMode] = useState<"grid" | "list">("grid");
  const [picking, setPicking] = useState(false);
  const [pickMonth, setPickMonth] = useState<number | "">(today.month);
  const [pickYear, setPickYear] = useState(String(today.year));

  useEffect(() => {
    const f = nav.calendarFocus;
    if (f) { setView({ year: f.year, month: f.month }); setSelected(f); }
  }, [nav.calendarFocus]);

  const daysInView = engine.daysInMonth(view.year, view.month);
  const filterKey = [...filters].sort().join(",");
  const monthEntries = useMemo(() => {
    const out: Array<{ date: EthiopianDate; entries: CalendarEntry[] }> = [];
    for (let d = 1; d <= daysInView; d++) {
      const date = { year: view.year, month: view.month, day: d };
      out.push({ date, entries: filterEntries(entriesOn(data, date), filters) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, view.year, view.month, daysInView, filterKey]);

  const firstWeekday = engine.weekday({ year: view.year, month: view.month, day: 1 });
  const selectedEntries = useMemo(() => filterEntries(entriesOn(data, selected), filters), [data, selected, filters]);
  const atMin = view.year === MIN_Y && view.month === 1;
  const atMax = view.year === MAX_Y && view.month === 13;

  const shift = (delta: number) => {
    const total = view.year * 13 + (view.month - 1) + delta;
    const year = Math.floor(total / 13);
    const month = (((total % 13) + 13) % 13) + 1;
    if (year < MIN_Y || year > MAX_Y) return;
    setView({ year, month });
  };
  const goToday = () => { setView({ year: today.year, month: today.month }); setSelected(today); };
  const toggle = (f: CategoryFilter) => setFilters((prev) => { const n = new Set(prev); if (n.has(f)) n.delete(f); else n.add(f); return n; });
  const applyPick = () => {
    const y = Number(pickYear);
    if (pickMonth === "" || !Number.isInteger(y) || y < MIN_Y || y > MAX_Y) return;
    setView({ year: y, month: pickMonth }); setPicking(false);
  };

  const g1 = engine.toGregorian({ year: view.year, month: view.month, day: 1 });
  const g2 = engine.toGregorian({ year: view.year, month: view.month, day: daysInView });
  const gregPrimary = data.prefs.gregorianPrimary;
  const showG = data.prefs.showGregorian;

  const legendFor = (f: CategoryFilter) => <span key={f}><span className={categoryClass(f)} aria-hidden="true" />{t(`filter.${f}` as MessageKey)}</span>;

  return (
    <Screen hidden={hidden} withNav title={t("cal.title")} backLabel={t("common.back")}
      actions={<>
        <IconButton icon={mode === "grid" ? "list" : "grid"} label={mode === "grid" ? t("cal.list") : t("cal.grid")} onClick={() => setMode(mode === "grid" ? "list" : "grid")} />
        <IconButton icon="plus" label={t("cal.addEvent")} onClick={() => nav.push({ name: "eventForm", date: selected })} />
      </>}>
      <div className="month-head">
        <IconButton icon="left" label={t("a11y.previousMonth")} onClick={() => !atMin && shift(-1)} />
        <button type="button" className="month-title" aria-expanded={picking} onClick={() => { setPickMonth(view.month); setPickYear(String(view.year)); setPicking(!picking); }}>
          {ET_MONTHS[lang][view.month - 1]} {view.year}
          {showG && <span className="t-xs muted" style={{ display: "block", fontWeight: 600 }}>{t("cal.gregorianRange", { range: `${formatGregorian(g1, lang)} – ${formatGregorian(g2, lang)}` })}</span>}
        </button>
        <IconButton icon="right" label={t("a11y.nextMonth")} onClick={() => !atMax && shift(1)} />
      </div>

      {picking && (
        <div className="card stack-3">
          <div className="grid-2">
            <SelectField label={t("common.month")} value={pickMonth} options={ET_MONTHS[lang].map((label, i) => ({ value: i + 1, label }))} onChange={(v) => setPickMonth(v === "" ? "" : Number(v))} />
            <TextField label={t("common.year")} type="tel" maxLength={4} value={pickYear} onChange={(v) => setPickYear(v.replace(/\D/g, ""))} />
          </div>
          <div className="row"><Button onClick={applyPick}>{t("common.ok")}</Button><Button variant="quiet" onClick={() => setPicking(false)}>{t("common.cancel")}</Button></div>
        </div>
      )}

      <div className="row wrap">
        <Button variant="secondary" onClick={goToday}>{t("cal.jumpToday")}</Button>
        <Button variant="quiet" onClick={() => void setPrefs({ gregorianPrimary: !gregPrimary })}>{gregPrimary ? t("cal.showEthiopianPrimary") : t("cal.showGregorianPrimary")}</Button>
      </div>

      <div className="chips" role="group" aria-label={t("cal.filters")}>
        {ALL_FILTERS.map((f) => <Chip key={f} label={t(`filter.${f}` as MessageKey)} pressed={filters.has(f)} onClick={() => toggle(f)} icon={<span className={categoryClass(f)} aria-hidden="true" />} />)}
      </div>

      {mode === "grid" ? (
        <>
          <div className="cal" role="grid" aria-label={`${ET_MONTHS[lang][view.month - 1]} ${view.year}`}>
            {WEEKDAYS_SHORT[lang].map((w, i) => <div key={i} className="wd" role="columnheader" aria-label={WEEKDAYS[lang][i]}>{w}</div>)}
            {Array.from({ length: firstWeekday }, (_, i) => <div key={`b${i}`} className="cell blank" aria-hidden="true" />)}
            {monthEntries.map(({ date, entries }) => {
              const g = engine.toGregorian(date);
              const isToday = sameDate(date, today);
              const isSel = sameDate(date, selected);
              const cats = [...new Set(entries.map(categoryOf))].slice(0, 4);
              const primary = gregPrimary ? g.day : date.day;
              const secondary = gregPrimary ? date.day : g.day;
              return (
                <button key={date.day} type="button" className={`cell${isToday ? " today" : ""}`} aria-pressed={isSel} aria-current={isToday ? "date" : undefined}
                  aria-label={`${ethiopianLabel(date, lang)}${entries.length ? ", " + t("cal.entriesCount", { n: entries.length }) : ""}${isToday ? ", " + t("a11y.today") : ""}`}
                  onClick={() => setSelected(date)}>
                  <span className="d num">{primary}</span>
                  {showG && <span className="sub num">{secondary}</span>}
                  <span className="inds" aria-hidden="true">{cats.map((c) => <span key={c} className={categoryClass(c)} />)}</span>
                </button>
              );
            })}
          </div>

          <section className="stack-3" aria-label={t("cal.selectedDay")} aria-live="polite">
            <div className="row between"><h2 className="h-md">{WEEKDAYS[lang][engine.weekday(selected)]}, {dualLabel(selected, lang, showG)}</h2></div>
            {selectedEntries.length === 0 ? (
              <EmptyState icon="calendar" title={t("cal.noEntries")} action={<Button variant="secondary" icon="plus" onClick={() => nav.push({ name: "eventForm", date: selected })}>{t("cal.addEvent")}</Button>} />
            ) : (
              <div className="stack-2">{selectedEntries.map((en, i) => <EntryRow key={i} entry={en} date={selected} />)}</div>
            )}
          </section>
        </>
      ) : (
        <section className="stack-3" aria-label={t("cal.list")}>
          {monthEntries.every((m) => m.entries.length === 0) ? (
            <EmptyState icon="calendar" title={t("cal.noEntries")} />
          ) : monthEntries.filter((m) => m.entries.length > 0).map(({ date, entries }) => (
            <div key={date.day} className="stack-2">
              <div className="row between"><span style={{ fontWeight: 700 }}>{WEEKDAYS[lang][engine.weekday(date)]}, {dualLabel(date, lang, showG)}</span>{sameDate(date, today) && <Icon name="sparkle" size={18} />}</div>
              {entries.map((en, i) => <EntryRow key={i} entry={en} date={date} />)}
            </div>
          ))}
        </section>
      )}

      <div className="legend" aria-label={t("cal.filters")}>{ALL_FILTERS.filter((f) => filters.has(f)).map(legendFor)}</div>
      {filters.has("saint") && <p className="help">{t("cal.saintsCoverage")} {DATASET_COVERAGE[lang]}</p>}
    </Screen>
  );
}
