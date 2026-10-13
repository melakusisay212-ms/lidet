import { useMemo, useState } from "react";
import { Button, Screen } from "../design-system/components.tsx";
import { useApp } from "../app/store.tsx";
import { useNav, useUnsavedGuard } from "../app/nav.tsx";
import { useDialogs } from "../app/dialogs.tsx";
import { BirthdayFields } from "./date-fields.tsx";
import { parseBirthday } from "./date-logic.ts";
import type { BirthdayValue } from "./date-logic.ts";
import { nextOccurrence } from "../domain/birthdays/birthday.ts";
import { dualLabel } from "./fmt-helpers.ts";

export function BirthdaySetupScreen() {
  const { t, data, today, saveProfile, setPrefs } = useApp();
  const nav = useNav();
  const { confirm } = useDialogs();
  const lang = data.prefs.language;
  const initial = useMemo<BirthdayValue>(() => ({ month: data.profile?.month ?? null, day: data.profile?.day ?? null, year: data.profile?.year ? String(data.profile.year) : "" }), [data.profile]);
  const [value, setValue] = useState<BirthdayValue>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = value.month !== initial.month || value.day !== initial.day || value.year !== initial.year;
  useUnsavedGuard(dirty, () => confirm({ title: t("unsaved.title"), message: t("unsaved.body"), confirmLabel: t("common.discard"), cancelLabel: t("common.keepEditing"), destructive: true }));

  const parsed = parseBirthday(value, { required: true, today }, t);
  const preview = parsed.ok && parsed.month !== null && parsed.day !== null ? nextOccurrence({ month: parsed.month, day: parsed.day }, today) : null;
  const isPagume6 = value.month === 13 && value.day === 6;

  const save = async () => {
    if (!parsed.ok) { setError(parsed.error); return; }
    if (parsed.month === null || parsed.day === null) return;
    setSaving(true);
    try {
      await saveProfile({ month: parsed.month, day: parsed.day, year: parsed.year });
      if (!data.prefs.onboardingDone) await setPrefs({ onboardingDone: true });
      nav.replaceTop(null);
    } catch { /* store already showed a toast */ } finally { setSaving(false); }
  };
  const skip = async () => { await setPrefs({ onboardingDone: true }); nav.replaceTop(null); };

  return (
    <Screen title={t("setup.title")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}
      footer={<>
        {!data.profile && <Button variant="quiet" onClick={() => void skip()}>{t("common.skip")}</Button>}
        <div className="grow"><Button block loading={saving} onClick={() => void save()}>{t("setup.save")}</Button></div>
      </>}>
      <p className="muted t-lg">{t("setup.subtitle")}</p>
      <BirthdayFields value={value} onChange={(v) => { setValue(v); setError(null); }} lang={lang} t={t} error={error} allowUnknownYear withGregorianHelper />
      {isPagume6 && <p className="help">{t("setup.pagumeNote")}</p>}
      {value.year.trim() === "" && <p className="help">{t("setup.noYearNote")}</p>}
      {preview && <div className="card flat"><p style={{ fontWeight: 700 }}>{t("setup.preview", { date: dualLabel(preview.date, lang, data.prefs.showGregorian) })}</p>{preview.adjustedForMissingDate && <p className="help">{t("home.adjusted")}</p>}</div>}
    </Screen>
  );
}
