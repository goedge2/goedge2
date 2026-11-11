import { request } from "@umijs/max";
import dayjs from "dayjs";

import { getOffset, getPage, getSize, searchParamsToObject, withoutKeys } from "./searchParams";
import type { CreateBasicHTTPServerResponse } from "@/pb/service_server_pb";

export type CreateBasicHTTPServerPayload = {
  nodeClusterId?: string | number;
  userId?: string | number;
  domains: string[];
  sslCertIds?: Array<string | number | bigint>;
  originAddrs: string[];
  enableAccessLog?: boolean;
  enableWebsocket?: boolean;
  enableCache?: boolean;
  enableWaf?: boolean;
  enableRemoteAddr?: boolean;
};

export async function createBasicHTTPServer(payload: CreateBasicHTTPServerPayload) {
  return request<CreateBasicHTTPServerResponse>("/api/server", {
    method: "POST",
    data: payload,
  });
}

export type CreateServerPayload = {
  nodeClusterId?: string | number;
  userId?: string | number;
  type: string;
  name?: string;
  serverNames?: string[];
  automaticCert?: boolean;
  http?: unknown;
  https?: unknown;
  tcp?: unknown;
  tls?: unknown;
  udp?: unknown;
  web?: unknown;
  reverseProxy?: unknown;
};

export async function createServer(payload: CreateServerPayload, options?: { skipErrorHandler?: boolean }) {
  return request<{ serverId?: string | number }>("/api/server", {
    method: "POST",
    data: payload,
    ...options,
  });
}

export async function listServers(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const keyword = searchParams.get("keyword") || "";
  const nodeClusterId = searchParams.get("nodeClusterId") || "0";
  const serverGroupId = searchParams.get("serverGroupId") || "0";
  const userId = searchParams.get("userId") || "0";
  const offset = getOffset(page, size);

  const sortField = searchParams.get("sortField");
  const sortOrder = searchParams.get("sortOrder");
  const sortParams: Record<string, boolean> = {};
  if (sortField && sortOrder) {
    const orderSuffix = sortOrder === "ascend" ? "Asc" : "Desc";
    sortParams[sortField + orderSuffix] = true;
  }

  return request("/api/servers", {
    params: {
      ignoreSSLCerts: true,
      size,
      offset,
      keyword,
      nodeClusterId,
      serverGroupId,
      userId,
      ...sortParams,
    },
  });
}

export async function getServerSettings(serverId?: string) {
  return request(`/api/server/${serverId}`, {
    params: { ignoreSSLCerts: true },
  });
}

export async function listAccessLogs(searchParams: URLSearchParams) {
  const day = searchParams.get("day") || dayjs().format("YYYYMMDD");
  const size = Number(searchParams.get("size")) || 50;
  const domain = searchParams.get("domain") || "";
  const keyword = searchParams.get("keyword") || "";
  const ip = searchParams.get("ip") || "";
  const hourFrom = searchParams.get("hourFrom") || "";

  return request("/api/acccesslogs", {
    params: {
      day,
      size,
      domain,
      keyword,
      ip,
      hourFrom,
      hourTo: hourFrom,
    },
  });
}

export async function listServerGroups(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const keyword = searchParams.get("keyword") || "";
  const offset = getOffset(page, size);

  return request("/api/server/groups", {
    params: {
      ignoreSSLCerts: true,
      page,
      size,
      offset,
      keyword,
    },
  });
}

export async function listCerts(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const keyword = searchParams.get("keyword") || "";
  const userId = searchParams.get("userId");
  const isAvailable = searchParams.get("isAvailable") === "1" ? true : undefined;
  const isExpired = searchParams.get("isExpired") === "1" ? true : undefined;
  const offset = getOffset(page, size);

  return request("/api/certs", {
    params: {
      offset,
      size,
      keyword,
      userId: userId || undefined,
      isAvailable,
      isExpired,
    },
  });
}

export async function listCachePolicies(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const keyword = searchParams.get("keyword") || "";
  const offset = getOffset(page, size);

  return request("/api/cache/policies", {
    params: { offset, size, keyword },
  });
}

export async function getCachePolicyDetail(id?: string) {
  return request(`/api/cache/policy/${id}`);
}

export async function listCacheTasks(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const offset = getOffset(page, size);

  return request("/api/cache/tasks", {
    params: { offset, size },
  });
}

export async function listWafPolicies(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const keyword = searchParams.get("keyword") || "";
  const offset = getOffset(page, size);

  return request("/api/waf/policies", {
    params: { offset, size, keyword },
  });
}

export async function getWafPolicySettings(policyId?: string) {
  return request(`/api/waf/policy/${policyId}`);
}

export async function getServerBoard(serverId?: string) {
  const [serverRes, boardRes] = await Promise.all([
    request(`/api/server/${serverId}`, { params: { ignoreSSLCerts: true } }),
    request(`/api/server/${serverId}/boards`),
  ]);

  return { ...serverRes, board: boardRes };
}

export async function listMetrics(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const keyword = searchParams.get("keyword") || "";
  const offset = getOffset(page, size);

  return request("/api/metrics", {
    params: { offset, size, keyword, category: "http" },
  });
}

export async function getMetricDetail(id?: string) {
  return request(`/api/metrics/${id}`);
}

export async function listIPItems(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const keyword = searchParams.get("keyword") || "";
  const offset = getOffset(page, size);

  return request("/api/ip-items", {
    params: { offset, size, keyword },
  });
}

export async function listIPLists(pathname: string, searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const keyword = searchParams.get("keyword") || "";
  const offset = getOffset(page, size);

  const listType = pathname.includes("/blacklist") ? "black" : pathname.includes("/whitelist") ? "white" : "";

  return request("/api/ip-lists", {
    params: {
      type: listType,
      isPublic: true,
      offset,
      size,
      keyword,
    },
  });
}

export async function getServerAccessLogs(serverId: string | undefined, searchParams: URLSearchParams) {
  const day = searchParams.get("day") || dayjs().format("YYYYMMDD");
  const size = Number(searchParams.get("size")) || 50;
  const domain = searchParams.get("domain") || "";
  const keyword = searchParams.get("keyword") || "";
  const ip = searchParams.get("ip") || "";
  const hourFrom = searchParams.get("hourFrom") || "";

  const [serverRes, logsRes] = await Promise.all([
    request(`/api/server/${serverId}`, { params: { ignoreSSLCerts: true } }),
    request("/api/acccesslogs", {
      params: {
        serverId,
        day,
        size,
        domain,
        keyword,
        ip,
        hourFrom,
        hourTo: hourFrom,
      },
    }),
  ]);

  return {
    ...logsRes,
    server: serverRes.server,
  };
}

export async function listNodeClusterServers(clusterId: string | undefined, searchParams: URLSearchParams) {
  const params = searchParamsToObject(searchParams);
  return listServers(new URLSearchParams({ ...params, nodeClusterId: clusterId ?? "0" }));
}

export async function listServerNodes(searchParams: URLSearchParams) {
  const params = withoutKeys(searchParamsToObject(searchParams), ["sortField", "sortOrder", "page"]);
  return params;
}
