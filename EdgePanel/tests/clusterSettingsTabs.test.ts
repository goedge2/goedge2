import test from "node:test";
import assert from "node:assert/strict";

import { clusterSettingsTabItems, nodeSettingsTabItems } from "../src/pages/clusters/settingsTabItems.ts";

test("cluster settings tabs expose threshold and message management", () => {
  assert.deepEqual(
    clusterSettingsTabItems.map((item) => item.key),
    ["basic", "dns", "health", "global", "cache-waf", "webp-http3", "schedule", "threshold", "msg"],
  );
});

test("node settings tabs expose threshold management between schedule and ssh", () => {
  assert.deepEqual(
    nodeSettingsTabItems.map((item) => item.key),
    ["basic", "dns", "cache", "ddos", "schedule", "threshold", "ssh", "system"],
  );
});
