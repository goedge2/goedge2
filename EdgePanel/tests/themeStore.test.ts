import assert from "node:assert/strict";
import test from "node:test";

import { normalizeThemeMode, resolveThemeIsDark } from "../src/stores/themeStore.ts";

test("normalizeThemeMode preserves canonical theme modes", () => {
  assert.equal(normalizeThemeMode("light"), "light");
  assert.equal(normalizeThemeMode("dark"), "dark");
  assert.equal(normalizeThemeMode("auto"), "auto");
});

test("normalizeThemeMode migrates legacy boolean storage values", () => {
  assert.equal(normalizeThemeMode("true"), "dark");
  assert.equal(normalizeThemeMode("false"), "light");
});

test("normalizeThemeMode falls back to auto for missing or invalid values", () => {
  assert.equal(normalizeThemeMode(null), "auto");
  assert.equal(normalizeThemeMode("system"), "auto");
});

test("resolveThemeIsDark honors explicit modes and system preference for auto", () => {
  assert.equal(resolveThemeIsDark("light", true), false);
  assert.equal(resolveThemeIsDark("dark", false), true);
  assert.equal(resolveThemeIsDark("auto", false), false);
  assert.equal(resolveThemeIsDark("auto", true), true);
});
