import { request } from "@umijs/max";

import type { FindEnabledDNSProviderResponse } from "../pb/service_dns_provider_pb";
import type { ListDNSDomainsWithDNSProviderIdResponse } from "../pb/service_dns_domain_pb";

import { getOffset, getPage, getSize } from "./searchParams";

export async function listDNSProviders(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const keyword = searchParams.get("keyword") || "";
  const offset = getOffset(page, size);

  return request("/api/dns/providers", {
    params: { offset, size, keyword },
  });
}

export async function listDNSDomains(providerId: string | undefined, searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const keyword = searchParams.get("keyword") || "";
  const offset = getOffset(page, size);

  const [domainsResp, providerResp] = await Promise.all([
    request<ListDNSDomainsWithDNSProviderIdResponse>("/api/dns/domains", {
      params: { offset, size, keyword, dnsProviderId: providerId },
    }),
    request<FindEnabledDNSProviderResponse>(`/api/dns/provider/${providerId}`, {
      params: { maskParams: true },
    }),
  ]);

  return {
    ...domainsResp,
    dnsProvider: providerResp.dnsProvider,
  };
}
