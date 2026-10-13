import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { todayEthiopian } from "../domain/calendar/index.ts";
import type { EthiopianDate } from "../domain/calendar/index.ts";
import { EMPTY_DATA } from "../domain/models.ts";
import type { AppData, EventRecord, Person, Preferences, Profile } from "../domain/models.ts";
import { planReminders } from "../domain/reminders/plan.ts";
import { createRepository } from "../data/index.ts";
import type { Repository } from "../data/index.ts";
import type { StorageKind } from "../data/repository.ts";
import { formatTime } from "../i18n/format.ts";
import { makeTranslator } from "../i18n/index.ts";
import type { Translate } from "../i18n/index.ts";
import { applyTheme, resolveAppearance } from "../design-system/tokens.ts";
import { reconcile } from "../platform/notifications.ts";
import { onResume } from "../platform/lifecycle.ts";
import { newId } from "./id.ts";
import { useDialogs } from "./dialogs.tsx";

export type PersonInput = { name: string; month: number | null; day: number | null; year: number | null; phone: string | null; notes: string | null };
export type EventInput = Omit<EventRecord, "id" | "createdAt" | "updatedAt">;
export type ProfileInput = { month: number; day: number; year: number | null };

type Status = "loading" | "ready" | "error";

type AppApi = {
  status: Status;
  data: AppData;
  today: EthiopianDate;
  t: Translate;
  fmtTime: (hhmm: string) => string;
  warnings: string[];
  storageKind: StorageKind | null;
  remindersScheduled: number;
  reload: () => Promise<void>;
  saveProfile: (p: ProfileInput | null) => Promise<void>;
  savePerson: (input: PersonInput, id?: string) => Promise<string>;
  removePerson: (id: string) => Promise<void>;
  saveEvent: (input: EventInput, id?: string) => Promise<string>;
  removeEvent: (id: string) => Promise<void>;
  setPrefs: (patch: Partial<Preferences>) => Promise<void>;
  importData: (d: AppData) => Promise<void>;
  clearData: () => Promise<void>;
  syncReminders: () => Promise<void>;
};

const Ctx = createContext<AppApi | null>(null);
export function useApp(): AppApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}

export const BOOT_KEY = "lidet.boot";

function safeToday(now: Date): EthiopianDate {
  try { return todayEthiopian(now); } catch { return { year: 2019, month: 1, day: 1 }; } // device clock outside supported range
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { toast } = useDialogs();
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [now, setNow] = useState(() => new Date());
  const [warnings, setWarnings] = useState<string[]>([]);
  const [storageKind, setStorageKind] = useState<StorageKind | null>(null);
  const [scheduled, setScheduled] = useState(0);
  const repo = useRef<Repository | null>(null);

  const t = useMemo(() => makeTranslator(data.prefs.language), [data.prefs.language]);
  const fmtTime = useCallback((s: string) => formatTime(s, data.prefs.timeFormat), [data.prefs.timeFormat]);
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = useMemo(() => safeToday(now), [dayKey]);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = repo.current ?? (await createRepository());
      repo.current = r;
      const d = await r.load();
      setData(d);
      setWarnings([...r.warnings]);
      setStorageKind(r.kind);
      setStatus("ready");
    } catch (err) {
      console.error("Failed to load data", err);
      setStatus("error");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Day rollover + app resume: derived values (today, countdowns) refresh; nothing is persisted for them.
  useEffect(() => {
    let timer: number | undefined;
    const arm = () => {
      const n = new Date();
      const next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 1).getTime();
      timer = window.setTimeout(() => { setNow(new Date()); arm(); }, Math.max(1000, next - n.getTime()));
    };
    arm();
    const off = onResume(() => { setNow(new Date()); arm(); });
    return () => { window.clearTimeout(timer); off(); };
  }, []);

  // Theme + language side effects, plus a tiny mirror so the next launch themes before first paint.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => applyTheme(document.documentElement, data.prefs.themeFamily, resolveAppearance(data.prefs.appearance, mq.matches));
    apply();
    mq.addEventListener("change", apply);
    document.documentElement.lang = data.prefs.language;
    try { localStorage.setItem(BOOT_KEY, JSON.stringify({ f: data.prefs.themeFamily, a: data.prefs.appearance, l: data.prefs.language })); } catch { /* storage may be unavailable */ }
    return () => mq.removeEventListener("change", apply);
  }, [data.prefs.themeFamily, data.prefs.appearance, data.prefs.language]);

  const syncReminders = useCallback(async () => {
    const plan = planReminders(data, today, new Date(), t, fmtTime);
    setScheduled(await reconcile(plan, t("notif.channel")));
  }, [data, today, t, fmtTime]);

  const syncRef = useRef(syncReminders);
  syncRef.current = syncReminders;
  useEffect(() => {
    if (status !== "ready") return;
    const h = window.setTimeout(() => { void syncRef.current(); }, 400);
    return () => window.clearTimeout(h);
  }, [data, today, status]);

  const guarded = useCallback(async <T,>(fn: (r: Repository) => Promise<T>): Promise<T> => {
    const r = repo.current;
    if (!r) throw new Error("repository not ready");
    try { return await fn(r); } catch (err) { console.error(err); toast(t("state.dbError")); throw err; }
  }, [toast, t]);

  const saveProfile = useCallback(async (p: ProfileInput | null) => {
    const next: Profile | null = p ? { month: p.month, day: p.day, year: p.year, updatedAt: Date.now() } : null;
    await guarded((r) => r.saveProfile(next));
    setData((d) => ({ ...d, profile: next }));
  }, [guarded]);

  const savePerson = useCallback(async (input: PersonInput, id?: string) => {
    const existing = id ? data.people.find((p) => p.id === id) : undefined;
    const person: Person = { ...input, id: existing?.id ?? newId(), createdAt: existing?.createdAt ?? Date.now(), updatedAt: Date.now() };
    await guarded((r) => r.upsertPerson(person));
    setData((d) => ({ ...d, people: [...d.people.filter((p) => p.id !== person.id), person] }));
    return person.id;
  }, [guarded, data.people]);

  const removePerson = useCallback(async (id: string) => {
    await guarded((r) => r.deletePerson(id));
    setData((d) => ({ ...d, people: d.people.filter((p) => p.id !== id) }));
  }, [guarded]);

  const saveEvent = useCallback(async (input: EventInput, id?: string) => {
    const existing = id ? data.events.find((e) => e.id === id) : undefined;
    const ev: EventRecord = { ...input, id: existing?.id ?? newId(), createdAt: existing?.createdAt ?? Date.now(), updatedAt: Date.now() };
    await guarded((r) => r.upsertEvent(ev));
    setData((d) => ({ ...d, events: [...d.events.filter((e) => e.id !== ev.id), ev] }));
    return ev.id;
  }, [guarded, data.events]);

  const removeEvent = useCallback(async (id: string) => {
    await guarded((r) => r.deleteEvent(id));
    setData((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }));
  }, [guarded]);

  const setPrefs = useCallback(async (patch: Partial<Preferences>) => {
    const next = { ...data.prefs, ...patch };
    await guarded((r) => r.savePrefs(next));
    setData((d) => ({ ...d, prefs: { ...d.prefs, ...patch } }));
  }, [guarded, data.prefs]);

  const importData = useCallback(async (d: AppData) => {
    await guarded((r) => r.replaceAll(d));
    setData(d);
  }, [guarded]);

  const clearData = useCallback(async () => {
    await guarded((r) => r.clearAll());
    setData(EMPTY_DATA);
  }, [guarded]);

  const value: AppApi = { status, data, today, t, fmtTime, warnings, storageKind, remindersScheduled: scheduled, reload: load, saveProfile, savePerson, removePerson, saveEvent, removeEvent, setPrefs, importData, clearData, syncReminders };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
