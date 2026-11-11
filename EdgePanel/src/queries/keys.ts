import { buildObjectKey, buildSearchParamsKey, normalizeSearchParams } from "./searchParams";

export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardQueryKeys.all, "summary"] as const,
};

export const adminQueryKeys = {
  all: ["admins"] as const,
  listBase: () => [...adminQueryKeys.all, "list"] as const,
  list: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(adminQueryKeys.listBase(), searchParams),
  logsBase: () => ["logs", "list"] as const,
  logs: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(adminQueryKeys.logsBase(), searchParams),
};

export const serverQueryKeys = {
  all: ["servers"] as const,
  listBase: () => [...serverQueryKeys.all, "list"] as const,
  list: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(serverQueryKeys.listBase(), searchParams),
  detailBase: () => [...serverQueryKeys.all, "detail"] as const,
  settings: (serverId?: string) => buildObjectKey(serverQueryKeys.detailBase(), { type: "settings", serverId: serverId ?? null }),
  board: (serverId?: string) => buildObjectKey(serverQueryKeys.detailBase(), { type: "board", serverId: serverId ?? null }),
  stats: (serverId?: string) => buildObjectKey(serverQueryKeys.detailBase(), { type: "stats", serverId: serverId ?? null }),
  accessLogsBase: () => [...serverQueryKeys.all, "access-logs"] as const,
  accessLogs: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(serverQueryKeys.accessLogsBase(), searchParams),
  serverAccessLogsBase: () => [...serverQueryKeys.all, "server-access-logs"] as const,
  serverAccessLogs: (serverId: string | undefined, searchParams: URLSearchParams | Record<string, unknown>) =>
    buildObjectKey(serverQueryKeys.serverAccessLogsBase(), { serverId: serverId ?? null, search: normalizeSearchParams(searchParams) }),
  groupsBase: () => [...serverQueryKeys.all, "groups"] as const,
  groups: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(serverQueryKeys.groupsBase(), searchParams),
  certsBase: () => [...serverQueryKeys.all, "certs"] as const,
  certs: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(serverQueryKeys.certsBase(), searchParams),
  cachePoliciesBase: () => [...serverQueryKeys.all, "cache-policies"] as const,
  cachePolicies: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(serverQueryKeys.cachePoliciesBase(), searchParams),
  cachePolicyDetail: (id?: string) => buildObjectKey(serverQueryKeys.cachePoliciesBase(), { type: "detail", id: id ?? null }),
  cacheTasksBase: () => [...serverQueryKeys.all, "cache-tasks"] as const,
  cacheTasks: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(serverQueryKeys.cacheTasksBase(), searchParams),
  metricsBase: () => [...serverQueryKeys.all, "metrics"] as const,
  metrics: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(serverQueryKeys.metricsBase(), searchParams),
  metricDetail: (id?: string) => buildObjectKey(serverQueryKeys.metricsBase(), { type: "detail", id: id ?? null }),
  wafPoliciesBase: () => [...serverQueryKeys.all, "waf-policies"] as const,
  wafPolicies: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(serverQueryKeys.wafPoliciesBase(), searchParams),
  wafPolicyDetail: (policyId?: string) => buildObjectKey(serverQueryKeys.wafPoliciesBase(), { type: "detail", policyId: policyId ?? null }),
  ipItemsBase: () => [...serverQueryKeys.all, "ip-items"] as const,
  ipItems: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(serverQueryKeys.ipItemsBase(), searchParams),
  ipListPreview: (listId?: string) => buildObjectKey(serverQueryKeys.ipItemsBase(), { type: "preview", listId: listId ?? null }),
  ipListsBase: () => [...serverQueryKeys.all, "ip-lists"] as const,
  ipLists: (pathname: string, searchParams: URLSearchParams | Record<string, unknown>) =>
    buildObjectKey(serverQueryKeys.ipListsBase(), { pathname, search: normalizeSearchParams(searchParams) }),
};

export const clusterQueryKeys = {
  all: ["clusters"] as const,
  listBase: () => [...clusterQueryKeys.all, "list"] as const,
  list: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(clusterQueryKeys.listBase(), searchParams),
  detailBase: () => [...clusterQueryKeys.all, "detail"] as const,
  settings: (clusterId?: string) => buildObjectKey(clusterQueryKeys.detailBase(), { type: "settings", clusterId: clusterId ?? null }),
  board: (clusterId?: string) => buildObjectKey(clusterQueryKeys.detailBase(), { type: "board", clusterId: clusterId ?? null }),
  schedule: (clusterId?: string) => buildObjectKey(clusterQueryKeys.detailBase(), { type: "schedule", clusterId: clusterId ?? null }),
  thresholdDefinitions: () => [...clusterQueryKeys.all, "threshold-definitions"] as const,
  thresholdsBase: () => [...clusterQueryKeys.all, "thresholds"] as const,
  thresholds: (scope: "cluster" | "node", targetId?: string) =>
    buildObjectKey(clusterQueryKeys.thresholdsBase(), { scope, targetId: targetId ?? null }),
  messageReceivers: (clusterId?: string) => buildObjectKey([...clusterQueryKeys.all, "message-receivers"], { clusterId: clusterId ?? null }),
  clusterNodesBase: () => [...clusterQueryKeys.all, "cluster-nodes"] as const,
  clusterNodes: (clusterId: string | undefined, searchParams: URLSearchParams | Record<string, unknown>) =>
    buildObjectKey(clusterQueryKeys.clusterNodesBase(), { clusterId: clusterId ?? null, search: normalizeSearchParams(searchParams) }),
  nodeRegions: () => [...clusterQueryKeys.all, "node-regions"] as const,
  nodesBase: () => [...clusterQueryKeys.all, "nodes"] as const,
  nodes: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(clusterQueryKeys.nodesBase(), searchParams),
  nodeDetailBase: () => [...clusterQueryKeys.all, "node-detail"] as const,
  nodeSettings: (nodeId?: string) => buildObjectKey(clusterQueryKeys.nodeDetailBase(), { type: "settings", nodeId: nodeId ?? null }),
  nodeDNS: (nodeId?: string, nodeClusterId?: string) =>
    buildObjectKey(clusterQueryKeys.nodeDetailBase(), { type: "dns", nodeId: nodeId ?? null, nodeClusterId: nodeClusterId ?? null }),
  nodeDNSRoutes: (dnsDomainId?: string) =>
    buildObjectKey(clusterQueryKeys.nodeDetailBase(), { type: "dns-routes", dnsDomainId: dnsDomainId ?? null }),
  nodeSchedule: (nodeId?: string) => buildObjectKey(clusterQueryKeys.nodeDetailBase(), { type: "schedule", nodeId: nodeId ?? null }),
  nodeScheduleActions: (nodeId?: string) => buildObjectKey(clusterQueryKeys.nodeDetailBase(), { type: "schedule-actions", nodeId: nodeId ?? null }),
  nodeDetail: (nodeId?: string) => buildObjectKey(clusterQueryKeys.nodeDetailBase(), { type: "detail", nodeId: nodeId ?? null }),
  nodeBoard: (nodeId?: string) => buildObjectKey(clusterQueryKeys.nodeDetailBase(), { type: "board", nodeId: nodeId ?? null }),
  nodeInstall: (nodeId?: string) => buildObjectKey(clusterQueryKeys.nodeDetailBase(), { type: "install", nodeId: nodeId ?? null }),
  nodeLogsBase: () => [...clusterQueryKeys.all, "node-logs"] as const,
  nodeLogs: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(clusterQueryKeys.nodeLogsBase(), searchParams),
  nodeLogsByNode: (nodeId: string | undefined, searchParams: URLSearchParams | Record<string, unknown>) =>
    buildObjectKey(clusterQueryKeys.nodeLogsBase(), { nodeId: nodeId ?? null, search: normalizeSearchParams(searchParams) }),
  nodeGrantsBase: () => [...clusterQueryKeys.all, "node-grants"] as const,
  nodeGrants: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(clusterQueryKeys.nodeGrantsBase(), searchParams),
  nodeGrantDetail: (id?: string) => buildObjectKey(clusterQueryKeys.nodeGrantsBase(), { type: "detail", id: id ?? null }),
  monitorNodesBase: () => [...clusterQueryKeys.all, "monitor-nodes"] as const,
  monitorNodes: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(clusterQueryKeys.monitorNodesBase(), searchParams),
  monitorGroups: () => [...clusterQueryKeys.all, "monitor-groups"] as const,
  monitorSettings: () => [...clusterQueryKeys.all, "monitor-settings"] as const,
  monitorNodeDetail: (id?: string) => buildObjectKey(clusterQueryKeys.monitorNodesBase(), { type: "detail", id: id ?? null }),
};

export const dnsQueryKeys = {
  all: ["dns"] as const,
  providersBase: () => [...dnsQueryKeys.all, "providers"] as const,
  providers: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(dnsQueryKeys.providersBase(), searchParams),
  domainsBase: () => [...dnsQueryKeys.all, "domains"] as const,
  domains: (providerId: string | undefined, searchParams: URLSearchParams | Record<string, unknown>) =>
    buildObjectKey(dnsQueryKeys.domainsBase(), { providerId: providerId ?? null, search: normalizeSearchParams(searchParams) }),
};

export const settingQueryKeys = {
  all: ["settings"] as const,
  adminUI: () => [...settingQueryKeys.all, "admin-ui"] as const,
  userUI: () => [...settingQueryKeys.all, "user-ui"] as const,
  security: () => [...settingQueryKeys.all, "security"] as const,
  updates: () => [...settingQueryKeys.all, "updates"] as const,
  apiNodes: () => [...settingQueryKeys.all, "api-nodes"] as const,
  apiNode: (apiNodeId?: number) => [...settingQueryKeys.apiNodes(), "detail", apiNodeId ?? null] as const,
  accessLogDB: () => [...settingQueryKeys.all, "access-log-db"] as const,
  accessLogStorage: () => [...settingQueryKeys.all, "access-log-storage"] as const,
  databaseCleanup: () => [...settingQueryKeys.all, "database-cleanup"] as const,
};

export const messageQueryKeys = {
  all: ["message"] as const,
  recipientsBase: () => [...messageQueryKeys.all, "recipients"] as const,
  recipients: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(messageQueryKeys.recipientsBase(), searchParams),
  recipientReceivers: (messageRecipientId?: string) =>
    buildObjectKey(messageQueryKeys.recipientsBase(), { type: "receivers", messageRecipientId: messageRecipientId ?? null }),
  recipientGroups: () => [...messageQueryKeys.all, "recipient-groups"] as const,
  mediaDefinitions: () => [...messageQueryKeys.all, "medias"] as const,
  mediaInstancesBase: () => [...messageQueryKeys.all, "media-instances"] as const,
  mediaInstances: (searchParams: URLSearchParams | Record<string, unknown>) =>
    buildSearchParamsKey(messageQueryKeys.mediaInstancesBase(), searchParams),
  taskLogsBase: () => [...messageQueryKeys.all, "task-logs"] as const,
  taskLogs: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(messageQueryKeys.taskLogsBase(), searchParams),
  tasksBase: () => [...messageQueryKeys.all, "tasks"] as const,
  tasks: (searchParams: URLSearchParams | Record<string, unknown>) => buildSearchParamsKey(messageQueryKeys.tasksBase(), searchParams),
};

export const shellQueryKeys = {
  all: ["shell"] as const,
  uiConfig: () => [...shellQueryKeys.all, "ui-config"] as const,
  adminProfile: () => [...shellQueryKeys.all, "admin-profile"] as const,
  taskSummary: () => [...shellQueryKeys.all, "task-summary"] as const,
};
