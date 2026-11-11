import test from "node:test";
import assert from "node:assert/strict";

import {
  getDNSDomainSelectorChangeAction,
  getDNSDomainSelectorSyncAction,
  type DNSDomainSelectorSyncState,
} from "../src/components/dnsDomainSelectorState.ts";

const buildState = (overrides: Partial<DNSDomainSelectorSyncState> = {}): DNSDomainSelectorSyncState => ({
  value: undefined,
  internalValue: [],
  domainName: undefined,
  ...overrides,
});

test("dns domain selector stays idle when the field is already cleared", () => {
  assert.deepEqual(getDNSDomainSelectorSyncAction(buildState()), { type: "noop" });
});

test("dns domain selector clears internal state exactly once when the field becomes empty", () => {
  assert.deepEqual(getDNSDomainSelectorSyncAction(buildState({ internalValue: [12, 34], domainName: "example.com" })), { type: "clear" });
});

test("dns domain selector keeps the provider-only intermediate path while waiting for a domain", () => {
  assert.deepEqual(getDNSDomainSelectorSyncAction(buildState({ internalValue: [12] })), { type: "noop" });
});

test("dns domain selector skips refetch when the current path already matches the selected domain", () => {
  assert.deepEqual(getDNSDomainSelectorSyncAction(buildState({ value: 34, internalValue: [12, 34], domainName: "example.com" })), { type: "noop" });
});

test("dns domain selector skips refetch when protobuf ids arrive as bigint values", () => {
  assert.deepEqual(getDNSDomainSelectorSyncAction(buildState({ value: 34n, internalValue: [12, 34], domainName: "example.com" })), { type: "noop" });
});

test("dns domain selector requests domain details when a new domain id must be synchronized", () => {
  assert.deepEqual(getDNSDomainSelectorSyncAction(buildState({ value: 56, internalValue: [12, 34], domainName: "example.com" })), {
    type: "load",
    domainId: 56,
  });
});

test("dns domain selector treats provider-only changes as an intermediate step", () => {
  assert.deepEqual(
    getDNSDomainSelectorChangeAction({
      valuePath: [12],
      selectedValue: 12,
      selectedLabel: "Provider A",
      isLeaf: false,
    }),
    { type: "intermediate" },
  );
});

test("dns domain selector only commits after the user selects a domain leaf", () => {
  assert.deepEqual(
    getDNSDomainSelectorChangeAction({
      valuePath: [12, 34],
      selectedValue: 34,
      selectedLabel: "example.com",
      isLeaf: true,
    }),
    { type: "commit", domainId: 34, domainName: "example.com" },
  );
});

test("dns domain selector clears external state only when the selection is emptied", () => {
  assert.deepEqual(
    getDNSDomainSelectorChangeAction({
      valuePath: [],
      selectedValue: undefined,
      selectedLabel: undefined,
      isLeaf: false,
    }),
    { type: "clear" },
  );
});
