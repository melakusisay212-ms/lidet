import { useNav } from "../app/nav.tsx";
import { useApp } from "../app/store.tsx";
import type { CalendarEntry } from "../domain/entries.ts";
import { categoryOf } from "../domain/entries.ts";
import type { CategoryFilter } from "../domain/entries.ts";
import type { EthiopianDate } from "../domain/calendar/index.ts";
import { formatTime } from "../i18n/format.ts";
import type { MessageKey } from "../i18n/index.ts";

export function categoryClass(c: CategoryFilter): string {
  return `ind ind-${c === "birthdays" ? "birthday" : c === "events" ? "event" : c}`;
}
export function indicatorClass(entry: CalendarEntry): string {
  return categoryClass(categoryOf(entry));
}

/** One calendar entry: shape indicator + text category label, so meaning never relies on colour alone. */
export function EntryRow({ entry, date, subtitleDate }: { entry: CalendarEntry; date: EthiopianDate; subtitleDate?: string }) {
  const { t, data } = useApp();
  const nav = useNav();
  const lang = data.prefs.language;

  let title = "";
  let kind = "";
  let sub = subtitleDate ?? "";
  let open: () => void = () => {};
  if (entry.kind === "own_birthday") {
    title = t("entry.yourBirthday"); kind = t("entry.birthday");
    open = () => nav.push({ name: "age" });
  } else if (entry.kind === "birthday") {
    title = entry.person.name; kind = t("entry.birthday");
    if (entry.age !== null) sub = [t("friend.age") + ": " + entry.age, sub].filter(Boolean).join(" · ");
    open = () => nav.push({ name: "friend", id: entry.person.id });
  } else if (entry.kind === "event") {
    title = entry.event.title; kind = t("entry.event");
    if (entry.event.time) sub = [formatTime(entry.event.time, data.prefs.timeFormat), sub].filter(Boolean).join(" · ");
    open = () => nav.push({ name: "event", id: entry.event.id });
  } else {
    const r = entry.instance.record;
    title = r.names[lang];
    kind = t(`holiday.category.${r.category}` as MessageKey);
    if (r.verification !== "verified") sub = [t(`holiday.status.${r.verification}` as MessageKey), sub].filter(Boolean).join(" · ");
    open = () => nav.push({ name: "holiday", id: r.id, date });
  }

  return (
    <button type="button" className="entry" onClick={open}>
      <span className={indicatorClass(entry)} aria-hidden="true" />
      <span className="grow">
        <span className="t-xs muted" style={{ display: "block" }}>{kind}</span>
        <span style={{ fontWeight: 700, display: "block" }}>{title}</span>
        {sub && <span className="t-sm muted" style={{ display: "block" }}>{sub}</span>}
      </span>
    </button>
  );
}
