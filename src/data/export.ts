import type { AppData } from "../domain/models.ts";
import { validateAppData } from "./validate.ts";

export const DATA_FORMAT_VERSION = 1;

export function serializeExport(data: AppData, now: Date = new Date()): string {
  return JSON.stringify({ app: "lidet", formatVersion: DATA_FORMAT_VERSION, exportedAt: now.toISOString(), data }, null, 2);
}

export type ImportResult = { ok: true; data: AppData } | { ok: false; reason: "not_json" | "wrong_app" | "newer_version" | "invalid" };

/** Validate-then-apply: nothing is written unless the whole file is valid. */
export function parseExport(text: string): ImportResult {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, reason: "not_json" }; }
  if (typeof raw !== "object" || raw === null) return { ok: false, reason: "invalid" };
  const r = raw as Record<string, unknown>;
  if (r.app !== "lidet") return { ok: false, reason: "wrong_app" };
  if (typeof r.formatVersion !== "number" || r.formatVersion > DATA_FORMAT_VERSION) return { ok: false, reason: "newer_version" };
  const data = validateAppData(r.data);
  return data ? { ok: true, data } : { ok: false, reason: "invalid" };
}
