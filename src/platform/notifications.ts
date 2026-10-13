import { LocalNotifications } from "@capacitor/local-notifications";
import { capReminders, diffSchedules } from "../domain/reminders/plan.ts";
import type { PlannedReminder } from "../domain/reminders/plan.ts";
import { isNative } from "./native.ts";

export type PermissionStatus = "granted" | "denied" | "prompt" | "unsupported";
export type ExactStatus = "exact" | "approximate" | "unknown";

const CHANNEL_ID = "lidet-reminders";

function normalise(state: string | undefined): PermissionStatus {
  if (state === "granted") return "granted";
  if (state === "denied") return "denied";
  return "prompt";
}

export async function checkPermission(): Promise<PermissionStatus> {
  if (!isNative()) return "unsupported";
  try { return normalise((await LocalNotifications.checkPermissions()).display); } catch { return "prompt"; }
}

/** Android 13+ shows the system prompt here. Denial never throws and never breaks other features. */
export async function requestPermission(): Promise<PermissionStatus> {
  if (!isNative()) return "unsupported";
  try { return normalise((await LocalNotifications.requestPermissions()).display); } catch { return "denied"; }
}

/** Exact-alarm access is separate from notification permission; without it Android delivers approximately. */
export async function checkExactAlarm(): Promise<ExactStatus> {
  if (!isNative()) return "unknown";
  try {
    const r = await LocalNotifications.checkExactNotificationSetting();
    return r.exact_alarm === "granted" ? "exact" : "approximate";
  } catch { return "unknown"; }
}

async function ensureChannel(name: string): Promise<void> {
  try { await LocalNotifications.createChannel({ id: CHANNEL_ID, name, importance: 4, visibility: 1, vibration: true }); } catch { /* channels only exist on Android 8+ */ }
}

/**
 * Reconcile scheduled notifications with the desired plan: cancel stale ones, add missing ones, leave matching
 * ones untouched. Because ids are content-derived and stable, calling this repeatedly never creates duplicates.
 * Returns how many reminders are scheduled afterwards.
 */
export async function reconcile(planned: readonly PlannedReminder[], channelName: string): Promise<number> {
  if (!isNative()) return 0;
  const permission = await checkPermission();
  const desired = permission === "granted" ? capReminders(planned) : [];
  try {
    const pending = (await LocalNotifications.getPending()).notifications.map((n) => n.id);
    const { cancel, schedule } = diffSchedules(pending, desired);
    if (cancel.length > 0) await LocalNotifications.cancel({ notifications: cancel.map((id) => ({ id })) });
    if (schedule.length > 0) {
      await ensureChannel(channelName);
      await LocalNotifications.schedule({
        notifications: schedule.map((p) => ({
          id: p.id,
          title: p.title,
          body: p.body,
          channelId: CHANNEL_ID,
          schedule: { at: new Date(p.fireAt.year, p.fireAt.month - 1, p.fireAt.day, p.fireAt.hour, p.fireAt.minute), allowWhileIdle: true },
        })),
      });
    }
    return desired.length;
  } catch (err) {
    console.error("Reminder reconciliation failed", err); // never crash the app because of notifications
    return 0;
  }
}
