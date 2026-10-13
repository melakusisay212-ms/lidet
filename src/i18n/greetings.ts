import type { Language } from "../domain/models.ts";

export type GreetingStyle = "warm" | "short" | "formal" | "playful";
export const GREETING_STYLES: readonly GreetingStyle[] = ["warm", "short", "formal", "playful"];

type Template = { named: string; anonymous: string };

/** Bundled locally; works offline. Amharic wording should be reviewed by a native speaker before release. */
const TEMPLATES: Record<Language, Record<GreetingStyle, Template>> = {
  en: {
    warm: { named: "Happy birthday, {name}! Wishing you a year full of joy, good health and everything you hope for. 🎉", anonymous: "Happy birthday! Wishing you a year full of joy, good health and everything you hope for. 🎉" },
    short: { named: "Happy birthday, {name}! 🎂", anonymous: "Happy birthday! 🎂" },
    formal: { named: "Dear {name}, please accept my sincere wishes for a happy birthday and a healthy, prosperous year ahead.", anonymous: "Please accept my sincere wishes for a happy birthday and a healthy, prosperous year ahead." },
    playful: { named: "Another year wiser, {name}! Happy birthday — eat the cake first, ask questions later. 🥳", anonymous: "Another year wiser! Happy birthday — eat the cake first, ask questions later. 🥳" },
  },
  am: {
    warm: { named: "መልካም ልደት {name}! ዓመቱ የደስታ፣ የጤናና የምትመኙት ሁሉ የሚሳካበት ይሁንልዎ። 🎉", anonymous: "መልካም ልደት! ዓመቱ የደስታ፣ የጤናና የምትመኙት ሁሉ የሚሳካበት ይሁንልዎ። 🎉" },
    short: { named: "መልካም ልደት {name}! 🎂", anonymous: "መልካም ልደት! 🎂" },
    formal: { named: "ክቡር {name}፣ መልካም ልደት እየተመኘሁ ዓመቱ የጤናና የብልጽግና እንዲሆንልዎ እመኛለሁ።", anonymous: "መልካም ልደት እየተመኘሁ ዓመቱ የጤናና የብልጽግና እንዲሆንልዎ እመኛለሁ።" },
    playful: { named: "መልካም ልደት {name}! ዕድሜ ጨመረ፣ ጥበብም ጨመረ — ኬክ መጀመሪያ፣ ጥያቄ በኋላ! 🥳", anonymous: "መልካም ልደት! ዕድሜ ጨመረ፣ ጥበብም ጨመረ — ኬክ መጀመሪያ፣ ጥያቄ በኋላ! 🥳" },
  },
};

/** Safe name insertion: trims, and falls back to the anonymous template when the name is missing/blank. */
export function buildGreeting(lang: Language, style: GreetingStyle, name: string | null | undefined): string {
  const t = TEMPLATES[lang][style];
  const clean = (name ?? "").trim();
  return clean ? t.named.split("{name}").join(clean) : t.anonymous;
}
