import { useMemo, useState } from "react";
import { Button, Chip, EmptyState, IconButton, KV, Screen, Segmented, TextArea, TextField } from "../design-system/components.tsx";
import { Icon } from "../design-system/icons.tsx";
import { useApp } from "../app/store.tsx";
import { useNav, useUnsavedGuard } from "../app/nav.tsx";
import { useDialogs } from "../app/dialogs.tsx";
import { calculateAge } from "../domain/age/age.ts";
import type { Language, Person } from "../domain/models.ts";
import { formatEthiopianMonthDay } from "../i18n/format.ts";
import { buildGreeting, GREETING_STYLES } from "../i18n/greetings.ts";
import type { GreetingStyle } from "../i18n/greetings.ts";
import type { MessageKey } from "../i18n/index.ts";
import { BirthdayFields } from "./date-fields.tsx";
import { parseBirthday } from "./date-logic.ts";
import type { BirthdayValue } from "./date-logic.ts";
import { dualLabel, daysLabel, initials } from "./fmt-helpers.ts";
import { copyText, openSms, shareText } from "../platform/sharing.ts";
import { occurrenceOf, selectFriends } from "./friends-logic.ts";
import type { FriendFilter, FriendRow, FriendSort } from "./friends-logic.ts";

export function FriendsScreen({ hidden }: { hidden: boolean }) {
  const { t, data, today } = useApp();
  const nav = useNav();
  const lang = data.prefs.language;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FriendFilter>("all");
  const [sort, setSort] = useState<FriendSort>("next");
  const rows = useMemo<FriendRow[]>(() => data.people.map((person) => ({ person, occ: occurrenceOf(person, today) })), [data.people, today]);
  const shown = useMemo(() => selectFriends(rows, q, filter, sort), [rows, q, filter, sort]);
  const filtering = q.trim() !== "" || filter !== "all";

  return (
    <Screen hidden={hidden} withNav title={t("friends.title")} backLabel={t("common.back")}
      actions={<IconButton icon="plus" label={t("friends.add")} onClick={() => nav.push({ name: "friendForm" })} />}>
      {data.people.length > 0 && (
        <>
          <TextField label={t("friends.search")} type="search" value={q} onChange={setQ} />
          <div className="chips" role="group" aria-label={t("cal.filters")}>
            {(["all", "upcoming", "today", "missing"] as const).map((f) => <Chip key={f} label={t(`friends.${f}` as MessageKey)} pressed={filter === f} onClick={() => setFilter(f)} />)}
          </div>
          <Segmented label={t("friends.sort")} value={sort} onChange={setSort} options={[{ value: "next", label: t("friends.sortNext") }, { value: "alpha", label: t("friends.sortAlpha") }]} />
        </>
      )}
      {data.people.length === 0 ? (
        <EmptyState icon="users" title={t("friends.empty")} body={t("friends.emptyBody")} action={<Button icon="plus" onClick={() => nav.push({ name: "friendForm" })}>{t("friends.add")}</Button>} />
      ) : shown.length === 0 ? (
        <EmptyState icon="search" title={q.trim() ? t("friends.noResults", { q: q.trim() }) : t("friends.noResultsFilter")} action={filtering ? <Button variant="secondary" onClick={() => { setQ(""); setFilter("all"); }}>{t("friends.clearFilters")}</Button> : undefined} />
      ) : (
        <div className="list" role="list">
          {shown.map(({ person, occ }) => (
            <button key={person.id} type="button" role="listitem" className="list-row" onClick={() => nav.push({ name: "friend", id: person.id })}>
              <span className={`avatar${occ?.daysRemaining === 0 ? " today" : ""}`} aria-hidden="true">{initials(person.name)}</span>
              <span className="grow">
                <span style={{ fontWeight: 700, display: "block" }}>{person.name}</span>
                <span className="t-sm muted" style={{ display: "block" }}>{person.month !== null && person.day !== null ? formatEthiopianMonthDay(person.month, person.day, lang) : t("friends.birthdayNotSet")}</span>
              </span>
              {occ && <span style={{ fontWeight: 700, textAlign: "right" }} className="num">{occ.daysRemaining === 0 ? <><Icon name="gift" size={18} /> {t("count.today")}</> : daysLabel(t, occ.daysRemaining)}</span>}
            </button>
          ))}
        </div>
      )}
    </Screen>
  );
}

export function FriendFormScreen({ id }: { id?: string }) {
  const { t, data, today, savePerson, removePerson } = useApp();
  const nav = useNav();
  const { confirm } = useDialogs();
  const lang = data.prefs.language;
  const existing = id ? data.people.find((p) => p.id === id) : undefined;

  const initial = useMemo(() => ({ name: existing?.name ?? "", bd: { month: existing?.month ?? null, day: existing?.day ?? null, year: existing?.year ? String(existing.year) : "" } as BirthdayValue, phone: existing?.phone ?? "", notes: existing?.notes ?? "" }), [existing]);
  const [name, setName] = useState(initial.name);
  const [bd, setBd] = useState<BirthdayValue>(initial.bd);
  const [phone, setPhone] = useState(initial.phone);
  const [notes, setNotes] = useState(initial.notes);
  const [nameError, setNameError] = useState<string | null>(null);
  const [bdError, setBdError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = name !== initial.name || bd.month !== initial.bd.month || bd.day !== initial.bd.day || bd.year !== initial.bd.year || phone !== initial.phone || notes !== initial.notes;
  useUnsavedGuard(dirty, () => confirm({ title: t("unsaved.title"), message: t("unsaved.body"), confirmLabel: t("common.discard"), cancelLabel: t("common.keepEditing"), destructive: true }));

  if (id && !existing) return <Screen title={t("friend.editTitle")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}><EmptyState icon="users" title={t("friend.notFound")} /></Screen>;

  const save = async () => {
    const trimmed = name.trim();
    const parsed = parseBirthday(bd, { required: false, today }, t);
    setNameError(trimmed ? null : t("friend.nameRequired"));
    setBdError(parsed.ok ? null : parsed.error);
    if (!trimmed || !parsed.ok) return;
    setSaving(true);
    try {
      const newId = await savePerson({ name: trimmed, month: parsed.month, day: parsed.day, year: parsed.year, phone: phone.trim() || null, notes: notes.trim() || null }, id);
      if (id) nav.replaceTop(null); else nav.replaceTop({ name: "friend", id: newId });
    } catch { /* toast shown by store */ } finally { setSaving(false); }
  };

  const del = async () => {
    if (!existing) return;
    const ok = await confirm({ title: t("friend.deleteTitle"), message: t("friend.deleteBody"), confirmLabel: t("common.delete"), cancelLabel: t("common.cancel"), destructive: true });
    if (!ok) return;
    try { await removePerson(existing.id); nav.replaceTop(null); nav.replaceTop(null); } catch { /* toast shown */ }
  };

  return (
    <Screen title={id ? t("friend.editTitle") : t("friend.addTitle")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}
      footer={<>
        {id && <Button variant="quiet" icon="trash" onClick={() => void del()}>{t("common.delete")}</Button>}
        <div className="grow"><Button block loading={saving} onClick={() => void save()}>{t("common.save")}</Button></div>
      </>}>
      <TextField label={t("friend.name")} value={name} maxLength={200} error={nameError} autoFocus={!id} onChange={(v) => { setName(v); setNameError(null); }} />
      <div className="stack-2">
        <p className="label" style={{ fontWeight: 700 }}>{t("friend.birthday")}</p>
        <BirthdayFields value={bd} onChange={(v) => { setBd(v); setBdError(null); }} lang={lang} t={t} error={bdError} />
        <p className="help">{t("friend.birthdayHelp")}</p>
      </div>
      <TextField label={t("friend.phone")} type="tel" value={phone} maxLength={60} onChange={setPhone} />
      <TextArea label={t("friend.notes")} value={notes} maxLength={4000} onChange={setNotes} />
    </Screen>
  );
}

export function FriendDetailScreen({ id }: { id: string }) {
  const { t, data, today } = useApp();
  const nav = useNav();
  const lang = data.prefs.language;
  const p = data.people.find((x) => x.id === id);
  if (!p) return <Screen title={t("friends.title")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}><EmptyState icon="users" title={t("friend.notFound")} /></Screen>;

  const occ = occurrenceOf(p, today);
  const age = p.year !== null && p.month !== null && p.day !== null ? calculateAge({ year: p.year, month: p.month, day: p.day }, today) : null;
  const r = data.prefs.reminders;
  const remindersOn = r.enabled && (r.birthdayOnDay || r.birthdayDayBefore);

  return (
    <Screen title={p.name} backLabel={t("a11y.back")} onBack={() => void nav.pop()}
      actions={<IconButton icon="edit" label={t("common.edit")} onClick={() => nav.push({ name: "friendForm", id: p.id })} />}>
      <div className="row">
        <span className={`avatar${occ?.daysRemaining === 0 ? " today" : ""}`} style={{ width: 64, height: 64, fontSize: 22 }} aria-hidden="true">{initials(p.name)}</span>
        <div className="grow">
          <h2 className="h-lg">{p.name}</h2>
          <p className="muted">{p.month !== null && p.day !== null ? formatEthiopianMonthDay(p.month, p.day, lang) : t("friends.birthdayNotSet")}</p>
        </div>
      </div>
      {occ ? (
        <section className={`hero${occ.daysRemaining === 0 ? " today" : ""}`} aria-label={t("friend.nextBirthday")}>
          <p className="t-sm muted" style={{ fontWeight: 700 }}>{t("friend.nextBirthday")}</p>
          {occ.daysRemaining === 0 ? <p className="display">{t("home.birthdayToday")}</p> : (
            <p className="row" style={{ alignItems: "baseline" }}><span className="display" aria-label={t("a11y.countdown", { n: occ.daysRemaining })}>{occ.daysRemaining}</span><span className="t-lg">{t("count.daysToGo")}</span></p>
          )}
        </section>
      ) : <div className="card flat"><p>{t("friend.birthdayHelp")}</p></div>}
      <section className="card">
        {occ && <KV k={t("friend.nextBirthday")} v={dualLabel(occ.date, lang, data.prefs.showGregorian)} />}
        {occ?.adjustedForMissingDate && <p className="help">{t("home.adjusted")}</p>}
        {age && <KV k={t("friend.age")} v={t("age.years", { n: age.years })} />}
        <KV k={t("friend.reminders")} v={remindersOn ? t("friend.remindersOn") : t("friend.remindersOff")} />
        {p.phone && <KV k={t("friend.phone")} v={p.phone} />}
      </section>
      {p.notes && <section className="card"><p className="label" style={{ fontWeight: 700 }}>{t("friend.notes")}</p><p>{p.notes}</p></section>}
      <div className="stack-2">
        <Button icon="message" onClick={() => nav.push({ name: "greeting", id: p.id })}>{t("friend.createGreeting")}</Button>
        {occ && <Button variant="secondary" icon="calendar" onClick={() => nav.focusCalendar(occ.date)}>{t("friend.viewInCalendar")}</Button>}
      </div>
    </Screen>
  );
}

export function GreetingScreen({ id }: { id: string }) {
  const { t, data, today } = useApp();
  const nav = useNav();
  const { toast, confirm } = useDialogs();
  const p = data.people.find((x) => x.id === id);
  const [lang, setLang] = useState<Language>(data.prefs.language);
  const [style, setStyle] = useState<GreetingStyle>("warm");
  const generated = buildGreeting(lang, style, p?.name);
  const [edited, setEdited] = useState<string | null>(null);
  const message = edited ?? generated;

  useUnsavedGuard(edited !== null && edited !== generated, () => confirm({ title: t("unsaved.title"), message: t("unsaved.body"), confirmLabel: t("common.discard"), cancelLabel: t("common.keepEditing"), destructive: true }));

  if (!p) return <Screen title={t("greeting.title")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}><EmptyState icon="users" title={t("friend.notFound")} /></Screen>;
  const occ = occurrenceOf(p, today);
  const guard = (): boolean => { if (!message.trim()) { toast(t("greeting.empty")); return false; } return true; };

  return (
    <Screen title={t("greeting.title")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}
      footer={<Button variant="quiet" onClick={() => void nav.pop()}>{t("common.cancel")}</Button>}>
      <p className="muted">{t("greeting.forBirthday", { name: p.name, date: occ ? dualLabel(occ.date, data.prefs.language, false) : t("friends.birthdayNotSet") })}</p>
      <Segmented label={t("greeting.language")} value={lang} onChange={(l) => { setLang(l); setEdited(null); }} options={[{ value: "en", label: "English" }, { value: "am", label: "አማርኛ" }]} />
      <div className="stack-2">
        <p className="label" style={{ fontWeight: 700 }}>{t("greeting.style")}</p>
        <div className="chips" role="group" aria-label={t("greeting.style")}>
          {GREETING_STYLES.map((s) => <Chip key={s} label={t(`greeting.${s}` as MessageKey)} pressed={style === s} onClick={() => { setStyle(s); setEdited(null); }} />)}
        </div>
      </div>
      <TextArea label={t("greeting.message")} value={message} maxLength={1000} onChange={setEdited} />
      {edited !== null && <div><Button variant="quiet" onClick={() => setEdited(null)}>{t("greeting.reset")}</Button></div>}
      <div className="grid-2">
        <Button icon="copy" variant="secondary" onClick={() => { if (guard()) void copyText(message).then((ok) => toast(ok ? t("greeting.copied") : t("greeting.noApp"))); }}>{t("greeting.copy")}</Button>
        <Button icon="share" variant="secondary" onClick={() => { if (guard()) void shareText(message, t("greeting.title")).then((r) => { if (r === "unavailable") toast(t("greeting.noApp")); }); }}>{t("greeting.share")}</Button>
      </div>
      <Button icon="message" onClick={() => { if (guard() && openSms(message) === "unavailable") toast(t("greeting.noApp")); }}>{t("greeting.sms")}</Button>
      <p className="help">{t("greeting.noAutoSend")}</p>
    </Screen>
  );
}
