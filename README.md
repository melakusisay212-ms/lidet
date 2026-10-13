# Lidet · ልደቴ

Ethiopian-calendar-first birthday, countdown and events app for Android. Offline-first, bilingual (English / አማርኛ), no accounts, no network.

Built from *Lidet Product Design and Logic Specification v1.0* (10 Oct 2026).
**Stack:** React 18 + TypeScript + Vite, Capacitor 6 (Android), SQLite (`@capacitor-community/sqlite`) with a browser-storage fallback, local notifications.

## Get a debug APK from GitHub

1. Create a GitHub repo and push this folder (the `android/` folder is generated in CI and git-ignored).
2. Open **Actions → Android debug APK**. It runs on every push and can be started manually (*Run workflow*).
3. When it finishes, download the **lidet-debug-apk-N** artifact, unzip it and install `app-debug.apk` (enable *install unknown apps* on the phone).

The workflow: install → typecheck → unit tests → web build → `cap add android` → `scripts/prepare-android.mjs` (icons, permissions, version) → `cap sync` → `gradlew assembleDebug`.

> **First-run note:** the CI pipeline could not be executed where this project was written (no network, no Android SDK). If the first run fails, the log will point to the cause; the most likely candidates are package-version drift or a Capacitor plugin API difference. Commit the `package-lock.json` that `npm install` creates locally so later builds are reproducible (the workflow uses `npm ci` automatically once it exists).

## Develop locally

```bash
npm install
npm test            # 92 unit tests: calendar, age, holidays, reminders, data, theme contrast, i18n, lists
npm run typecheck
npm run dev         # browser preview (uses browser storage; reminders/share are native-only)
npm run build && npx cap add android && npm run android:prepare && npx cap sync android
cd android && ./gradlew assembleDebug
```
Requires Node 22 (the tests use native TypeScript type-stripping) and JDK 17 for Android.

## Architecture

```
src/domain/      Pure TypeScript, no React/Capacitor. Fully unit-tested.
  calendar/      CalendarEngine interface + reference engine (Julian-day arithmetic), range 1900–2200 EC
  birthdays/ age/ events/ holidays/ reminders/   rules + planners; entries.ts = "what is on this date"
src/data/        Repository interface; SQLite (native) + browser implementations; validation; export/import
src/platform/    Thin Capacitor adapters: notifications, sharing/files, lifecycle
src/design-system/  Semantic tokens (5 families × light/dark, contrast-tested), CSS, components, icons
src/i18n/        en.ts / am.ts (key parity tested), date formatting, greeting templates
src/app/ features/  Store, navigation (unsaved-changes guard, Android back), screens
scripts/         prepare-android.mjs (post-`cap add`), generate-icons.py
```

Key rules implemented: dates stored as structured Ethiopian values (never formatted strings); day counts from absolute day numbers (never 24-hour arithmetic); age = completed calendar anniversaries; reminders are a pure plan reconciled against scheduled notifications (stable ids, no duplicates, cleaned on edit/delete); imports are validate-then-apply; corrupt storage is quarantined, never overwritten; migrations are forward-only.

## Decisions to confirm (spec §12)

| Topic | Current behaviour | Status |
|---|---|---|
| Calendar engine | Own reference engine behind `CalendarEngine`; Kenat not integrated (could not be audited offline). Swap in `src/domain/calendar/index.ts`. | Proposed |
| Supported years | 1900–2200 EC; outside throws, never corrupts | Proposed |
| Birthday on Pagume 6 in a five-day-Pagume year | Celebrated on Pagume 5 | Confirmed in spec |
| Age anniversary for a Pagume 6 birth | Pagume 5 in such years (one function, `age.ts`) | **Open** |
| Month arithmetic day clamp | Day clamps to month length | Proposed |
| Countdown | Whole days only (no seconds) | Decision |
| Reminder times | Birthdays/events: preference time (default 09:00); next 2 occurrences scheduled; max 400 alarms | Decision |

## Data trust

Holiday data is **seed data, not verified** against official sources: every item is labelled *Unverified* or *Calculated* in the UI, and nothing may be marked *verified* without a source (a test enforces this). Genna/Timkat are derived from Julian dates, Fasika-based feasts from the Julian Easter rule (checked against 10 independently known Easter dates). Coverage is partial: no Islamic holidays, no daily saints, three monthly commemorations. Amharic copy needs native-speaker review.

## Not implemented / known gaps

- Friend photos, contact import, Ethiopic numerals, week-start preference
- Deep link to Android notification settings (screen explains the path instead)
- Reminders are re-planned when the app opens/resumes; there is no background time-zone-change receiver
- Release signing, Play Store listing assets, localisation beyond en/am
- Not exercised on a real device/emulator: SQLite plugin, notifications (incl. exact-alarm), share sheet, file export, back button, safe-area insets, bundled fonts
- Browser E2E (Playwright) was used during development against a stubbed-native build but is not part of the repo/CI

## Licences

App code: choose a licence before publishing. Fonts: Manrope and Noto Sans Ethiopic (SIL OFL) via `@fontsource`.
