import { Capacitor } from "@capacitor/core";
import { BrowserRepository } from "./browser-repository.ts";
import type { Repository } from "./repository.ts";

export type { Repository } from "./repository.ts";

/** SQLite on a native device; browser storage on the web. If SQLite fails, fall back and tell the UI via warnings. */
export async function createRepository(): Promise<Repository> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { SqliteRepository } = await import("./sqlite-repository.ts");
      return await SqliteRepository.open();
    } catch (err) {
      console.error("SQLite unavailable, falling back to browser storage", err);
      const fallback = new BrowserRepository(window.localStorage, "browser-fallback");
      fallback.warnings.push("sqlite_unavailable");
      return fallback;
    }
  }
  return new BrowserRepository(window.localStorage, "browser");
}
