import type { Language } from "../domain/models.ts";
import { en } from "./en.ts";
import type { MessageKey } from "./en.ts";
import { am } from "./am.ts";
import { interpolate } from "./format.ts";

export type { MessageKey } from "./en.ts";
export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

const DICTS: Record<Language, Record<MessageKey, string>> = { en, am };

export function makeTranslator(lang: Language): Translate {
  const dict = DICTS[lang];
  return (key, params) => interpolate(dict[key] ?? en[key] ?? key, params);
}
