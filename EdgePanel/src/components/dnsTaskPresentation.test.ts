import assert from "node:assert/strict";
import test from "node:test";

import { getDNSTaskPresentation, getDNSTaskStatus } from "./dnsTaskPresentation.ts";

test("DNS task types match all legacy popup labels and select the correct object", () => {
  const objects = {
    nodeCluster: { id: "2", name: "演示集群" },
    node: { id: "6", name: "edge-node" },
    server: { id: "34", name: "演示网站" },
    dnsDomain: { id: "8", name: "example.com" },
  };
  const cases = [
    ["clusterChange", "集群", "演示集群", "/clusters/2/dashboard"],
    ["clusterNodesChange", "集群", "演示集群", "/clusters/2/dashboard"],
    ["clusterRemoveDomain", "集群", "演示集群", "/clusters/2/dashboard"],
    ["nodeChange", "节点", "edge-node", "/clusters/nodes/6/details"],
    ["serverChange", "网站", "演示网站", "/servers/34/settings"],
    ["domainChange", "域名", "example.com", undefined],
  ];
  for (const [type, typeLabel, targetName, targetLink] of cases) {
    const result = getDNSTaskPresentation({ type: type!, ...objects });
    assert.equal(result.typeLabel, typeLabel);
    assert.equal(result.targetName, targetName);
    assert.equal(result.targetLink, targetLink);
  }
});

test("cluster DNS tasks distinguish their synchronization actions", () => {
  assert.equal(getDNSTaskPresentation({ type: "clusterChange" }).action, "同步集群 DNS 配置");
  assert.equal(getDNSTaskPresentation({ type: "clusterNodesChange" }).action, "同步集群节点记录");
  assert.equal(getDNSTaskPresentation({ type: "clusterRemoveDomain" }).action, "移除集群域名记录");
});

test("DNS object links support gateway string IDs and bigint IDs without precision loss", () => {
  for (const id of [6, "6", 6n]) {
    assert.equal(getDNSTaskPresentation({ type: "nodeChange", node: { id } }).targetLink, "/clusters/nodes/6/details");
  }
  assert.equal(
    getDNSTaskPresentation({ type: "serverChange", server: { id: "9223372036854775807" } }).targetLink,
    "/servers/9223372036854775807/settings",
  );
});

test("missing object names fall back to their type and ID", () => {
  assert.equal(getDNSTaskPresentation({ type: "nodeChange", node: { id: "6", name: "  " } }).targetName, "节点 #6");
  assert.equal(getDNSTaskPresentation({ type: "clusterChange", nodeCluster: null }).targetName, "未知集群");
  assert.equal(getDNSTaskPresentation({ type: "domainChange" }).targetName, "未知域名");
});

test("invalid or absent DNS object IDs do not produce broken links", () => {
  for (const id of [undefined, "", "0", 0n, "-1", -1, "invalid", "1/other", "1?tab=other"]) {
    assert.equal(getDNSTaskPresentation({ type: "nodeChange", node: { id, name: "edge-node" } }).targetLink, undefined);
  }
});

test("unknown task types remain visible without selecting an unrelated object", () => {
  assert.deepEqual(getDNSTaskPresentation({ type: "customTask", node: { id: "6", name: "unrelated" } }), {
    typeLabel: "customTask",
    targetName: "未知对象",
  });
  assert.equal(getDNSTaskPresentation({ type: "" }).typeLabel, "未知任务");
  assert.equal(getDNSTaskPresentation({ type: "constructor" }).typeLabel, "constructor");
});

test("completed failed DNS tasks retain multiline errors instead of showing success", () => {
  const error = "解析同步失败\nAPI response error: Incorrect record line";
  assert.deepEqual(getDNSTaskStatus({ isDone: true, isOk: false, error }), { text: "失败", color: "error", error });
  assert.deepEqual(getDNSTaskStatus({ isDone: false, isOk: false, error }), { text: "失败", color: "error", error });
});

test("completed failed DNS tasks without an error still show failure", () => {
  assert.deepEqual(getDNSTaskStatus({ isDone: true, isOk: false, error: "  " }), {
    text: "失败",
    color: "error",
    error: "同步失败，未返回错误信息",
  });
});

test("pending DNS tasks show syncing, not success", () => {
  assert.deepEqual(getDNSTaskStatus({ isDone: false, isOk: false, error: "" }), { text: "同步中", color: "processing" });
  assert.deepEqual(getDNSTaskStatus({ isDone: false, isOk: true, error: "  " }), { text: "同步中", color: "processing" });
});

test("completed successful DNS tasks hide stale errors", () => {
  assert.deepEqual(getDNSTaskStatus({ isDone: true, isOk: true, error: "stale error" }), { text: "成功", color: "success" });
});
