import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { EthiopianDate } from "../domain/calendar/index.ts";
import { onBackButton } from "../platform/lifecycle.ts";

export type Tab = "home" | "calendar" | "friends" | "events";
export type Route =
  | { name: "birthdaySetup" }
  | { name: "age" }
  | { name: "friendForm"; id?: string }
  | { name: "friend"; id: string }
  | { name: "greeting"; id: string }
  | { name: "eventForm"; id?: string; date?: EthiopianDate }
  | { name: "event"; id: string }
  | { name: "holiday"; id: string; date: EthiopianDate }
  | { name: "settings" }
  | { name: "appearance" }
  | { name: "language" }
  | { name: "calendarSettings" }
  | { name: "reminders" }
  | { name: "data" }
  | { name: "about" };

export type Guard = () => Promise<boolean>;

type NavApi = {
  tab: Tab;
  stack: Route[];
  setTab: (t: Tab) => void;
  push: (r: Route) => void;
  /** Pops the top route, asking first if a form registered unsaved changes. Resolves true if popped. */
  pop: () => Promise<boolean>;
  /** Replaces the top route without asking (used after a successful save). */
  replaceTop: (r: Route | null) => void;
  setGuard: (g: Guard | null) => void;
  calendarFocus: EthiopianDate | null;
  focusCalendar: (d: EthiopianDate) => void;
};

const Ctx = createContext<NavApi | null>(null);
export function useNav(): NavApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useNav outside NavProvider");
  return v;
}

export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<Tab>("home");
  const [stack, setStack] = useState<Route[]>([]);
  const [calendarFocus, setCalendarFocus] = useState<EthiopianDate | null>(null);
  const guard = useRef<Guard | null>(null);
  const live = useRef({ tab, stack });
  live.current = { tab, stack };

  const setGuard = useCallback((g: Guard | null) => { guard.current = g; }, []);
  const push = useCallback((r: Route) => { guard.current = null; setStack((s) => [...s, r]); }, []);
  const replaceTop = useCallback((r: Route | null) => {
    guard.current = null;
    setStack((s) => (r ? [...s.slice(0, -1), r] : s.slice(0, -1)));
  }, []);
  const pop = useCallback(async () => {
    if (live.current.stack.length === 0) return false;
    if (guard.current && !(await guard.current())) return false;
    guard.current = null;
    setStack((s) => s.slice(0, -1));
    return true;
  }, []);
  const setTab = useCallback((t: Tab) => { setTabState(t); setStack([]); guard.current = null; }, []);
  const focusCalendar = useCallback((d: EthiopianDate) => { setCalendarFocus(d); setStack([]); guard.current = null; setTabState("calendar"); }, []);

  useEffect(() => onBackButton(() => {
    if (live.current.stack.length > 0) { void pop(); return true; }
    if (live.current.tab !== "home") { setTabState("home"); return true; }
    return false;
  }), [pop]);

  const value = useMemo<NavApi>(() => ({ tab, stack, setTab, push, pop, replaceTop, setGuard, calendarFocus, focusCalendar }), [tab, stack, setTab, push, pop, replaceTop, setGuard, calendarFocus, focusCalendar]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Forms call this: back navigation then asks before discarding unsaved edits. */
export function useUnsavedGuard(dirty: boolean, ask: Guard): void {
  const { setGuard } = useNav();
  const askRef = useRef(ask);
  askRef.current = ask;
  useEffect(() => {
    setGuard(dirty ? () => askRef.current() : null);
    return () => setGuard(null);
  }, [dirty, setGuard]);
}
