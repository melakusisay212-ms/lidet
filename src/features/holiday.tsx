import { Badge, EmptyState, KV, Screen } from "../design-system/components.tsx";
import { useApp } from "../app/store.tsx";
import { useNav } from "../app/nav.tsx";
import type { EthiopianDate } from "../domain/calendar/index.ts";
import { DATASET_COVERAGE, DATASET_LAST_UPDATED, DATASET_SOURCE, DATASET_VERSION, holidayById } from "../domain/holidays/dataset.ts";
import { observancesOn } from "../domain/holidays/resolve.ts";
import type { MessageKey } from "../i18n/index.ts";
import { dualLabel, gregorianLabel } from "./fmt-helpers.ts";

export function HolidayScreen({ id, date }: { id: string; date: EthiopianDate }) {
  const { t, data } = useApp();
  const nav = useNav();
  const lang = data.prefs.language;
  const record = holidayById(id);
  const inst = observancesOn(date).find((o) => o.record.id === id);

  if (!record) return <Screen title={t("holiday.about")} backLabel={t("a11y.back")} onBack={() => void nav.pop()}><EmptyState icon="info" title={t("holiday.notFound")} /></Screen>;
  const span = inst && (inst.start.year !== inst.end.year || inst.start.month !== inst.end.month || inst.start.day !== inst.end.day);
  const tone = record.verification === "verified" ? "ok" : record.verification === "calculated" ? "neutral" : "warn";

  return (
    <Screen title={record.names[lang]} backLabel={t("a11y.back")} onBack={() => void nav.pop()}>
      <div className="row wrap">
        <Badge tone="neutral">{t(`holiday.category.${record.category}` as MessageKey)}</Badge>
        <Badge tone={tone}>{t(`holiday.status.${record.verification}` as MessageKey)}</Badge>
      </div>
      {lang === "am" ? <p className="t-sm muted">{record.names.en}</p> : <p className="t-sm muted">{record.names.am}</p>}
      <section className="card">
        <KV k={t("holiday.date")} v={dualLabel(date, lang, false)} />
        <KV k={t("holiday.gregorian")} v={gregorianLabel(date, lang)} />
        {span && inst && <KV k={t("holiday.period")} v={`${dualLabel(inst.start, lang, false)} → ${dualLabel(inst.end, lang, false)}`} />}
        <KV k={t("holiday.method")} v={t(`holiday.method.${record.method}` as MessageKey)} />
      </section>
      <section className="stack-2">
        <h2 className="h-md">{t("holiday.about")}</h2>
        <p>{record.description[lang]}</p>
        {record.note && <p className="muted">{record.note[lang]}</p>}
      </section>
      <section className="card flat stack-2">
        <p style={{ fontWeight: 700 }}>{t(`holiday.status.${record.verification}` as MessageKey)}</p>
        <p className="t-sm">{t(`holiday.statusHelp.${record.verification}` as MessageKey)}</p>
        {record.verification !== "verified" && <p className="t-sm muted">{t("holiday.notOfficial")}</p>}
      </section>
      <section className="stack-2">
        <h2 className="h-md">{t("holiday.source")}</h2>
        <p className="t-sm">{DATASET_SOURCE}</p>
        <p className="t-sm muted">{t("holiday.dataset", { version: DATASET_VERSION })} · {t("about.datasetUpdated", { date: DATASET_LAST_UPDATED })}</p>
        <p className="t-sm muted"><strong>{t("holiday.coverage")}:</strong> {DATASET_COVERAGE[lang]}</p>
      </section>
    </Screen>
  );
}
