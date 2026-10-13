import { Share } from "@capacitor/share";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { isNative } from "./native.ts";

export type ActionResult = "ok" | "cancelled" | "unavailable";

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

/** Hands the text to the Android share sheet. Never sends anything by itself. */
export async function shareText(text: string, title: string): Promise<ActionResult> {
  try {
    if (isNative()) {
      const can = await Share.canShare();
      if (!can.value) return "unavailable";
      await Share.share({ text, dialogTitle: title });
      return "ok";
    }
    if (navigator.share) { await navigator.share({ text, title }); return "ok"; }
    return "unavailable";
  } catch (err) {
    return /cancel|abort/i.test(String(err)) ? "cancelled" : "unavailable";
  }
}

/** Opens the default SMS app with the text prefilled. The user presses send; Lidet never sends SMS itself. */
export function openSms(text: string): ActionResult {
  try {
    window.location.href = `sms:?body=${encodeURIComponent(text)}`;
    return "ok";
  } catch { return "unavailable"; }
}

/** Offers a JSON export through the share sheet (native) or a file download (web). */
export async function exportJsonFile(filename: string, json: string, title: string): Promise<ActionResult> {
  try {
    if (isNative()) {
      const written = await Filesystem.writeFile({ path: filename, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
      await Share.share({ title, url: written.uri, dialogTitle: title });
      return "ok";
    }
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "ok";
  } catch (err) {
    return /cancel|abort/i.test(String(err)) ? "cancelled" : "unavailable";
  }
}
