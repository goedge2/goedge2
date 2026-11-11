import { Select, SelectProps, Spin, Cascader } from "antd";
import { request } from "@umijs/max";
import { useCallback, useEffect, useMemo, useState } from "react";
import { debounce } from "lodash-es";
import type { CustomFormItemProps } from "../utils";
import { getDNSDomainSelectorChangeAction, getDNSDomainSelectorSyncAction } from "./dnsDomainSelectorState";

interface Option {
  value: string | number;
  label: React.ReactNode;
  children?: Option[];
  isLeaf?: boolean;
  loading?: boolean;
}

const useRemoteSelectOptions = (loadOptionsForSearch: (search: string) => Promise<SelectProps["options"]>) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<SelectProps["options"]>([]);

  const loadOptions = useCallback(
    async (search: string) => {
      setLoading(true);
      try {
        setOptions(await loadOptionsForSearch(search));
      } finally {
        setLoading(false);
      }
    },
    [loadOptionsForSearch],
  );

  const onSearch = useMemo(
    () =>
      debounce((search: string) => {
        void loadOptions(search);
      }, 500),
    [loadOptions],
  );

  useEffect(() => {
    let ignore = false;

    const loadInitialOptions = async () => {
      setLoading(true);
      try {
        const nextOptions = await loadOptionsForSearch("");
        if (!ignore) {
          setOptions(nextOptions);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadInitialOptions();

    return () => {
      ignore = true;
      onSearch.cancel();
    };
  }, [loadOptionsForSearch, onSearch]);

  return { loading, options, onSearch };
};

// SSH 认证选择器
export const NodeGrantSelector = ({ value, onChange }: CustomFormItemProps<string>) => {
  const loadOptionsForSearch = useCallback(async (search: string) => {
    const response = await request<{ nodeGrants?: { id: bigint; name: string }[] }>("/api/node-grants", {
      params: { size: 50, keyword: search },
    });
    return (
      response.nodeGrants?.map((item) => ({
        label: item.name,
        value: String(item.id),
      })) || []
    );
  }, []);
  const { loading, options, onSearch } = useRemoteSelectOptions(loadOptionsForSearch);

  return (
    <Select
      value={value}
      onChange={onChange}
      loading={loading}
      notFoundContent={loading ? <Spin size="small" /> : "没有数据"}
      placeholder="选择 SSH 认证"
      options={options}
      showSearch={{ onSearch, filterOption: false }}
      allowClear
    />
  );
};

// 缓存策略选择器
export const CachePolicySelector = ({ value, onChange }: CustomFormItemProps<string>) => {
  const loadOptionsForSearch = useCallback(async (search: string) => {
    const response = await request<{ httpCachePolicies?: { id: bigint; name: string }[] }>("/api/cache/policies", {
      params: { size: 50, keyword: search },
    });
    return (
      response.httpCachePolicies?.map((item) => ({
        label: item.name,
        value: String(item.id),
      })) || []
    );
  }, []);
  const { loading, options, onSearch } = useRemoteSelectOptions(loadOptionsForSearch);

  return (
    <Select
      value={value}
      onChange={onChange}
      loading={loading}
      notFoundContent={loading ? <Spin size="small" /> : "没有数据"}
      placeholder="选择缓存策略"
      options={options}
      showSearch={{ onSearch, filterOption: false }}
      allowClear
    />
  );
};

// WAF 策略选择器
export const WafPolicySelector = ({ value, onChange }: CustomFormItemProps<string>) => {
  const loadOptionsForSearch = useCallback(async (search: string) => {
    const response = await request<{ httpFirewallPolicies?: { id: bigint; name: string }[] }>("/api/waf/policies", {
      params: { size: 50, keyword: search },
    });
    return (
      response.httpFirewallPolicies?.map((item) => ({
        label: item.name,
        value: String(item.id),
      })) || []
    );
  }, []);
  const { loading, options, onSearch } = useRemoteSelectOptions(loadOptionsForSearch);

  return (
    <Select
      value={value}
      onChange={onChange}
      loading={loading}
      notFoundContent={loading ? <Spin size="small" /> : "没有数据"}
      placeholder="选择 WAF 策略"
      options={options}
      showSearch={{ onSearch, filterOption: false }}
      allowClear
    />
  );
};

// 节点区域选择器
export const NodeRegionSelector = ({ value, onChange }: CustomFormItemProps<string>) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<SelectProps["options"]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await request<{ nodeRegions?: { id: bigint; name: string }[] }>("/api/node-regions");
        const opts =
          response.nodeRegions?.map((item) => ({
            label: item.name,
            value: String(item.id),
          })) || [];
        setOptions(opts);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <Select
      value={value ?? ""}
      onChange={onChange}
      loading={loading}
      notFoundContent={loading ? <Spin size="small" /> : "没有数据"}
      placeholder="选择节点区域"
      options={options}
      allowClear
    />
  );
};

// 节点分组选择器 - 与集群联动
interface NodeGroupSelectorProps extends CustomFormItemProps<string> {
  nodeClusterId?: string;
}

export const NodeGroupSelector = ({ value, onChange, nodeClusterId }: NodeGroupSelectorProps) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<SelectProps["options"]>([]);

  useEffect(() => {
    if (!nodeClusterId) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const response = await request<{ nodeGroups?: { id: bigint; name: string }[] }>(`/api/node-clusters/${nodeClusterId}/node-groups`);
        const opts =
          response.nodeGroups?.map((item) => ({
            label: item.name,
            value: String(item.id),
          })) || [];
        setOptions(opts);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [nodeClusterId]);

  return (
    <Select
      value={value ?? ""}
      onChange={onChange}
      loading={loading}
      notFoundContent={loading ? <Spin size="small" /> : nodeClusterId ? "没有数据" : "请先选择集群"}
      placeholder={nodeClusterId ? "选择节点分组" : "请先选择集群"}
      disabled={!nodeClusterId}
      options={nodeClusterId ? options : []}
      allowClear
    />
  );
};

// DNS 域名级联选择器
interface DNSDomainSelectorProps extends CustomFormItemProps<number> {
  onDomainNameChange?: (name?: string) => void;
}

export const DNSDomainSelector = ({ value, onChange, onDomainNameChange }: DNSDomainSelectorProps) => {
  const [options, setOptions] = useState<Option[]>([]);
  const [internalValue, setInternalValue] = useState<(string | number)[]>([]);

  const loadDomainsForProvider = useCallback(async (providerOption: Option) => {
    if (providerOption.children && providerOption.children.length > 0) return [];

    providerOption.loading = true;
    try {
      const response = await request<{ dnsDomains?: { id: number; name: string }[] }>("/api/dns/domains", {
        params: {
          dnsProviderId: providerOption.value,
          size: 1000,
        },
      });

      const domains =
        response.dnsDomains?.map((item) => ({
          value: item.id,
          label: item.name,
          isLeaf: true,
        })) || [];

      providerOption.children = domains;
      return domains;
    } catch (e) {
      console.error("Failed to load DNS domains", e);
      providerOption.children = [];
      return [];
    } finally {
      providerOption.loading = false;
    }
  }, []);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await request<{ dnsProviders?: { id: number; name: string }[] }>("/api/dns/providers", {
          params: { size: 1000 },
        });
        const providers =
          response.dnsProviders?.map((item) => ({
            value: item.id,
            label: item.name,
            isLeaf: false,
          })) || [];
        setOptions(providers);
      } catch (e) {
        console.error("Failed to load DNS providers", e);
      }
    };
    loadProviders();
  }, []);

  const loadData = async (selectedOptions: Option[]) => {
    const targetOption = selectedOptions[selectedOptions.length - 1];
    await loadDomainsForProvider(targetOption);
    setOptions((currentOptions) => [...currentOptions]);
  };

  useEffect(() => {
    const initPath = async () => {
      const syncAction = getDNSDomainSelectorSyncAction({
        value,
        internalValue,
      });

      if (syncAction.type === "noop") {
        if (value && internalValue.length === 2) {
          const providerOpt = options.find((opt) => opt.value === internalValue[0]);

          if (providerOpt && (!providerOpt.children || providerOpt.children.length === 0)) {
            await loadDomainsForProvider(providerOpt);
            setOptions((current) => [...current]);
          }
        }
        return;
      }

      if (syncAction.type === "clear") {
        setInternalValue([]);
        onDomainNameChange?.(undefined);
        return;
      }

      try {
        const response = await request<{ dnsDomain?: { providerId: number; id: number; name: string } }>(
          `/api/dns/domain/${syncAction.domainId}/basic`,
        );
        const domain = response.dnsDomain;
        if (domain) {
          setInternalValue([domain.providerId, domain.id]);
          onDomainNameChange?.(domain.name);

          setOptions((prevOptions) => {
            const newOptions = [...prevOptions];
            const providerOpt = newOptions.find((opt) => opt.value === domain.providerId);

            if (providerOpt && (!providerOpt.children || providerOpt.children.length === 0)) {
              (async () => {
                await loadDomainsForProvider(providerOpt);
                setOptions((current) => [...current]);
              })();
            }
            return newOptions;
          });
        }
      } catch {
        // Ignore
      }
    };
    void initPath();
  }, [internalValue, loadDomainsForProvider, onDomainNameChange, options, value]);

  const handleChange = (val: (string | number)[], selectedOptions: Option[]) => {
    setInternalValue(val);

    const targetOption = selectedOptions?.[selectedOptions.length - 1];
    const changeAction = getDNSDomainSelectorChangeAction({
      valuePath: val,
      selectedValue: targetOption?.value,
      selectedLabel: typeof targetOption?.label === "string" ? targetOption.label : undefined,
      isLeaf: !!targetOption?.isLeaf,
    });

    if (changeAction.type === "clear") {
      onChange?.(undefined);
      onDomainNameChange?.(undefined);
      return;
    }

    if (changeAction.type === "commit") {
      onChange?.(changeAction.domainId);
      onDomainNameChange?.(changeAction.domainName);
      return;
    }
  };

  return (
    <Cascader
      value={internalValue}
      options={options}
      loadData={loadData}
      onChange={(val, selectedOptions) => {
        handleChange((val ?? []) as (string | number)[], (selectedOptions ?? []) as Option[]);
      }}
      changeOnSelect={false}
      placeholder="选择主域名"
    />
  );
};
