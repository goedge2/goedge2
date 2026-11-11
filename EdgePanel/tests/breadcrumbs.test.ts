import test from "node:test";
import assert from "node:assert/strict";

import { getClusterTabList } from "../src/pages/clusters/_shared/clusterTabList.ts";
import { getNodeTabList } from "../src/pages/clusters/_shared/nodeTabList.ts";
import { getServerTabList } from "../src/pages/servers/_shared/serverTabList.ts";
import { advSettingTabList } from "../src/pages/settings/_shared/advSettingTabList.ts";
import { buildPageBreadcrumb, resolveTabBreadcrumbLabel } from "../src/runtime/breadcrumbs.ts";

function simplifyBreadcrumb(pathname: string, options: Parameters<typeof buildPageBreadcrumb>[0] = { pathname }) {
  return (buildPageBreadcrumb({ pathname, ...options }).items ?? []).map((item) => ({
    title: String(item.title ?? ""),
    href: item.href,
  }));
}

test("buildPageBreadcrumb resolves static menu routes", () => {
  assert.deepEqual(simplifyBreadcrumb("/servers"), [
    { title: "网站管理", href: "#/servers" },
    { title: "网站列表", href: undefined },
  ]);
});

test("buildPageBreadcrumb resolves notification media tabs under admins", () => {
  assert.deepEqual(
    simplifyBreadcrumb("/admins/recipients/media", {
      pathname: "/admins/recipients/media",
      tabList: [
        { key: "/admins/recipients", tab: "接收人" },
        { key: "/admins/recipients/groups", tab: "接收人分组" },
        { key: "/admins/recipients/media", tab: "媒介" },
        { key: "/admins/recipients/logs", tab: "发送记录" },
        { key: "/admins/recipients/tasks", tab: "任务队列" },
      ],
    }),
    [
      { title: "系统用户", href: "#/admins" },
      { title: "通知媒介", href: "#/admins/recipients" },
      { title: "媒介", href: undefined },
    ],
  );
});

test("buildPageBreadcrumb resolves create routes from the shared route registry", () => {
  assert.deepEqual(simplifyBreadcrumb("/servers/create"), [
    { title: "网站管理", href: "#/servers" },
    { title: "网站列表", href: "#/servers" },
    { title: "创建网站", href: undefined },
  ]);
});

test("buildPageBreadcrumb uses tab labels and entity names for server pages", () => {
  assert.deepEqual(
    simplifyBreadcrumb("/servers/123/settings", {
      pathname: "/servers/123/settings",
      entityName: "example.com",
      fallbackEntityLabel: "网站",
      tabList: getServerTabList("123"),
    }),
    [
      { title: "网站管理", href: "#/servers" },
      { title: "网站列表", href: "#/servers" },
      { title: "example.com", href: undefined },
      { title: "网站设置", href: undefined },
    ],
  );
});

test("buildPageBreadcrumb uses tab labels and entity names for cluster pages", () => {
  assert.deepEqual(
    simplifyBreadcrumb("/clusters/88/nodes", {
      pathname: "/clusters/88/nodes",
      entityName: "Beijing Cluster",
      fallbackEntityLabel: "集群",
      tabList: getClusterTabList("88"),
    }),
    [
      { title: "集群管理", href: "#/clusters" },
      { title: "集群列表", href: "#/clusters" },
      { title: "Beijing Cluster", href: undefined },
      { title: "节点列表", href: undefined },
    ],
  );
});

test("buildPageBreadcrumb uses node tabs for node detail pages", () => {
  assert.deepEqual(
    simplifyBreadcrumb("/clusters/nodes/7/details", {
      pathname: "/clusters/nodes/7/details",
      entityName: "edge-node-01",
      fallbackEntityLabel: "节点",
      tabList: getNodeTabList("7"),
    }),
    [
      { title: "集群管理", href: "#/clusters" },
      { title: "节点列表", href: "#/clusters/nodes" },
      { title: "edge-node-01", href: undefined },
      { title: "节点详情", href: undefined },
    ],
  );
});

test("buildPageBreadcrumb resolves dns provider detail pages", () => {
  assert.deepEqual(
    simplifyBreadcrumb("/dns/provider/5/domains", {
      pathname: "/dns/provider/5/domains",
      entityName: "Cloudflare",
      fallbackEntityLabel: "DNS服务商",
      currentLabel: "DNS域名管理",
    }),
    [
      { title: "域名解析", href: "#/dns/providers" },
      { title: "DNS服务商", href: "#/dns/providers" },
      { title: "Cloudflare", href: undefined },
      { title: "DNS域名管理", href: undefined },
    ],
  );
});

test("buildPageBreadcrumb resolves advanced settings tabs under the advanced settings parent", () => {
  assert.deepEqual(
    simplifyBreadcrumb("/settings/api-nodes", {
      pathname: "/settings/api-nodes",
      tabList: advSettingTabList,
    }),
    [
      { title: "系统设置", href: "#/settings/ui" },
      { title: "高级设置", href: "#/settings/api-nodes" },
      { title: "API节点", href: undefined },
    ],
  );
});

test("buildPageBreadcrumb resolves ssh grant details with the current entity name", () => {
  assert.deepEqual(
    simplifyBreadcrumb("/clusters/node-grants/11", {
      pathname: "/clusters/node-grants/11",
      entityName: "Prod SSH",
      fallbackEntityLabel: "SSH认证",
      currentLabel: "SSH认证详情",
    }),
    [
      { title: "集群管理", href: "#/clusters" },
      { title: "节点SSH", href: "#/clusters/node-grants" },
      { title: "Prod SSH", href: undefined },
      { title: "SSH认证详情", href: undefined },
    ],
  );
});

test("buildPageBreadcrumb falls back to a non-empty entity label while data is loading", () => {
  assert.deepEqual(
    simplifyBreadcrumb("/servers/123/settings", {
      pathname: "/servers/123/settings",
      fallbackEntityLabel: "网站",
      tabList: getServerTabList("123"),
    }).map((item) => item.title),
    ["网站管理", "网站列表", "网站", "网站设置"],
  );
});

test("resolveTabBreadcrumbLabel matches exact and nested tab paths", () => {
  assert.equal(resolveTabBreadcrumbLabel(getServerTabList("1"), "/servers/1/settings"), "网站设置");
  assert.equal(
    resolveTabBreadcrumbLabel(
      [
        { tab: "刷新缓存", key: "/servers/cache-task" },
        { tab: "预热缓存", key: "/servers/cache-task/fetch" },
      ],
      "/servers/cache-task/fetch/logs",
    ),
    "预热缓存",
  );
});
