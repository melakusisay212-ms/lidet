import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, IconButton, Screen } from "../design-system/components.tsx";
import { Icon } from "../design-system/icons.tsx";
import { useApp } from "../app/store.tsx";
import { useNav } from "../app/nav.tsx";
import { nextOccurrence } from "../domain/birthdays/birthday.ts";
import { nextEventOccurrence } from "../domain/events/events.ts";
import { upcomingEntries } from "../domain/entries.ts";
import { engine } from "../domain/calendar/index.ts";
import { ethiopianLabel, gregorianLabel, dualLabel, daysLabel } from "./fmt-helpers.ts";
import { WEEKDAYS } from "../i18n/names.ts";
import { checkPermission } from "../platform/notifications.ts";
import type { PermissionStatus } from "../platform/notifications.ts";
import { EntryRow } from "./entry-row.tsx";

const HORIZON = 30;

export function HomeScreen({ hidden }: { hidden: boolean }) {
  const { t, data, today, warnings, reload, setPrefs } = useApp();
  const nav = useNav();
  const lang = data.prefs.language;
  const [permission, setPermission] = useState<PermissionStatus>("unsupported");

  useEffect(() => { if (data.prefs.reminders.enabled) void checkPermission().then(setPermission); }, [data.prefs.reminders.enabled, hidden]);

  const own = useMemo(() => (data.profile ? nextOccurrence({ month: data.profile.month, day: data.profile.day }, today) : null), [data.profile, today]);
  const birthdaysSoon = useMemo(() => {
    let n = own && own.daysRemaining < HORIZON ? 1 : 0;
    for (const p of data.people) if (p.month !== null && p.day !== null && nextOccurrence({ month: p.month, day: p.day }, today).daysRemaining < HORIZON) n++;
    return n;
  }, [data.people, own, today]);
  const eventsSoon = useMemo(() => data.events.filter((e) => { const o = nextEventOccurrence(e, today); return o !== null && o.daysRemaining < HORIZON; }).length, [data.events, today]);
  const coming = useMemo(() => upcomingEntries(data, today, HORIZON).slice(0, 8), [data, today]);

  const weekday = WEEKDAYS[lang][engine.weekday(today)];
  const showWelcome = !data.prefs.onboardingDone && !data.profile;

  return (
    <Screen hidden={hidden} withNav title={`${t("home.greeting")} · ${t("app.name")}`} backLabel={t("common.back")}
      actions={<IconButton icon="sliders" label={t("a11y.settings")} onClick={() => nav.push({ name: "settings" })} />}>
      <div className="stack-2">
        <p className="t-lg" style={{ fontWeight: 700 }}>{weekday}, {ethiopianLabel(today, lang)}</p>
        {data.prefs.showGregorian && <p className="muted t-sm">{gregorianLabel(today, lang)}</p>}
      </div>

      {(warnings.length > 0) && (
        <div className="banner" role="alert">
          <Icon name="alert" /><div className="grow"><p>{t("home.dbError")}</p><Button variant="quiet" onClick={() => void reload()}>{t("home.retry")}</Button></div>
        </div>
      )}
      {data.prefs.reminders.enabled && permission === "denied" && (
        <div className="banner" role="alert">
          <Icon name="bell" /><div className="grow"><p>{t("reminders.deniedHelp")}</p><Button variant="quiet" onClick={() => nav.push({ name: "reminders" })}>{t("settings.reminders")}</Button></div>
        </div>
      )}

      {showWelcome && (
        <Card>
          <div className="stack-3">
            <h2 className="h-md">{t("setup.welcome")}</h2>
            <p className="muted">{t("setup.welcomeBody")}</p>
            <div className="row wrap">
              <Button icon="gift" onClick={() => nav.push({ name: "birthdaySetup" })}>{t("home.setBirthdayCta")}</Button>
              <Button variant="quiet" onClick={() => void setPrefs({ onboardingDone: true })}>{t("common.skip")}</Button>
            </div>
          </div>
        </Card>
      )}

      {own ? (
        <section className={`hero${own.daysRemaining === 0 ? " today" : ""}`} aria-label={t("home.nextBirthday")}>
          <div className="stack-2">
            <p className="t-sm muted" style={{ fontWeight: 700 }}>{own.daysRemaining === 0 ? t("home.yourBirthday") : t("home.nextBirthday")}</p>
            {own.daysRemaining === 0 ? (
              <p className="display">{t("home.birthdayToday")}</p>
            ) : (
              <p className="row" style={{ alignItems: "baseline" }}>
                <span className="display" aria-label={t("a11y.countdown", { n: own.daysRemaining })}>{own.daysRemaining}</span>
                <span className="t-lg">{t("count.daysToGo")}</span>
              </p>
            )}
            <p style={{ fontWeight: 700 }}>{dualLabel(own.date, lang, data.prefs.showGregorian)}</p>
            {own.adjustedForMissingDate && <p className="t-sm muted">{t("home.adjusted")}</p>}
            <div className="row wrap" style={{ marginTop: "var(--sp-2)" }}>
              <Button variant="outline" onClick={() => nav.push({ name: "age" })}>{t("home.ageDetails")}</Button>
              <Button variant="outline" icon="edit" onClick={() => nav.push({ name: "birthdaySetup" })}>{t("common.edit")}</Button>
            </div>
          </div>
        </section>
      ) : !showWelcome && (
        <Card>
          <div className="stack-3">
            <h2 className="h-md">{t("home.setBirthdayTitle")}</h2>
            <p className="muted">{t("home.setBirthdayBody")}</p>
            <div><Button icon="gift" onClick={() => nav.push({ name: "birthdaySetup" })}>{t("home.setBirthdayCta")}</Button></div>
          </div>
        </Card>
      )}

      <div className="summary">
        <div className="card flat stat"><span className="display" style={{ fontSize: 32 }}>{birthdaysSoon}</span><span style={{ fontWeight: 700 }}>{t("home.summaryBirthdays")}</span><span className="t-xs muted">{t("home.horizon", { n: HORIZON })}</span></div>
        <div className="card flat stat"><span className="display" style={{ fontSize: 32 }}>{eventsSoon}</span><span style={{ fontWeight: 700 }}>{t("home.summaryEvents")}</span><span className="t-xs muted">{t("home.horizon", { n: HORIZON })}</span></div>
      </div>

      <section className="stack-3" aria-labelledby="coming-up">
        <div className="row between">
          <h2 id="coming-up" className="h-md">{t("home.comingUp")}</h2>
          <Button variant="quiet" onClick={() => nav.setTab("calendar")}>{t("common.seeAll")}</Button>
        </div>
        {coming.length === 0 ? (
          <EmptyState icon="calendar" title={t("home.emptyUpcoming", { n: HORIZON })} />
        ) : (
          <div className="stack-2">
            {coming.map((c, i) => (
              <div key={`${i}-${c.date.year}-${c.date.month}-${c.date.day}`} className="stack-2">
                {(i === 0 || coming[i - 1].daysRemaining !== c.daysRemaining) && (
                  <div className="row between"><span className="t-sm" style={{ fontWeight: 700 }}>{ethiopianLabel(c.date, lang)}</span><Badge tone={c.daysRemaining === 0 ? "ok" : "neutral"}>{daysLabel(t, c.daysRemaining)}</Badge></div>
                )}
                <EntryRow entry={c.entry} date={c.date} />
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="row wrap">
        <Button variant="secondary" icon="users" onClick={() => nav.push({ name: "friendForm" })}>{t("home.addFriend")}</Button>
        <Button variant="secondary" icon="star" onClick={() => nav.push({ name: "eventForm" })}>{t("home.addEvent")}</Button>
      </div>
    </Screen>
  );
}
