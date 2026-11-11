import assert from "node:assert/strict";
import test from "node:test";
import { getNodeLevel, normalizeNodeLnAddrs } from "./nodeLevel.ts";

test("missing and legacy zero node levels default to edge nodes", () => {
  for (const level of [undefined, 0, -1, 1]) {
    assert.equal(getNodeLevel(level), 1);
  }
});

test("saved L2 node levels are preserved", () => {
  assert.equal(getNodeLevel(2), 2);
});

test("L2 addresses trim blanks and duplicates while preserving IPv4 and IPv6 order", () => {
  const addrs = [" 192.0.2.1 ", "", "2001:db8::1", "192.0.2.1", "  ", "192.0.2.2"];
  const original = [...addrs];
  assert.deepEqual(normalizeNodeLnAddrs(addrs), ["192.0.2.1", "2001:db8::1", "192.0.2.2"]);
  assert.deepEqual(addrs, original);
});

test("cleared and missing L2 addresses produce an explicit empty list", () => {
  for (const addrs of [undefined, [], [" "]]) {
    assert.deepEqual(normalizeNodeLnAddrs(addrs), []);
  }
});
