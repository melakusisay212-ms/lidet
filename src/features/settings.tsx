import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Badge, Button, KV, Screen, Segmented, SelectField, Switch } from "../design-system/components.tsx";
import { Icon } from "../design-system/icons.tsx";
import type { IconName } from "../design-system/icons.tsx";
import { THEMES, THEME_FAMILIES, cssVarName, resolveAppearance } from "../design-system/tokens.ts";
import type { Tokens } from "../design-system/tokens.ts";
import { useApp } from "../app/store.tsx";
import { useNav } from "../app/nav.tsx";
import type { Route } from "../app/nav.tsx";
import { useDialogs } from "../app/dialogs.tsx";
import type { Appearance, EventReminder, Language, ThemeFamily } from "../domain/models.ts";
import { DEFAULT_PREFERENCES } from "../domain/models.ts";
import { DATASET_COVERAGE, DATASET_LAST_UPDATED, DATASET_SOURCE, DATASET_VERSION } from "../domain/holidays/dataset.ts";
import { DATA_FORMAT_VERSION, parseExport, serializeExport } from "../data/export.ts";
import { checkExactAlarm, checkPermission, requestPermission } from "../platform/notifications.ts";
import type { ExactStatus, PermissionStatus } from "../platform/notifications.ts";
import { exportJsonFile } from "../platform/sharing.ts";
import { validTime } from "./date-logic.ts";
import type { MessageKey } from "../i18n/index.ts";
import pkg from "../../package.json";

function Hub({ icon, label, route }: { icon: IconName; label: string; route: Route }) {
  const nav = useNav();
  return (
    <button type="button" className="list-row" onClick={() => nav.push(route)}>
      <Icon name={icon} /><span className="grow" style={{ fontWeight: 700 }}>{label}</span><Icon name="right" size={20} />
    </button>
  );
}

export function SettingsScreen() {
  const { t } = useApp();
  const nav = useNav();
  return (
    <Screen title={t("settings.title")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}>
      <div className="list">
        <Hub icon="palette" label={t("settings.appearance")} route={{ name: "appearance" }} />
        <Hub icon="globe" label={t("settings.language")} route={{ name: "language" }} />
        <Hub icon="calendar" label={t("settings.calendar")} route={{ name: "calendarSettings" }} />
        <Hub icon="bell" label={t("settings.reminders")} route={{ name: "reminders" }} />
        <Hub icon="shield" label={t("settings.data")} route={{ name: "data" }} />
        <Hub icon="info" label={t("settings.about")} route={{ name: "about" }} />
      </div>
    </Screen>
  );
}

function previewVars(family: ThemeFamily, appearance: "light" | "dark"): CSSProperties {
  const tokens = THEMES[family][appearance];
  const vars: Record<string, string> = {};
  for (const key of Object.keys(tokens) as Array<keyof Tokens>) vars[cssVarName(key)] = tokens[key];
  return vars as CSSProperties;
}

export function AppearanceScreen() {
  const { t, data, setPrefs } = useApp();
  const nav = useNav();
  const { themeFamily, appearance } = data.prefs;
  const systemDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = resolveAppearance(appearance, systemDark);

  return (
    <Screen title={t("appearance.title")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}>
      <Segmented<Appearance> label={t("appearance.mode")} value={appearance} onChange={(a) => void setPrefs({ appearance: a })}
        options={[{ value: "system", label: t("appearance.system") }, { value: "light", label: t("appearance.light") }, { value: "dark", label: t("appearance.dark") }]} />
      <div className="stack-2">
        <p className="label" style={{ fontWeight: 700 }}>{t("appearance.palette")}</p>
        <div className="list" role="radiogroup" aria-label={t("appearance.palette")}>
          {THEME_FAMILIES.map((f) => {
            const tok = THEMES[f][resolved];
            return (
              <button key={f} type="button" role="radio" aria-checked={f === themeFamily} className="list-row" onClick={() => void setPrefs({ themeFamily: f })}>
                <span className="swatches" aria-hidden="true">{[tok.primary, tok.background, tok.birthday, tok.accent].map((c, i) => <span key={i} className="swatch" style={{ background: c }} />)}</span>
                <span className="grow" style={{ fontWeight: 700 }}>{t(`theme.${f}` as MessageKey)}</span>
                {f === themeFamily && <Icon name="check" label={t("a11y.selected")} />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="stack-2">
        <p className="label" style={{ fontWeight: 700 }}>{t("appearance.preview")}</p>
        <div style={{ ...previewVars(themeFamily, resolved), background: "var(--c-background)", color: "var(--c-text-primary)", padding: 16, borderRadius: 18, border: "1px solid var(--c-border)" }} className="stack-3">
          <div className="hero"><p className="display">12</p><p>{t("appearance.previewDays")}</p><p className="t-sm muted">{t("appearance.previewDate")} · {t("appearance.previewAm")}</p></div>
          <div className="card row wrap"><span className="ind ind-birthday" /><span className="ind ind-event" /><span className="ind ind-public" /><span className="ind ind-fasting" /><span className="muted t-sm">{t("appearance.previewAm")}</span></div>
          <button type="button" className="btn btn-primary" tabIndex={-1} aria-hidden="true">{t("common.save")}</button>
        </div>
      </div>
      <p className="help">{t("appearance.fontNote")}</p>
      <Button variant="outline" onClick={() => void setPrefs({ themeFamily: DEFAULT_PREFERENCES.themeFamily, appearance: DEFAULT_PREFERENCES.appearance })}>{t("common.reset")}</Button>
    </Screen>
  );
}

export function LanguageScreen() {
  const { t, data, setPrefs } = useApp();
  const nav = useNav();
  const p = data.prefs;
  return (
    <Screen title={t("region.title")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}>
      <Segmented<Language> label={t("region.language")} value={p.language} onChange={(l) => void setPrefs({ language: l })} options={[{ value: "en", label: t("region.english") }, { value: "am", label: t("region.amharic") }]} />
      <Switch label={t("region.showGregorian")} checked={p.showGregorian} onChange={(v) => void setPrefs({ showGregorian: v })} />
      <Segmented<"24h" | "12h"> label={t("region.timeFormat")} value={p.timeFormat} onChange={(v) => void setPrefs({ timeFormat: v })} options={[{ value: "24h", label: t("region.time24") }, { value: "12h", label: t("region.time12") }]} />
      <div className="card flat"><p style={{ fontWeight: 700 }}>{t("region.numerals")}</p><p className="help">{t("region.numeralsNote")}</p></div>
    </Screen>
  );
}

export function CalendarSettingsScreen() {
  const { t, data, setPrefs } = useApp();
  const nav = useNav();
  const lang = data.prefs.language;
  return (
    <Screen title={t("settings.calendar")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}>
      <Switch label={t("region.showGregorian")} checked={data.prefs.showGregorian} onChange={(v) => void setPrefs({ showGregorian: v })} />
      <Switch label={t("cal.showGregorianPrimary")} checked={data.prefs.gregorianPrimary} onChange={(v) => void setPrefs({ gregorianPrimary: v })} />
      <section className="card flat stack-2">
        <p style={{ fontWeight: 700 }}>{t("about.sources")}</p>
        <p className="t-sm">{DATASET_SOURCE}</p>
        <p className="t-sm muted">{t("holiday.dataset", { version: DATASET_VERSION })} · {t("about.datasetUpdated", { date: DATASET_LAST_UPDATED })}</p>
        <p className="t-sm muted">{DATASET_COVERAGE[lang]}</p>
      </section>
    </Screen>
  );
}

export function RemindersScreen() {
  const { t, data, setPrefs, remindersScheduled, syncReminders } = useApp();
  const { toast } = useDialogs();
  const nav = useNav();
  const r = data.prefs.reminders;
  const [permission, setPermission] = useState<PermissionStatus>("prompt");
  const [exact, setExact] = useState<ExactStatus>("unknown");
  const refresh = () => { void checkPermission().then(setPermission); void checkExactAlarm().then(setExact); };
  useEffect(refresh, [r.enabled]);
  const patch = (p: Partial<typeof r>) => setPrefs({ reminders: { ...r, ...p } });

  const toggleEnabled = async (on: boolean) => {
    if (!on) { await patch({ enabled: false }); return; }
    const status = await requestPermission();
    setPermission(status);
    if (status === "denied") { toast(t("reminders.deniedHelp")); return; } // stays off; nothing else is affected
    await patch({ enabled: true });
  };

  return (
    <Screen title={t("reminders.title")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}>
      {permission === "unsupported" && <div className="card flat"><p>{t("reminders.webNote")}</p></div>}
      <Switch label={t("reminders.enable")} help={t("reminders.enableBody")} checked={r.enabled} onChange={(v) => void toggleEnabled(v)} />
      {permission === "denied" && <div className="banner" role="alert"><Icon name="alert" /><p>{t("reminders.deniedHelp")}</p></div>}
      <div className="field">
        <label htmlFor="rem-time">{t("reminders.time")}</label>
        <input id="rem-time" className="input" type="time" value={r.time} onChange={(e) => { if (validTime(e.target.value)) void patch({ time: e.target.value }); }} />
      </div>
      <Switch label={t("reminders.birthdayDayBefore")} checked={r.birthdayDayBefore} onChange={(v) => void patch({ birthdayDayBefore: v })} />
      <Switch label={t("reminders.birthdayOnDay")} checked={r.birthdayOnDay} onChange={(v) => void patch({ birthdayOnDay: v })} />
      <SelectField label={t("reminders.eventDefault")} value={r.eventDefault} onChange={(v) => void patch({ eventDefault: v as EventReminder })}
        options={(["none", "on_day", "day_before"] as const).map((x) => ({ value: x, label: t(`event.reminder.${x}` as MessageKey) }))} />
      <section className="card">
        <KV k={t("reminders.permission")} v={<Badge tone={permission === "granted" ? "ok" : permission === "denied" ? "warn" : "neutral"}>{permission === "granted" ? t("reminders.granted") : permission === "denied" ? t("reminders.denied") : t("reminders.prompt")}</Badge>} />
        {permission !== "unsupported" && <KV k={t("reminders.exact")} v={exact === "exact" ? t("reminders.exactOn") : exact === "approximate" ? t("reminders.exactOff") : "—"} />}
        <KV k={t("settings.reminders")} v={t("reminders.count", { n: remindersScheduled })} />
      </section>
      <Button variant="outline" onClick={() => { void syncReminders().then(refresh); }}>{t("reminders.resync")}</Button>
    </Screen>
  );
}

export function DataScreen() {
  const { t, data, storageKind, importData, clearData } = useApp();
  const { toast, confirm } = useDialogs();
  const nav = useNav();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const doExport = async () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const res = await exportJsonFile(`lidet-backup-${stamp}.json`, serializeExport(data), t("data.export"));
    if (res === "ok") toast(t("data.exportDone")); else if (res === "unavailable") toast(t("greeting.noApp"));
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    let text = "";
    try { text = await file.text(); } catch { toast(t("data.importInvalid")); return; }
    const parsed = parseExport(text);
    if (!parsed.ok) { toast(t("data.importInvalid")); return; }
    const ok = await confirm({ title: t("data.importConfirmTitle"), message: t("data.importConfirmBody", { people: parsed.data.people.length, events: parsed.data.events.length }), confirmLabel: t("data.import"), cancelLabel: t("common.cancel"), destructive: true });
    if (!ok) return;
    try { await importData(parsed.data); toast(t("data.importDone")); } catch { /* store showed an error toast; nothing was applied */ }
  };

  const wipe = async () => {
    const ok = await confirm({ title: t("data.deleteAllTitle"), message: `${t("data.deleteAllBody")} ${t("data.deleteAllType")}`, confirmLabel: t("data.deleteAll"), cancelLabel: t("common.cancel"), destructive: true });
    if (!ok) return;
    try { await clearData(); toast(t("data.deleted")); } catch { /* toast shown */ }
  };

  const kind = storageKind === "sqlite" ? t("data.storageSqlite") : storageKind === "browser-fallback" ? t("data.storageFallback") : t("data.storageBrowser");
  return (
    <Screen title={t("data.title")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}>
      <div className="card flat"><p>{t("data.local")}</p></div>
      <Button icon="share" variant="secondary" onClick={() => void doExport()}>{t("data.export")}</Button>
      <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <Button icon="upload" variant="secondary" onClick={() => fileRef.current?.click()}>{t("data.import")}</Button>
      <p className="help">{t("data.backups")}</p>
      <Button icon="trash" variant="danger" onClick={() => void wipe()}>{t("data.deleteAll")}</Button>
      <section className="card"><KV k={t("data.storageLabel")} v={kind} /><KV k={t("data.versionLabel")} v={DATA_FORMAT_VERSION} /></section>
    </Screen>
  );
}

export function AboutScreen() {
  const { t, data } = useApp();
  const nav = useNav();
  const lang = data.prefs.language;
  return (
    <Screen title={t("about.title")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}>
      <div className="stack-2"><h2 className="h-lg">{t("app.name")} · ልደቴ</h2><p className="muted">{t("about.version", { v: pkg.version })}</p><p>{t("about.purpose")}</p></div>
      <section className="card stack-2"><h3 className="h-md">{t("about.engine")}</h3><p>{t("about.engineBody")}</p></section>
      <section className="card stack-2"><h3 className="h-md">{t("about.sources")}</h3><p className="t-sm">{DATASET_SOURCE}</p><p className="t-sm muted">{t("holiday.dataset", { version: DATASET_VERSION })} · {t("about.datasetUpdated", { date: DATASET_LAST_UPDATED })}</p><p className="t-sm muted">{DATASET_COVERAGE[lang]}</p></section>
      <section className="card stack-2"><h3 className="h-md">{t("about.privacy")}</h3><p>{t("about.privacyBody")}</p></section>
      <section className="card stack-2"><h3 className="h-md">{t("about.acks")}</h3><p>{t("about.acksBody")}</p></section>
    </Screen>
  );
}
