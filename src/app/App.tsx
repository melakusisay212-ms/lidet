import { Button } from "../design-system/components.tsx";
import { Icon } from "../design-system/icons.tsx";
import type { IconName } from "../design-system/icons.tsx";
import { DialogProvider } from "./dialogs.tsx";
import { NavProvider, useNav } from "./nav.tsx";
import type { Tab } from "./nav.tsx";
import { AppProvider, useApp } from "./store.tsx";
import { HomeScreen } from "../features/home.tsx";
import { CalendarScreen } from "../features/calendar.tsx";
import { FriendsScreen, FriendFormScreen, FriendDetailScreen, GreetingScreen } from "../features/friends.tsx";
import { EventsScreen, EventFormScreen, EventDetailScreen } from "../features/events.tsx";
import { BirthdaySetupScreen } from "../features/birthday-setup.tsx";
import { AgeScreen } from "../features/age.tsx";
import { HolidayScreen } from "../features/holiday.tsx";
import { AboutScreen, AppearanceScreen, CalendarSettingsScreen, DataScreen, LanguageScreen, RemindersScreen, SettingsScreen } from "../features/settings.tsx";

const TABS: ReadonlyArray<{ id: Tab; icon: IconName; label: "nav.home" | "nav.calendar" | "nav.friends" | "nav.events" }> = [
  { id: "home", icon: "home", label: "nav.home" },
  { id: "calendar", icon: "calendar", label: "nav.calendar" },
  { id: "friends", icon: "users", label: "nav.friends" },
  { id: "events", icon: "star", label: "nav.events" },
];

function Routes() {
  const { stack } = useNav();
  const top = stack[stack.length - 1];
  if (!top) return null;
  switch (top.name) {
    case "birthdaySetup": return <BirthdaySetupScreen />;
    case "age": return <AgeScreen />;
    case "friendForm": return <FriendFormScreen key={top.id ?? "new"} id={top.id} />;
    case "friend": return <FriendDetailScreen id={top.id} />;
    case "greeting": return <GreetingScreen id={top.id} />;
    case "eventForm": return <EventFormScreen key={top.id ?? "new"} id={top.id} presetDate={top.date} />;
    case "event": return <EventDetailScreen id={top.id} />;
    case "holiday": return <HolidayScreen id={top.id} date={top.date} />;
    case "settings": return <SettingsScreen />;
    case "appearance": return <AppearanceScreen />;
    case "language": return <LanguageScreen />;
    case "calendarSettings": return <CalendarSettingsScreen />;
    case "reminders": return <RemindersScreen />;
    case "data": return <DataScreen />;
    case "about": return <AboutScreen />;
  }
}

function Shell() {
  const { status, t, reload } = useApp();
  const nav = useNav();

  if (status === "loading") return <div className="splash" role="status"><span className="spinner" aria-hidden="true" /><p className="muted">{t("common.loading")}</p></div>;
  if (status === "error") {
    return (
      <div className="splash">
        <Icon name="alert" size={40} />
        <p style={{ fontWeight: 700 }}>{t("state.dbError")}</p>
        <Button onClick={() => void reload()}>{t("home.retry")}</Button>
      </div>
    );
  }
  const inTabs = nav.stack.length === 0;
  return (
    <div className="app">
      <HomeScreen hidden={!inTabs || nav.tab !== "home"} />
      <CalendarScreen hidden={!inTabs || nav.tab !== "calendar"} />
      <FriendsScreen hidden={!inTabs || nav.tab !== "friends"} />
      <EventsScreen hidden={!inTabs || nav.tab !== "events"} />
      <Routes />
      {inTabs && (
        <nav className="tabs" aria-label="Main">
          {TABS.map((tab) => (
            <button key={tab.id} type="button" className="tab" aria-current={nav.tab === tab.id ? "page" : undefined} onClick={() => nav.setTab(tab.id)}>
              <Icon name={tab.icon} /><span>{t(tab.label)}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

export function App() {
  return (
    <DialogProvider>
      <AppProvider>
        <NavProvider>
          <Shell />
        </NavProvider>
      </AppProvider>
    </DialogProvider>
  );
}
