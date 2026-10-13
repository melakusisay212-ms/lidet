import { test } from "node:test";
import assert from "node:assert/strict";
import { THEMES, THEME_FAMILIES } from "../src/design-system/tokens.ts";
import type { Tokens } from "../src/design-system/tokens.ts";
import { contrast, mix } from "../src/design-system/contrast.ts";

const each = (fn: (name: string, t: Tokens) => void) => {
  for (const f of THEME_FAMILIES) for (const a of ["light", "dark"] as const) fn(`${f}/${a}`, THEMES[f][a]);
};
const ratio = (name: string, a: string, b: string, min: number, label: string) =>
  assert.ok(contrast(a, b) >= min, `${name}: ${label} ${a} on ${b} = ${contrast(a, b).toFixed(2)} (< ${min})`);

test("5 families x light/dark all defined with every semantic token", () => {
  assert.equal(THEME_FAMILIES.length, 5);
  const keys = Object.keys(THEMES.signature.light).sort();
  each((name, t) => assert.deepEqual(Object.keys(t).sort(), keys, name));
});

test("body text >= 4.5:1 on background, surface and surfaceSecondary (secondary text too)", () => {
  each((n, t) => {
    for (const bg of [t.background, t.surface, t.surfaceSecondary]) {
      ratio(n, t.textPrimary, bg, 7, "textPrimary");
      ratio(n, t.textSecondary, bg, 4.5, "textSecondary");
    }
  });
});

test("primary: usable as text/link on surfaces AND as a button fill with onPrimary label (>= 4.5:1)", () => {
  each((n, t) => {
    ratio(n, t.primary, t.background, 4.5, "primary as text/bg");
    ratio(n, t.primary, t.surface, 4.5, "primary as text/surface");
    ratio(n, t.onPrimary, t.primary, 4.5, "onPrimary label");
    ratio(n, t.onPrimary, t.primaryPressed, 4.5, "onPrimary label pressed");
  });
});

test("category and status colours are legible (>= 4.5:1) on surface and background", () => {
  each((n, t) => {
    for (const k of ["birthday", "holiday", "fasting", "event", "success", "warning", "error"] as const) {
      ratio(n, t[k], t.surface, 4.5, k);
      ratio(n, t[k], t.background, 4.5, k);
    }
    ratio(n, t.focusRing, t.background, 3, "focusRing (non-text)");
  });
});

test("category colours are distinct from each other within every theme (not colour alone, but still distinguishable)", () => {
  each((n, t) => {
    const cats = [t.birthday, t.holiday, t.fasting, t.event];
    assert.equal(new Set(cats).size, cats.length, `${n} category colours collide`);
  });
});

test("composite surfaces used in base.css keep text legible (hero, today hero, avatar, danger, chips, secondary button)", () => {
  each((n, t) => {
    // .hero: gradient primary -> primaryPressed with onPrimary text (both ends checked)
    ratio(n, t.onPrimary, t.primary, 4.5, "hero start");
    ratio(n, t.onPrimary, t.primaryPressed, 4.5, "hero end");
    // .hero.today and .avatar.today: surface-coloured text on the birthday fill
    ratio(n, t.surface, t.birthday, 4.5, "today hero / avatar text");
    // .btn-danger: surface text on error fill
    ratio(n, t.surface, t.error, 4.5, "danger button");
    // .chip[aria-pressed] and .btn-secondary: primary text on a primary tint over surface
    ratio(n, t.primary, mix(t.primary, 14, t.surface), 4.5, "selected chip");
    ratio(n, t.primary, mix(t.primary, 12, t.surface), 4.5, "secondary button");
    ratio(n, t.primary, mix(t.primary, 16, t.surface), 4.5, "avatar initials");
    // error banner text (primary text colour) on error tint
    ratio(n, t.textPrimary, mix(t.error, 10, t.surface), 7, "error banner text");
    // toast: background-coloured text on textPrimary fill
    ratio(n, t.background, t.textPrimary, 7, "toast");
  });
});
