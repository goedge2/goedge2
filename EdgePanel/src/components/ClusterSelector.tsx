import { Select, Spin } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import { debounce } from "lodash-es";
import { request } from "@umijs/max";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ListEnabledNodeClustersResponse } from "@/pb/service_node_cluster_pb";
import type { FindEnabledNodeClusterResponse } from "@/pb/service_node_cluster_pb";
import type { NodeCluster } from "@/pb/models/model_node_cluster_pb";
import type { CustomFormItemProps } from "@/utils";

function buildClusterOption(cluster?: NodeCluster) {
  return {
    label: cluster?.name ?? "-",
    value: String(cluster?.id ?? 0n),
  };
}

export const ClusterSelector = ({ value, onChange }: CustomFormItemProps<string>) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<DefaultOptionType[]>([]);

  const loadClusters = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const response = await request<ListEnabledNodeClustersResponse>("/api/clusters", {
        params: { size: 20, keyword: search },
      });
      const clusterOptions = response.nodeClusters.map((cluster) => buildClusterOption(cluster));
      setOptions(clusterOptions);
    } catch (error) {
      console.error("Failed to load clusters:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const onSearch = useMemo(
    () =>
      debounce((search: string) => {
        void loadClusters(search);
      }, 500),
    [loadClusters],
  );

  useEffect(() => {
    let ignore = false;

    const loadInitialClusters = async () => {
      setLoading(true);
      try {
        const response = await request<ListEnabledNodeClustersResponse>("/api/clusters", {
          params: { size: 20, keyword: "" },
        });
        if (ignore) {
          return;
        }
        const clusterOptions = response.nodeClusters.map((cluster) => buildClusterOption(cluster));
        setOptions(clusterOptions);
      } catch (error) {
        console.error("Failed to load clusters:", error);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadInitialClusters();

    return () => {
      ignore = true;
      onSearch.cancel();
    };
  }, [onSearch]);

  useEffect(() => {
    if (!value) {
      return;
    }

    const hasSelectedOption = options.some((option) => option?.value === value);
    if (hasSelectedOption) {
      return;
    }

    let ignore = false;

    const loadSelectedCluster = async () => {
      try {
        const response = await request<FindEnabledNodeClusterResponse>(`/api/cluster/${value}`);
        const cluster = response.nodeCluster;
        if (ignore) {
          return;
        }

        setOptions((currentOptions) => {
          if (currentOptions.some((option) => option?.value === value)) {
            return currentOptions;
          }

          return [buildClusterOption(cluster), ...currentOptions];
        });
      } catch (error) {
        console.error("Failed to load selected cluster:", error);
      }
    };

    void loadSelectedCluster();

    return () => {
      ignore = true;
    };
  }, [options, value]);

  return (
    <Select
      value={value}
      onChange={onChange}
      loading={loading}
      notFoundContent={loading ? <Spin size="small" /> : "没有数据"}
      placeholder="选择一个集群"
      options={options}
      showSearch
      onSearch={onSearch}
      filterOption={false}
      allowClear
    />
  );
};
