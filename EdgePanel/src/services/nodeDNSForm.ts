import type { NodeDNSInfo } from "../pb/service_node_pb";

export type NodeDNSFormValues = {
  ipAddr?: string;
  routes?: string[];
  dnsDomainId?: string | number | bigint;
  nodeIPAddressId?: string | number | bigint;
};

export type NodeDNSIPAddress = {
  id?: string | number | bigint;
  ip?: string;
  canAccess?: boolean;
  isOn?: boolean;
  isUp?: boolean;
};

export function isNodeDNSAddressAvailable(address: NodeDNSIPAddress) {
  return address.canAccess !== false && address.isOn !== false && address.isUp !== false;
}

export function nodeDNSFormValues(info: NodeDNSInfo): NodeDNSFormValues {
  return {
    ipAddr: info.ipAddr,
    dnsDomainId: String(info.dnsDomainId ?? 0),
    nodeIPAddressId: String(info.nodeIPAddressId ?? 0),
    routes: (info.routes ?? []).map((route) => `${route.code ?? ""}@${info.dnsDomainId ?? 0}`),
  };
}

export function buildNodeDNSPayload(values: NodeDNSFormValues) {
  return {
    nodeIPAddressId: Number(values.nodeIPAddressId ?? 0),
    dnsDomainId: Number(values.dnsDomainId ?? 0),
    ipAddr: values.ipAddr?.trim() ?? "",
    routes: values.routes ?? [],
  };
}

export function buildNodeDNSUpdate(values: NodeDNSFormValues, ipAddresses?: NodeDNSIPAddress[]) {
  const dns = buildNodeDNSPayload(values);
  const synced = syncNodeDNSIPAddress({ dns: values }, { dns: values, ipAddresses });
  const addresses = synced?.ipAddresses ?? ipAddresses;
  const routeSuffix = `@${dns.dnsDomainId}`;
  return {
    ...(dns.dnsDomainId > 0
      ? {
          nodeCluster: { dnsDomainId: dns.dnsDomainId },
          dnsRoutes: dns.routes.map((route) => ({ code: route.endsWith(routeSuffix) ? route.slice(0, -routeSuffix.length) : route })),
        }
      : {}),
    ipAddresses:
      dns.ipAddr && !(addresses ?? []).some(isNodeDNSAddressAvailable)
        ? [...(addresses ?? []), { name: "DNS IP", ip: dns.ipAddr, canAccess: true, isOn: true, isUp: true }]
        : addresses?.map((address) => ({ ...address, ip: address.ip?.trim() })),
  };
}

export function syncNodeDNSIPAddress(
  changed: { dns?: NodeDNSFormValues; ipAddresses?: NodeDNSIPAddress[] },
  values: { dns?: NodeDNSFormValues; ipAddresses?: NodeDNSIPAddress[] },
) {
  const dns = values.dns;
  if (!dns || !values.ipAddresses) {
    return undefined;
  }

  const addressIndex =
    Number(dns.nodeIPAddressId ?? 0) > 0
      ? values.ipAddresses.findIndex((address) => String(address.id) === String(dns.nodeIPAddressId) && isNodeDNSAddressAvailable(address))
      : values.ipAddresses.findIndex(isNodeDNSAddressAvailable);
  if (changed.dns && "ipAddr" in changed.dns && addressIndex >= 0) {
    return {
      ipAddresses: values.ipAddresses.map((address, index) => (index === addressIndex ? { ...address, ip: dns.ipAddr } : address)),
    };
  }
  if (changed.ipAddresses) {
    const address = addressIndex >= 0 ? values.ipAddresses[addressIndex] : values.ipAddresses.find(isNodeDNSAddressAvailable);
    return {
      dns: { ...dns, nodeIPAddressId: String(address?.id ?? 0), ipAddr: address?.ip ?? "" },
    };
  }
  return undefined;
}
