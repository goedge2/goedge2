import assert from "node:assert/strict";
import test from "node:test";

import { getNodeTaskStatus, getNodeTaskTypeLabel } from "./nodeTaskPresentation.ts";

test("node task types match the legacy popup labels", () => {
  const types = {
    configChanged: "同步配置",
    globalServerConfigChanged: "同步配置",
    ipItemChanged: "同步IP名单",
    scriptsChanged: "同步脚本",
    nodeLevelChanged: "同步L2节点",
    ddosProtectionChanged: "DDoS配置",
    userServersStateChanged: "用户网站状态",
  };
  for (const [type, label] of Object.entries(types)) {
    assert.equal(getNodeTaskTypeLabel(type), label);
  }
});

test("IP list deletion tasks hide their encoded parameters", () => {
  assert.equal(getNodeTaskTypeLabel("ipListDeleted"), "删除IP名单");
  assert.equal(getNodeTaskTypeLabel('ipListDeleted@{"listId":123}'), "删除IP名单");
});

test("current node runtime task types have readable labels", () => {
  const types = {
    nodeVersionChanged: "同步节点版本",
    uamPolicyChanged: "UAM策略",
    httpPagesPolicyChanged: "自定义页面",
    httpCCPolicyChanged: "CC防护策略",
    http3PolicyChanged: "HTTP/3配置",
    networkSecurityPolicyChanged: "网络安全策略",
    webPPolicyChanged: "WebP配置",
    updatingServers: "更新网站",
    plusChanged: "同步扩展配置",
    toaChanged: "TOA配置",
  };
  for (const [type, label] of Object.entries(types)) {
    assert.equal(getNodeTaskTypeLabel(type), label);
  }
});

test("unknown task types remain visible", () => {
  assert.equal(getNodeTaskTypeLabel("customTask"), "customTask");
  assert.equal(getNodeTaskTypeLabel(""), "未知任务");
  assert.equal(getNodeTaskTypeLabel("constructor"), "constructor");
});

test("pending tasks remain syncing, including blank error strings", () => {
  assert.deepEqual(getNodeTaskStatus({ isDone: false, isOk: false, error: "" }), { text: "同步中", color: "processing" });
  assert.deepEqual(getNodeTaskStatus({ isDone: false, isOk: false, error: "  " }), { text: "同步中", color: "processing" });
});

test("failed tasks retain multiline errors in their status", () => {
  const error = "配置同步失败\nrpc error: timeout";
  assert.deepEqual(getNodeTaskStatus({ isDone: true, isOk: false, error }), { text: "失败", color: "error", error });
  assert.deepEqual(getNodeTaskStatus({ isDone: false, isOk: false, error }), { text: "失败", color: "error", error });
});

test("completed failed tasks without errors do not appear to be syncing", () => {
  assert.deepEqual(getNodeTaskStatus({ isDone: true, isOk: false, error: "" }), {
    text: "失败",
    color: "error",
    error: "同步失败，未返回错误信息",
  });
});

test("completed successful tasks do not show stale errors", () => {
  assert.deepEqual(getNodeTaskStatus({ isDone: true, isOk: true, error: "old error" }), { text: "成功", color: "success" });
});
