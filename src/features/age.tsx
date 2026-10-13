import { useMemo } from "react";
import { Button, EmptyState, KV, Screen } from "../design-system/components.tsx";
import { useApp } from "../app/store.tsx";
import { useNav } from "../app/nav.tsx";
import { calculateAge } from "../domain/age/age.ts";
import { nextOccurrence } from "../domain/birthdays/birthday.ts";
import { dualLabel, daysLabel } from "./fmt-helpers.ts";
import { formatEthiopianMonthDay } from "../i18n/format.ts";

export function AgeScreen() {
  const { t, data, today } = useApp();
  const nav = useNav();
  const lang = data.prefs.language;
  const p = data.profile;
  const age = useMemo(() => (p && p.year !== null ? calculateAge({ year: p.year, month: p.month, day: p.day }, today) : null), [p, today]);
  const next = useMemo(() => (p ? nextOccurrence({ month: p.month, day: p.day }, today) : null), [p, today]);

  return (
    <Screen title={t("age.title")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}>
      {!p ? (
        <EmptyState icon="gift" title={t("home.setBirthdayTitle")} body={t("home.setBirthdayBody")} action={<Button onClick={() => nav.replaceTop({ name: "birthdaySetup" })}>{t("home.setBirthdayCta")}</Button>} />
      ) : (
        <>
          <section className="card stack-3" aria-label={t("age.title")}>
            {age ? (
              <div className="row wrap" style={{ alignItems: "baseline", gap: "var(--sp-4)" }}>
                <span className="stat"><span className="display">{age.years}</span><span className="muted">{t("age.years", { n: "" }).trim()}</span></span>
                <span className="stat"><span className="display">{age.months}</span><span className="muted">{t("age.months", { n: "" }).trim()}</span></span>
                <span className="stat"><span className="display">{age.days}</span><span className="muted">{t("age.days", { n: "" }).trim()}</span></span>
              </div>
            ) : (
              <p className="h-md">{t("age.notSet")}</p>
            )}
            <p className="help">{t("age.note")}</p>
          </section>
          <section className="card">
            {p.year !== null && <KV k={t("age.birthDate")} v={dualLabel({ year: p.year, month: p.month, day: p.day }, lang, data.prefs.showGregorian)} />}
            {p.year === null && <KV k={t("age.birthDate")} v={formatEthiopianMonthDay(p.month, p.day, lang)} />}
            <KV k={t("age.todayIs")} v={dualLabel(today, lang, data.prefs.showGregorian)} />
            {age && <KV k={t("age.totalDays")} v={<span className="num">{age.totalDays.toLocaleString()}</span>} />}
            {next && <KV k={t("age.nextBirthday")} v={`${dualLabel(next.date, lang, data.prefs.showGregorian)} · ${daysLabel(t, next.daysRemaining)}`} />}
          </section>
          <Button variant="secondary" icon="edit" onClick={() => nav.replaceTop({ name: "birthdaySetup" })}>{t("age.editBirthday")}</Button>
        </>
      )}
    </Screen>
  );
}
