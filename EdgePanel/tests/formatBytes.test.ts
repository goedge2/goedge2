import assert from "node:assert/strict";
import test from "node:test";
import { formatBytesSimple } from "../src/utils/formatBytes.ts";

test("formats sub-byte chart values with the Bytes unit", () => {
  assert.equal(formatBytesSimple(0.8), "0.8 Bytes");
  assert.equal(formatBytesSimple("0.2"), "0.2 Bytes");
});

test("formats zero and invalid values without an undefined unit", () => {
  assert.equal(formatBytesSimple(0), "0 Bytes");
  assert.equal(formatBytesSimple(-1), "0 Bytes");
  assert.equal(formatBytesSimple(Number.NaN), "0 Bytes");
  assert.equal(formatBytesSimple(Number.POSITIVE_INFINITY), "0 Bytes");
});
