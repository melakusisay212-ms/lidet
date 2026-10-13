import { useMemo, useState } from "react";
import { Badge, Button, Chip, EmptyState, IconButton, KV, Screen, Segmented, SelectField, Switch, TextArea, TextField } from "../design-system/components.tsx";
import { Icon } from "../design-system/icons.tsx";
import { useApp } from "../app/store.tsx";
import { useNav, useUnsavedGuard } from "../app/nav.tsx";
import { useDialogs } from "../app/dialogs.tsx";
import { EVENT_CATEGORIES } from "../domain/models.ts";
import type { EventCategory, EventReminder, EventRepeat } from "../domain/models.ts";
import { nextEventOccurrence } from "../domain/events/events.ts";
import { diffDays } from "../domain/calendar/index.ts";
import type { MessageKey } from "../i18n/index.ts";
import { EthiopianDateFields } from "./date-fields.tsx";
import { parseDate, validTime } from "./date-logic.ts";
import type { DateValue } from "./date-logic.ts";
import { eventRows, selectEvents } from "./events-logic.ts";
import type { EventTab } from "./events-logic.ts";
import { dualLabel, daysLabel } from "./fmt-helpers.ts";

const REMINDERS: readonly EventReminder[] = ["none", "on_day", "day_before"];

export function EventsScreen({ hidden }: { hidden: boolean }) {
  const { t, data, today, fmtTime } = useApp();
  const nav = useNav();
  const lang = data.prefs.language;
  const [tab, setTab] = useState<EventTab>("upcoming");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<EventCategory | "all">("all");
  const rows = useMemo(() => eventRows(data.events, today), [data.events, today]);
  const shown = useMemo(() => selectEvents(rows, tab, q, cat), [rows, tab, q, cat]);

  return (
    <Screen hidden={hidden} withNav title={t("events.title")} backLabel={t("common.back")}
      actions={<IconButton icon="plus" label={t("events.add")} onClick={() => nav.push({ name: "eventForm" })} />}>
      {data.events.length > 0 && (
        <>
          <Segmented label={t("events.title")} value={tab} onChange={setTab} options={[{ value: "upcoming", label: t("events.upcoming") }, { value: "past", label: t("events.past") }]} />
          <TextField label={t("events.search")} type="search" value={q} onChange={setQ} />
          <div className="chips" role="group" aria-label={t("event.category")}>
            <Chip label={t("events.allCategories")} pressed={cat === "all"} onClick={() => setCat("all")} />
            {EVENT_CATEGORIES.map((c) => <Chip key={c} label={t(`category.${c}` as MessageKey)} pressed={cat === c} onClick={() => setCat(c)} />)}
          </div>
        </>
      )}
      {data.events.length === 0 ? (
        <EmptyState icon="star" title={t("events.empty")} body={t("events.emptyBody")} action={<Button icon="plus" onClick={() => nav.push({ name: "eventForm" })}>{t("events.add")}</Button>} />
      ) : shown.length === 0 ? (
        <EmptyState icon="search" title={q.trim() ? t("events.noResults", { q: q.trim() }) : tab === "past" ? t("events.emptyPast") : t("events.empty")} />
      ) : (
        <div className="list" role="list">
          {shown.map(({ event, status }) => (
            <button key={event.id} type="button" role="listitem" className="list-row" onClick={() => nav.push({ name: "event", id: event.id })}>
              <span className="ind ind-event" aria-hidden="true" />
              <span className="grow">
                <span style={{ fontWeight: 700, display: "block" }}>{event.title}</span>
                <span className="t-sm muted" style={{ display: "block" }}>
                  {dualLabel(status?.date ?? event.date, lang, false)}{event.time ? ` · ${fmtTime(event.time)}` : ""}{event.repeat === "yearly" ? ` · ${t("event.repeatYearly")}` : ""}
                </span>
              </span>
              {event.reminder !== "none" && <Icon name="bell" size={18} label={t("event.reminder")} />}
              <span style={{ fontWeight: 700, textAlign: "right" }} className="num">{status ? daysLabel(t, status.daysRemaining) : daysLabel(t, diffDays(today, event.date))}</span>
            </button>
          ))}
        </div>
      )}
    </Screen>
  );
}

export function EventFormScreen({ id, presetDate }: { id?: string; presetDate?: { year: number; month: number; day: number } }) {
  const { t, data, today, saveEvent, removeEvent } = useApp();
  const nav = useNav();
  const { confirm } = useDialogs();
  const lang = data.prefs.language;
  const existing = id ? data.events.find((e) => e.id === id) : undefined;
  const base = existing?.date ?? presetDate ?? today;

  const initial = useMemo(() => ({
    title: existing?.title ?? "", date: { year: String(base.year), month: base.month, day: base.day } as DateValue,
    timed: existing?.time != null, time: existing?.time ?? "09:00", description: existing?.description ?? "",
    repeat: (existing?.repeat ?? "none") as EventRepeat, reminder: (existing?.reminder ?? data.prefs.reminders.eventDefault) as EventReminder,
    category: (existing?.category ?? "") as EventCategory | "",
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [existing]);

  const [title, setTitle] = useState(initial.title);
  const [date, setDate] = useState<DateValue>(initial.date);
  const [timed, setTimed] = useState(initial.timed);
  const [time, setTime] = useState(initial.time);
  const [description, setDescription] = useState(initial.description);
  const [repeat, setRepeat] = useState<EventRepeat>(initial.repeat);
  const [reminder, setReminder] = useState<EventReminder>(initial.reminder);
  const [category, setCategory] = useState<EventCategory | "">(initial.category);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = title !== initial.title || date.year !== initial.date.year || date.month !== initial.date.month || date.day !== initial.date.day || timed !== initial.timed || (timed && time !== initial.time) || description !== initial.description || repeat !== initial.repeat || reminder !== initial.reminder || category !== initial.category;
  useUnsavedGuard(dirty, () => confirm({ title: t("unsaved.title"), message: t("unsaved.body"), confirmLabel: t("common.discard"), cancelLabel: t("common.keepEditing"), destructive: true }));

  if (id && !existing) return <Screen title={t("event.editTitle")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}><EmptyState icon="star" title={t("event.notFound")} /></Screen>;

  const save = async () => {
    const trimmed = title.trim();
    const parsed = parseDate(date);
    setTitleError(trimmed ? null : t("event.titleRequired"));
    setDateError(parsed ? null : t("event.dateInvalid"));
    if (!trimmed || !parsed) return;
    if (timed && !validTime(time)) { setDateError(t("state.invalid")); return; }
    setSaving(true);
    try {
      const newId = await saveEvent({ title: trimmed, date: parsed, time: timed ? time : null, description: description.trim() || null, category: category || null, repeat, reminder }, id);
      if (id) nav.replaceTop(null); else nav.replaceTop({ name: "event", id: newId });
    } catch { /* toast shown by store */ } finally { setSaving(false); }
  };

  const del = async () => {
    if (!existing) return;
    const ok = await confirm({ title: t("event.deleteTitle"), message: t("event.deleteBody"), confirmLabel: t("common.delete"), cancelLabel: t("common.cancel"), destructive: true });
    if (!ok) return;
    try { await removeEvent(existing.id); nav.replaceTop(null); nav.replaceTop(null); } catch { /* toast shown */ }
  };

  return (
    <Screen title={id ? t("event.editTitle") : t("event.addTitle")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}
      footer={<>
        {id && <Button variant="quiet" icon="trash" onClick={() => void del()}>{t("common.delete")}</Button>}
        <div className="grow"><Button block loading={saving} onClick={() => void save()}>{t("common.save")}</Button></div>
      </>}>
      <TextField label={t("event.titleLabel")} value={title} maxLength={300} error={titleError} autoFocus={!id} onChange={(v) => { setTitle(v); setTitleError(null); }} />
      <div className="stack-2">
        <p className="label" style={{ fontWeight: 700 }}>{t("event.date")}</p>
        <EthiopianDateFields value={date} onChange={(v) => { setDate(v); setDateError(null); }} lang={lang} t={t} error={dateError} />
      </div>
      <Switch label={t("event.timed")} checked={timed} onChange={setTimed} />
      {timed && (
        <div className="field">
          <label htmlFor="ev-time">{t("event.time")}</label>
          <input id="ev-time" className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      )}
      <Segmented label={t("event.repeat")} value={repeat} onChange={setRepeat} options={[{ value: "none", label: t("event.repeatNone") }, { value: "yearly", label: t("event.repeatYearly") }]} />
      {repeat === "yearly" && <p className="help">{t("event.yearlyNote")}</p>}
      <SelectField label={t("event.reminder")} value={reminder} onChange={(v) => setReminder(v as EventReminder)} options={REMINDERS.map((r) => ({ value: r, label: t(`event.reminder.${r}` as MessageKey) }))} />
      <SelectField label={t("event.category")} value={category} placeholder={t("common.none")} onChange={(v) => setCategory(v as EventCategory | "")} options={EVENT_CATEGORIES.map((c) => ({ value: c, label: t(`category.${c}` as MessageKey) }))} />
      <TextArea label={t("event.description")} value={description} maxLength={4000} onChange={setDescription} />
    </Screen>
  );
}

export function EventDetailScreen({ id }: { id: string }) {
  const { t, data, today, fmtTime } = useApp();
  const nav = useNav();
  const lang = data.prefs.language;
  const ev = data.events.find((e) => e.id === id);
  if (!ev) return <Screen title={t("events.title")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}><EmptyState icon="star" title={t("event.notFound")} /></Screen>;
  const next = nextEventOccurrence(ev, today);

  return (
    <Screen title={ev.title} backLabel={t("a11y.back")} onBack={() => void nav.pop()}
      actions={<IconButton icon="edit" label={t("common.edit")} onClick={() => nav.push({ name: "eventForm", id: ev.id })} />}>
      <div className="row wrap">
        {ev.category && <Badge>{t(`category.${ev.category}` as MessageKey)}</Badge>}
        {ev.repeat === "yearly" && <Badge>{t("event.repeatYearly")}</Badge>}
      </div>
      <section className="hero" aria-label={t("event.status")}>
        {next ? (next.daysRemaining === 0 ? <p className="display">{t("count.today")}</p> : <p className="row" style={{ alignItems: "baseline" }}><span className="display">{next.daysRemaining}</span><span className="t-lg">{t("count.daysToGo")}</span></p>) : <p className="h-lg">{t("event.happened")}</p>}
      </section>
      <section className="card">
        <KV k={t("event.storedDate")} v={dualLabel(ev.date, lang, data.prefs.showGregorian)} />
        {ev.repeat === "yearly" && next && <KV k={t("event.nextOccurrence")} v={dualLabel(next.date, lang, data.prefs.showGregorian)} />}
        {next?.adjustedForMissingDate && <p className="help">{t("event.adjusted")}</p>}
        <KV k={t("event.time")} v={ev.time ? fmtTime(ev.time) : t("event.allDay")} />
        <KV k={t("event.reminder")} v={t(`event.reminder.${ev.reminder}` as MessageKey)} />
      </section>
      {ev.description && <section className="card"><p>{ev.description}</p></section>}
    </Screen>
  );
}
