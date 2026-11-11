import { request } from "@umijs/max";

import type { FindAllDNSDomainRoutesResponse, SyncDNSDomainDataResponse } from "@/pb/service_dns_domain_pb";
import type { FindEnabledNodeDNSResponse } from "@/pb/service_node_pb";
import type { RPCSuccess } from "@/pb/models/rpc_messages_pb";
import { buildNodeDNSPayload } from "./nodeDNSForm";

export function findNodeDNS(nodeId: string, nodeClusterId: string) {
  return request<FindEnabledNodeDNSResponse>(`/api/node/${nodeId}/dns`, {
    params: {
      nodeClusterId,
    },
  });
}

export function updateNodeDNS(params: { nodeId: string; nodeIPAddressId?: string; ipAddr: string; dnsDomainId: string; routes: string[] }) {
  return request<RPCSuccess>(`/api/node/${params.nodeId}/dns`, {
    method: "PUT",
    data: {
      nodeId: Number(params.nodeId),
      ...buildNodeDNSPayload(params),
    },
  });
}

export function listDNSDomainRoutes(dnsDomainId: string) {
  return request<FindAllDNSDomainRoutesResponse>(`/api/dns/domain/${dnsDomainId}/routes`);
}

export function syncDNSDomainRoutes(dnsDomainId: string) {
  return request<SyncDNSDomainDataResponse>(`/api/dns/domain/${dnsDomainId}/sync-data`, {
    method: "POST",
    data: {
      dnsDomainId: Number(dnsDomainId),
    },
  });
}
