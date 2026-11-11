import type { BreadcrumbProps } from "antd";

import { edgeMenuData, type EdgeMenuItem } from "./menuData.ts";

export type BreadcrumbItemDef = {
  label: string;
  path?: string;
  clickable?: boolean;
};

export type BreadcrumbContext = {
  pathname: string;
  entityName?: string;
  currentLabel?: string;
  fallbackEntityLabel?: string;
  tabList?: readonly BreadcrumbTabItem[];
};

type BreadcrumbTabItem = {
  key?: string;
  label?: string;
  tab?: string;
};

type BreadcrumbTemplate = {
  match: RegExp;
  items: BreadcrumbItemDef[];
  includeEntity?: boolean;
  defaultCurrentLabel?: string;
};

type RootMenuKey = "admins" | "clusters" | "dns" | "servers" | "settings";

const rootMenuItems = new Map<RootMenuKey, EdgeMenuItem>();
const menuItemsByPath = new Map<string, EdgeMenuItem>();

for (const item of edgeMenuData) {
  if (item.key) {
    rootMenuItems.set(item.key as RootMenuKey, item);
  }
  if (item.path) {
    menuItemsByPath.set(item.path, item);
  }
  for (const child of item.children ?? []) {
    if (child.path) {
      menuItemsByPath.set(child.path, child);
    }
  }
}

function getRootMenuItem(key: RootMenuKey): EdgeMenuItem {
  const item = rootMenuItems.get(key);
  if (!item) {
    throw new Error(`Missing root menu item for ${key}`);
  }
  return item;
}

function getMenuItemByPath(path: string): EdgeMenuItem {
  const item = menuItemsByPath.get(path);
  if (!item) {
    throw new Error(`Missing menu item for ${path}`);
  }
  return item;
}

function getRootMenuPath(key: RootMenuKey): string {
  const item = getRootMenuItem(key);
  if (item.path) {
    return item.path;
  }
  const firstChildPath = item.children?.[0]?.path;
  if (!firstChildPath) {
    throw new Error(`Missing navigation path for root menu ${key}`);
  }
  return firstChildPath;
}

function rootItem(key: RootMenuKey): BreadcrumbItemDef {
  return {
    label: getRootMenuItem(key).name,
    path: getRootMenuPath(key),
    clickable: true,
  };
}

function menuItem(path: string, clickable = false): BreadcrumbItemDef {
  return {
    label: getMenuItemByPath(path).name,
    path: clickable ? path : undefined,
    clickable,
  };
}

const breadcrumbTemplates: BreadcrumbTemplate[] = [
  {
    match: /^\/$/,
    items: [{ label: getMenuItemByPath("/").name }],
  },
  {
    match: /^\/servers$/,
    items: [rootItem("servers"), menuItem("/servers")],
  },
  {
    match: /^\/servers\/create$/,
    items: [rootItem("servers"), menuItem("/servers", true)],
    defaultCurrentLabel: "创建网站",
  },
  {
    match: /^\/servers\/accesslogs$/,
    items: [rootItem("servers"), menuItem("/servers/accesslogs")],
  },
  {
    match: /^\/servers\/groups$/,
    items: [rootItem("servers"), menuItem("/servers/groups")],
  },
  {
    match: /^\/servers\/certs$/,
    items: [rootItem("servers"), menuItem("/servers/certs")],
  },
  {
    match: /^\/servers\/cache-policies$/,
    items: [rootItem("servers"), menuItem("/servers/cache-policies")],
  },
  {
    match: /^\/servers\/cache-policies\/[^/]+$/,
    items: [rootItem("servers"), menuItem("/servers/cache-policies", true)],
    includeEntity: true,
    defaultCurrentLabel: "编辑缓存策略",
  },
  {
    match: /^\/servers\/cache-task(?:\/.*)?$/,
    items: [rootItem("servers"), menuItem("/servers/cache-task", true)],
    defaultCurrentLabel: "刷新缓存",
  },
  {
    match: /^\/servers\/metrics$/,
    items: [rootItem("servers"), menuItem("/servers/metrics")],
  },
  {
    match: /^\/servers\/metrics\/[^/]+$/,
    items: [rootItem("servers"), menuItem("/servers/metrics", true)],
    includeEntity: true,
    defaultCurrentLabel: "修改指标",
  },
  {
    match: /^\/servers\/waf\/policies$/,
    items: [rootItem("servers"), menuItem("/servers/waf/policies")],
  },
  {
    match: /^\/servers\/waf\/policy\/[^/]+$/,
    items: [rootItem("servers"), menuItem("/servers/waf/policies", true)],
    includeEntity: true,
    defaultCurrentLabel: "WAF策略设置",
  },
  {
    match: /^\/servers\/ip-lists(?:\/blacklist|\/whitelist)?$/,
    items: [rootItem("servers"), menuItem("/servers/ip-lists", true)],
    defaultCurrentLabel: "IP列表",
  },
  {
    match: /^\/servers\/[^/]+\/(?:dashboard|accesslogs|settings|stats)$/,
    items: [rootItem("servers"), menuItem("/servers", true)],
    includeEntity: true,
  },
  {
    match: /^\/clusters$/,
    items: [rootItem("clusters"), menuItem("/clusters")],
  },
  {
    match: /^\/clusters\/create$/,
    items: [rootItem("clusters"), menuItem("/clusters", true)],
    defaultCurrentLabel: "创建集群",
  },
  {
    match: /^\/clusters\/[^/]+\/(?:dashboard|nodes|settings)$/,
    items: [rootItem("clusters"), menuItem("/clusters", true)],
    includeEntity: true,
  },
  {
    match: /^\/clusters\/node-regions$/,
    items: [rootItem("clusters"), menuItem("/clusters/node-regions")],
  },
  {
    match: /^\/clusters\/nodes$/,
    items: [rootItem("clusters"), menuItem("/clusters/nodes")],
  },
  {
    match: /^\/clusters\/node\/create$/,
    items: [rootItem("clusters"), menuItem("/clusters/nodes", true)],
    defaultCurrentLabel: "添加节点",
  },
  {
    match: /^\/clusters\/nodes\/[^/]+\/(?:dashboard|details|logs|install|settings)$/,
    items: [rootItem("clusters"), menuItem("/clusters/nodes", true)],
    includeEntity: true,
  },
  {
    match: /^\/clusters\/node-logs$/,
    items: [rootItem("clusters"), menuItem("/clusters/node-logs")],
  },
  {
    match: /^\/clusters\/node-grants$/,
    items: [rootItem("clusters"), menuItem("/clusters/node-grants")],
  },
  {
    match: /^\/clusters\/node-grants\/create$/,
    items: [rootItem("clusters"), menuItem("/clusters/node-grants", true)],
    defaultCurrentLabel: "创建SSH认证",
  },
  {
    match: /^\/clusters\/node-grants\/[^/]+$/,
    items: [rootItem("clusters"), menuItem("/clusters/node-grants", true)],
    includeEntity: true,
    defaultCurrentLabel: "SSH认证详情",
  },
  {
    match: /^\/clusters\/monitor(?:\/(?:groups|settings))?$/,
    items: [rootItem("clusters"), menuItem("/clusters/monitor", true)],
    defaultCurrentLabel: "终端",
  },
  {
    match: /^\/clusters\/monitor\/nodes\/[^/]+$/,
    items: [rootItem("clusters"), menuItem("/clusters/monitor", true)],
    includeEntity: true,
    defaultCurrentLabel: "终端详情",
  },
  {
    match: /^\/dns\/providers$/,
    items: [rootItem("dns"), menuItem("/dns/providers")],
  },
  {
    match: /^\/dns\/provider\/[^/]+\/domains$/,
    items: [rootItem("dns"), menuItem("/dns/providers", true)],
    includeEntity: true,
    defaultCurrentLabel: "DNS域名管理",
  },
  {
    match: /^\/admins$/,
    items: [rootItem("admins"), menuItem("/admins")],
  },
  {
    match: /^\/admins\/recipients(?:\/(?:groups|media|logs|tasks))?$/,
    items: [rootItem("admins"), menuItem("/admins/recipients", true)],
    defaultCurrentLabel: "接收人",
  },
  {
    match: /^\/logs$/,
    items: [{ label: getMenuItemByPath("/logs").name }],
  },
  {
    match: /^\/settings\/(?:ui|user-ui|security|updates)$/,
    items: [rootItem("settings")],
  },
  {
    match: /^\/settings\/(?:api-nodes|access-log-nodes|db-cleanup|ai-agent)$/,
    items: [rootItem("settings"), menuItem("/settings/api-nodes", true)],
  },
];

function toBreadcrumbProps(items: BreadcrumbItemDef[]): BreadcrumbProps {
  return {
    items: items.map((item) => ({
      title: item.label,
      href: item.path && item.clickable !== false ? `#${item.path}` : undefined,
    })),
  };
}

function compactItems(items: BreadcrumbItemDef[]): BreadcrumbItemDef[] {
  const nextItems: BreadcrumbItemDef[] = [];

  for (const item of items) {
    const label = item.label.trim();
    if (!label) {
      continue;
    }

    const previous = nextItems[nextItems.length - 1];
    if (previous?.label === label) {
      continue;
    }

    nextItems.push({
      ...item,
      label,
    });
  }

  return nextItems;
}

export function getCurrentBreadcrumbPathname(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) {
    return "/";
  }

  const [pathname] = hash.split("?");
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export function resolveTabBreadcrumbLabel(tabList: readonly BreadcrumbTabItem[] | undefined, pathname: string): string | undefined {
  if (!tabList || tabList.length === 0) {
    return undefined;
  }

  const matchingTab = [...tabList]
    .filter((tab) => typeof tab.key === "string" && tab.key.length > 0)
    .sort((left, right) => (right.key?.length ?? 0) - (left.key?.length ?? 0))
    .find((tab) => pathname === tab.key || pathname.startsWith(`${tab.key}/`));

  const label = matchingTab?.tab ?? matchingTab?.label;
  return typeof label === "string" && label.length > 0 ? label : undefined;
}

export function buildPageBreadcrumb(context: BreadcrumbContext): BreadcrumbProps {
  const template = breadcrumbTemplates.find((candidate) => candidate.match.test(context.pathname));
  if (!template) {
    return { items: [] };
  }

  const currentLabel = resolveTabBreadcrumbLabel(context.tabList, context.pathname) ?? context.currentLabel ?? template.defaultCurrentLabel;
  const entityLabel = context.entityName?.trim() || context.fallbackEntityLabel?.trim();

  const items = [...template.items];
  if (template.includeEntity && entityLabel) {
    items.push({ label: entityLabel });
  }
  if (currentLabel) {
    items.push({ label: currentLabel });
  }

  return toBreadcrumbProps(compactItems(items));
}
