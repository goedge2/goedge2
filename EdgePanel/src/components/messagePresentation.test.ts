import assert from "node:assert/strict";
import test from "node:test";

import { decodeMessageParams, getHealthCheckFailures, getMessageParameterID, getMessagePresentation } from "./messagePresentation.ts";

test("message presentation uses a known message type label", () => {
  assert.deepEqual(getMessagePresentation("HealthCheckFailed", "error", "健康检查失败"), {
    title: "健康检查失败",
    typeLabel: "健康检查",
    levelLabel: "错误",
    levelStatus: "error",
  });
});

test("message presentation falls back to an unknown type and body preview", () => {
  assert.deepEqual(getMessagePresentation("CustomAlert", "info", "第一行\n第二行"), {
    title: "CustomAlert",
    typeLabel: "CustomAlert",
    levelLabel: "信息",
    levelStatus: "info",
  });
  assert.deepEqual(getMessagePresentation("", "info", "第一行\n第二行"), {
    title: "第一行",
    typeLabel: "系统消息",
    levelLabel: "信息",
    levelStatus: "info",
  });
});

test("message parameters decode from bytes and base64 strings", () => {
  const value = [{ node: { id: 12, name: "edge-a" }, nodeAddr: "203.0.113.10", error: "timeout" }];
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  const base64 = Buffer.from(json).toString("base64");

  assert.deepEqual(decodeMessageParams(bytes), value);
  assert.deepEqual(decodeMessageParams(base64), value);
  assert.deepEqual(decodeMessageParams("not-json"), undefined);
});

test("health check failures retain node details and discard invalid rows", () => {
  const failures = getHealthCheckFailures([
    { node: { id: 12, name: "edge-a" }, nodeAddr: "203.0.113.10", error: "timeout" },
    { node: { id: 0, name: "missing" }, error: "ignored" },
  ]);

  assert.deepEqual(failures, [{ nodeId: "12", nodeName: "edge-a", nodeAddr: "203.0.113.10", error: "timeout" }]);
});

test("message parameter IDs accept only positive identifiers", () => {
  assert.equal(getMessageParameterID({ serverId: 42 }, "serverId"), "42");
  assert.equal(getMessageParameterID({ serverId: "0" }, "serverId"), undefined);
  assert.equal(getMessageParameterID({ serverId: "invalid" }, "serverId"), undefined);
});
