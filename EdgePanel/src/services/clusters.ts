import { request } from "@umijs/max";

import type { FindAllEnabledAPINodesResponse } from "../pb/service_api_node_pb";
import type { FindEnabledNodeResponse } from "../pb/service_node_pb";
import type { ComposeServerStatNodeBoardResponse } from "../pb/service_server_stat_board_pb";

import { getOffset, getPage, getSize, searchParamsToObject, withoutKeys } from "./searchParams";

function resolveNodeSortParams(searchParams: URLSearchParams): Record<string, boolean> {
  const sortField = searchParams.get("sortField");
  const sortOrder = searchParams.get("sortOrder");

  if (!sortField || !sortOrder) {
    return {};
  }

  const isAsc = sortOrder === "ascend";
  const sortKeyMap: Record<string, string> = {
    cpu: isAsc ? "cpuAsc" : "cpuDesc",
    memory: isAsc ? "memoryAsc" : "memoryDesc",
    trafficOut: isAsc ? "trafficOutAsc" : "trafficOutDesc",
    load: isAsc ? "loadAsc" : "loadDesc",
    connections: isAsc ? "connectionsAsc" : "connectionsDesc",
  };

  const sortKey = sortKeyMap[sortField];
  return sortKey ? { [sortKey]: true } : {};
}

export async function listClusters(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const keyword = searchParams.get("keyword") || "";
  const httpFirewallPolicyId = searchParams.get("httpFirewallPolicyId") || undefined;
  const httpCachePolicyId = searchParams.get("httpCachePolicyId") || undefined;
  const offset = getOffset(page, size);

  return request("/api/clusters", {
    params: { offset, size, keyword, httpFirewallPolicyId, httpCachePolicyId },
  });
}

export async function getClusterSettings(clusterId?: string) {
  return request(`/api/cluster/${clusterId}`);
}

export async function getNodeSettings(nodeId?: string) {
  return request(`/api/node/${nodeId}`);
}

export async function getNodeDetail(nodeId?: string) {
  return request(`/api/node/${nodeId}`);
}

export async function listNodeLogsByNodeId(nodeId: string | undefined, searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const offset = getOffset(page, size);
  const queryParams = searchParamsToObject(searchParams);

  return request("/api/node-logs", {
    params: { ...queryParams, offset, size, role: "node", nodeId },
  });
}

export async function getNodeInstall(nodeId?: string) {
  const [nodeRes, apiNodesRes] = await Promise.all([
    request<FindEnabledNodeResponse>(`/api/node/${nodeId}`),
    request<FindAllEnabledAPINodesResponse>("/api/api-nodes"),
  ]);

  return { node: nodeRes.node, apiNodes: apiNodesRes.apiNodes || [] };
}

export async function listNodes(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const offset = getOffset(page, size);
  const params = withoutKeys(searchParamsToObject(searchParams), ["sortField", "sortOrder", "page"]);
  const sortParams = resolveNodeSortParams(searchParams);

  return request("/api/nodes", {
    params: { ...params, ...sortParams, offset, size },
  });
}

export async function listNodeLogs(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const offset = getOffset(page, size);
  const params = searchParamsToObject(searchParams);

  return request("/api/node-logs", {
    params: { ...params, offset, size, role: "node" },
  });
}

export async function listNodeGrants(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const keyword = searchParams.get("keyword") || "";
  const offset = getOffset(page, size);

  return request("/api/node-grants", {
    params: { offset, size, keyword },
  });
}

export async function getNodeGrantDetail(id?: string) {
  const [grantRes, clustersRes, nodesRes] = await Promise.all([
    request(`/api/node-grants/${id}`),
    request(`/api/clusters/with-node-grant/${id}`),
    request(`/api/nodes/with-node-grant/${id}`),
  ]);

  return {
    nodeGrant: grantRes.nodeGrant,
    nodeClusters: clustersRes.nodeClusters,
    nodes: nodesRes.nodes,
  };
}

export async function listMonitorNodes(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const keyword = searchParams.get("keyword") || "";
  const offset = getOffset(page, size);

  const [nodesRes, groupsRes] = await Promise.all([
    request("/api/monitor/nodes", { params: { offset, size, keyword } }),
    request("/api/monitor/node-groups"),
  ]);

  return {
    ...nodesRes,
    reportNodeGroups: groupsRes.reportNodeGroups,
  };
}

export async function getMonitorNodeDetail(id?: string) {
  const [nodeRes, groupsRes] = await Promise.all([request(`/api/monitor/node/${id}`), request("/api/monitor/node-groups")]);

  return {
    reportNode: nodeRes.reportNode,
    reportNodeGroups: groupsRes.reportNodeGroups,
  };
}

export async function listMonitorGroups() {
  return request("/api/monitor/node-groups");
}

export async function getMonitorSettings() {
  return request("/api/monitor/node-setting");
}

export async function getNodeBoard(nodeId?: string) {
  const [nodeRes, boardRes] = await Promise.all([
    request<FindEnabledNodeResponse>(`/api/node/${nodeId}`),
    request<ComposeServerStatNodeBoardResponse>(`/api/node/${nodeId}/boards`),
  ]);

  return { node: nodeRes.node, board: boardRes };
}

export async function getClusterBoard(clusterId?: string) {
  const [clusterRes, boardRes] = await Promise.all([request(`/api/cluster/${clusterId}`), request(`/api/cluster/${clusterId}/boards`)]);

  return { ...clusterRes, board: boardRes };
}

export async function listClusterNodes(clusterId: string | undefined, searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const offset = getOffset(page, size);
  const queryParams = withoutKeys(searchParamsToObject(searchParams), ["sortField", "sortOrder", "page"]);
  const sortParams = resolveNodeSortParams(searchParams);

  const [nodesRes, clusterRes] = await Promise.all([
    request("/api/nodes", {
      params: {
        ...queryParams,
        ...sortParams,
        offset,
        size,
        nodeClusterId: clusterId,
      },
    }),
    request(`/api/cluster/${clusterId}`),
  ]);

  return {
    ...nodesRes,
    nodeCluster: clusterRes.nodeCluster,
  };
}

export async function listNodeRegions() {
  return request("/api/node-regions", {
    params: {
      ignoreSSLCerts: true,
    },
  });
}
