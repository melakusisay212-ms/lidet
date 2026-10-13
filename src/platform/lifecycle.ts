import { App } from "@capacitor/app";
import { isNative } from "./native.ts";

/** Calls back when the app returns to the foreground (day may have changed, timezone may have changed). */
export function onResume(cb: () => void): () => void {
  if (isNative()) {
    const handle = App.addListener("resume", cb);
    return () => { void handle.then((h) => h.remove()); };
  }
  const listener = () => { if (document.visibilityState === "visible") cb(); };
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

/** Registers the Android hardware/gesture back handler. Return true from cb if handled. */
export function onBackButton(cb: () => boolean): () => void {
  if (!isNative()) return () => {};
  const handle = App.addListener("backButton", () => { if (!cb()) void App.exitApp(); });
  return () => { void handle.then((h) => h.remove()); };
}
