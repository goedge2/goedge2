import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClusterMessageReceiverPayload,
  decodeThresholdValue,
  encodeThresholdValue,
  findSettingsTabByKey,
  normalizeEmptyRootObjectsForSubmit,
  shouldForceRenderSettingsTab,
} from "../src/pages/clusters/settingsHelpers.ts";
import { clusterSettingsTabItems, nodeSettingsTabItems } from "../src/pages/clusters/settingsTabItems.ts";

test("independent settings tabs are marked so page footer can stay hidden", () => {
  assert.equal(findSettingsTabByKey(clusterSettingsTabItems, "schedule")?.independent, true);
  assert.equal(findSettingsTabByKey(clusterSettingsTabItems, "threshold")?.independent, true);
  assert.equal(findSettingsTabByKey(clusterSettingsTabItems, "msg")?.independent, true);
  assert.equal(findSettingsTabByKey(nodeSettingsTabItems, "dns")?.independent, false);
  assert.equal(findSettingsTabByKey(nodeSettingsTabItems, "schedule")?.independent, true);
  assert.equal(findSettingsTabByKey(nodeSettingsTabItems, "threshold")?.independent, true);
  assert.equal(findSettingsTabByKey(clusterSettingsTabItems, "basic")?.independent, false);
});

test("only independent settings tabs skip force render", () => {
  assert.equal(shouldForceRenderSettingsTab(findSettingsTabByKey(clusterSettingsTabItems, "basic")), true);
  assert.equal(shouldForceRenderSettingsTab(findSettingsTabByKey(clusterSettingsTabItems, "schedule")), false);
  assert.equal(shouldForceRenderSettingsTab(findSettingsTabByKey(clusterSettingsTabItems, "threshold")), false);
  assert.equal(shouldForceRenderSettingsTab(findSettingsTabByKey(clusterSettingsTabItems, "msg")), false);
  assert.equal(shouldForceRenderSettingsTab(findSettingsTabByKey(nodeSettingsTabItems, "dns")), true);
  assert.equal(shouldForceRenderSettingsTab(findSettingsTabByKey(nodeSettingsTabItems, "schedule")), false);
  assert.equal(shouldForceRenderSettingsTab(findSettingsTabByKey(nodeSettingsTabItems, "threshold")), false);
});

test("threshold values round-trip through grpc-gateway bytes encoding", () => {
  const encoded = encodeThresholdValue("85");

  assert.equal(encoded, "Ijg1Ig==");
  assert.equal(decodeThresholdValue(encoded), "85");
});

test("threshold values decode from either base64 strings or byte arrays", () => {
  assert.equal(decodeThresholdValue(new Uint8Array([34, 49, 50, 51, 34])), "123");
  assert.equal(decodeThresholdValue(undefined), "");
});

test("cluster message payload stores all selections under the unified wildcard channel", () => {
  assert.deepEqual(
    buildClusterMessageReceiverPayload("42", [
      { type: "recipient", id: "8" },
      { type: "group", id: "15" },
      { type: "unknown", id: "99" },
    ]),
    {
      role: "node",
      nodeClusterId: 42,
      nodeId: 0,
      serverId: 0,
      paramsJSON: "",
      recipientOptions: {
        "*": {
          recipientOptions: [
            { messageRecipientId: 8, messageRecipientGroupId: 0 },
            { messageRecipientId: 0, messageRecipientGroupId: 15 },
          ],
        },
      },
    },
  );
});

test("normalizes empty objects at root form paths without changing other values", () => {
  const values = {
    healthCheck: {},
    webpPolicy: {},
    name: "cluster",
    enabled: false,
    ports: [],
    globalServerConfig: { httpAll: { matchDomainStrictly: false } },
  };

  assert.deepEqual(normalizeEmptyRootObjectsForSubmit(values), {
    healthCheck: null,
    webpPolicy: null,
    name: "cluster",
    enabled: false,
    ports: [],
    globalServerConfig: { httpAll: { matchDomainStrictly: false } },
  });
});

test("normalizes root objects that only contain undefined or empty objects", () => {
  const values = {
    healthCheck: { isOn: undefined, url: undefined },
    ddosProtection: { tcp: { isOn: undefined } },
    http3Policy: { isOn: false, port: 0 },
  };

  assert.deepEqual(normalizeEmptyRootObjectsForSubmit(values), {
    healthCheck: null,
    ddosProtection: null,
    http3Policy: { isOn: false, port: 0 },
  });
});
