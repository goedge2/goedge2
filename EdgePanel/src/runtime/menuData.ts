export type EdgeMenuIconKey = "dashboard" | "servers" | "clusters" | "dns" | "admins" | "logs" | "settings";

export type EdgeMenuItem = {
  children?: EdgeMenuItem[];
  iconKey?: EdgeMenuIconKey;
  key?: string;
  locale: string;
  name: string;
  path?: string;
};

export const edgeMenuData: EdgeMenuItem[] = [
  { path: "/", key: "/", locale: "menu.dashboard", name: "数据看板", iconKey: "dashboard" },
  {
    key: "servers",
    locale: "menu.servers.root",
    name: "网站管理",
    iconKey: "servers",
    children: [
      { path: "/servers", locale: "menu.servers.list", name: "网站列表" },
      { path: "/servers/accesslogs", locale: "menu.servers.accessLogs", name: "访问日志" },
      { path: "/servers/groups", locale: "menu.servers.groups", name: "网站分组" },
      { path: "/servers/certs", locale: "menu.servers.certs", name: "证书管理" },
      { path: "/servers/cache-policies", locale: "menu.servers.cachePolicies", name: "缓存策略" },
      { path: "/servers/cache-task", locale: "menu.servers.cacheTask", name: "刷新预热" },
      { path: "/servers/waf/policies", locale: "menu.servers.wafPolicies", name: "WAF策略" },
      { path: "/servers/ip-lists", locale: "menu.servers.ipLists", name: "IP名单" },
      { path: "/servers/metrics", locale: "menu.servers.metrics", name: "统计指标" },
    ],
  },
  {
    key: "clusters",
    locale: "menu.clusters.root",
    name: "集群管理",
    iconKey: "clusters",
    children: [
      { path: "/clusters", locale: "menu.clusters.list", name: "集群列表" },
      { path: "/clusters/nodes", locale: "menu.clusters.nodes", name: "节点列表" },
      { path: "/clusters/node-logs", locale: "menu.clusters.nodeLogs", name: "节点日志" },
      { path: "/clusters/node-regions", locale: "menu.clusters.nodeRegions", name: "节点区域" },
      { path: "/clusters/node-grants", locale: "menu.clusters.nodeGrants", name: "节点SSH" },
      { path: "/clusters/monitor", locale: "menu.clusters.monitor", name: "区域监控" },
    ],
  },
  {
    key: "dns",
    locale: "menu.dns.root",
    name: "域名解析",
    iconKey: "dns",
    children: [{ path: "/dns/providers", locale: "menu.dns.providers", name: "DNS服务商" }],
  },
  {
    key: "admins",
    locale: "menu.admins.root",
    name: "系统用户",
    iconKey: "admins",
    children: [
      { path: "/admins", locale: "menu.admins.list", name: "管理员列表" },
      { path: "/admins/recipients", locale: "menu.admins.recipients", name: "通知媒介" },
    ],
  },
  { path: "/logs", locale: "menu.logs", name: "日志审计", iconKey: "logs" },
  {
    key: "settings",
    locale: "menu.settings.root",
    name: "系统设置",
    iconKey: "settings",
    children: [
      { path: "/settings/ui", locale: "menu.settings.ui", name: "基础设置" },
      { path: "/settings/api-nodes", locale: "menu.settings.apiNodes", name: "高级设置" },
    ],
  },
];
