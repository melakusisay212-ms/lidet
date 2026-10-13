import { useState } from "react";
import { engine } from "../domain/calendar/index.ts";
import { SelectField, TextField, Switch } from "../design-system/components.tsx";
import { ET_MONTHS } from "../i18n/names.ts";
import type { BirthdayValue, DateValue } from "./date-logic.ts";
import { formatGregorian } from "../i18n/format.ts";
import type { Language } from "../domain/models.ts";
import type { Translate } from "../i18n/index.ts";

function monthOptions(lang: Language) { return ET_MONTHS[lang].map((label, i) => ({ value: i + 1, label })); }
function dayOptions(month: number | null) { return Array.from({ length: month === 13 ? 6 : 30 }, (_, i) => ({ value: i + 1, label: String(i + 1) })); }

export function BirthdayFields(props: {
  value: BirthdayValue; onChange: (v: BirthdayValue) => void; lang: Language; t: Translate; error?: string | null;
  allowUnknownYear?: boolean; withGregorianHelper?: boolean;
}) {
  const { value, onChange, lang, t } = props;
  const [unknownYear, setUnknownYear] = useState(value.year === "");
  const [greg, setGreg] = useState("");

  const onGregorian = (iso: string) => {
    setGreg(iso);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return;
    try {
      const e = engine.toEthiopian({ year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) });
      setUnknownYear(false);
      onChange({ month: e.month, day: e.day, year: String(e.year) });
    } catch { /* outside supported range: ignore */ }
  };

  return (
    <div className="stack-3">
      <div className="grid-2">
        <SelectField label={t("common.month")} value={value.month ?? ""} placeholder="—" options={monthOptions(lang)} error={props.error}
          onChange={(v) => { const month = v === "" ? null : Number(v); onChange({ ...value, month, day: month === null ? null : value.day !== null && value.day > (month === 13 ? 6 : 30) ? null : value.day }); }} />
        <SelectField label={t("common.day")} value={value.day ?? ""} placeholder="—" options={dayOptions(value.month)}
          onChange={(v) => onChange({ ...value, day: v === "" ? null : Number(v) })} />
      </div>
      {props.allowUnknownYear && (
        <Switch label={t("setup.unknownYear")} checked={unknownYear} onChange={(c) => { setUnknownYear(c); if (c) onChange({ ...value, year: "" }); }} />
      )}
      {!(props.allowUnknownYear && unknownYear) && (
        <TextField label={t("setup.year")} value={value.year} type="tel" maxLength={4} placeholder="2000" onChange={(v) => onChange({ ...value, year: v.replace(/\D/g, "") })} />
      )}
      {props.withGregorianHelper && (
        <div className="field">
          <label htmlFor="greg-helper">{t("setup.gregorianHelper")}</label>
          <input id="greg-helper" className="input" type="date" value={greg} min="1907-09-11" max="2100-12-31" onChange={(e) => onGregorian(e.target.value)} />
          {greg && value.month !== null && value.day !== null && value.year !== "" && (
            <span className="help">{(() => { try { return formatGregorian(engine.toGregorian({ year: Number(value.year), month: value.month, day: value.day }), lang); } catch { return ""; } })()}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function EthiopianDateFields(props: { value: DateValue; onChange: (v: DateValue) => void; lang: Language; t: Translate; error?: string | null }) {
  const { value, onChange, lang, t } = props;
  return (
    <div className="grid-3">
      <SelectField label={t("common.month")} value={value.month ?? ""} placeholder="—" options={monthOptions(lang)} error={props.error}
        onChange={(v) => onChange({ ...value, month: v === "" ? null : Number(v) })} />
      <SelectField label={t("common.day")} value={value.day ?? ""} placeholder="—" options={dayOptions(value.month)} onChange={(v) => onChange({ ...value, day: v === "" ? null : Number(v) })} />
      <TextField label={t("common.year")} value={value.year} type="tel" maxLength={4} onChange={(v) => onChange({ ...value, year: v.replace(/\D/g, "") })} />
    </div>
  );
}
