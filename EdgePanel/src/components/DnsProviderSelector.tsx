import { Select } from "antd";

import { useFetchData, CustomFormItemProps } from "@/utils";
import type { ListEnabledDNSProvidersResponse } from "@/pb/service_dns_provider_pb";

export const DnsProviderSelector = ({ value, onChange }: CustomFormItemProps<string>) => {
  const { data, loading } = useFetchData<ListEnabledDNSProvidersResponse>("/api/dns/providers", "get", {
    offset: 0,
    size: 1000,
  });

  const options =
    data?.dnsProviders.map((provider) => ({
      label: provider.name,
      value: provider.id,
    })) ?? [];

  return (
    <Select
      value={value}
      onChange={onChange}
      loading={loading}
      options={options}
      style={{ width: "100%" }}
      placeholder="选择 DNS 服务商"
      allowClear
    />
  );
};
