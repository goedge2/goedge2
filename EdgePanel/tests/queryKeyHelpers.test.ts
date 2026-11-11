import assert from "node:assert/strict";
import test from "node:test";

import { buildSearchParamsKey, normalizeSearchParams } from "../src/queries/searchParams.ts";

test("normalizeSearchParams sorts keys and preserves duplicate values as arrays", () => {
  const params = new URLSearchParams();
  params.append("b", "2");
  params.append("a", "1");
  params.append("a", "3");

  assert.deepEqual(normalizeSearchParams(params), {
    a: ["1", "3"],
    b: "2",
  });
});

test("buildSearchParamsKey is stable regardless of URLSearchParams insertion order", () => {
  const left = new URLSearchParams();
  left.append("keyword", "edge");
  left.append("page", "2");

  const right = new URLSearchParams();
  right.append("page", "2");
  right.append("keyword", "edge");

  assert.deepEqual(buildSearchParamsKey(["servers", "list"], left), buildSearchParamsKey(["servers", "list"], right));
});
