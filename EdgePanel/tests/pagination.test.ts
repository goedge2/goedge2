import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PAGE_SIZE_FALLBACK,
  getPageSize,
  normalizeDefaultPageSize,
  withDefaultPageSize,
} from "../src/services/pagination.ts";

test("normalizeDefaultPageSize falls back to 20 for invalid ui config values", () => {
  assert.equal(DEFAULT_PAGE_SIZE_FALLBACK, 20);
  assert.equal(normalizeDefaultPageSize(undefined), 20);
  assert.equal(normalizeDefaultPageSize(0), 20);
  assert.equal(normalizeDefaultPageSize(-1), 20);
  assert.equal(normalizeDefaultPageSize(101), 20);
  assert.equal(normalizeDefaultPageSize("12"), 12);
});

test("withDefaultPageSize injects a normalized default size when the URL does not set one", () => {
  const params = new URLSearchParams({ page: "2", keyword: "edge" });

  const next = withDefaultPageSize(params, 50);

  assert.equal(next.get("page"), "2");
  assert.equal(next.get("keyword"), "edge");
  assert.equal(next.get("size"), "50");
});

test("getPageSize preserves an explicit URL size instead of overriding it with the ui default", () => {
  const params = new URLSearchParams({ page: "1", size: "80" });

  assert.equal(getPageSize(params, 50), 80);
  assert.equal(withDefaultPageSize(params, 50).get("size"), "80");
});
