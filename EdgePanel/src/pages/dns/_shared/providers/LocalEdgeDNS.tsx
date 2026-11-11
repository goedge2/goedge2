import { Form, InputNumber, Select, type DescriptionsProps } from "antd";
import { request } from "@umijs/max";
import { useEffect, useState } from "react";
import type { ProviderApiParams } from "./types";

const { Option } = Select;

export const LocalEdgeDNSForm = () => {
  const [clusters, setClusters] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchClusters = async () => {
      try {
        setLoading(true);
        const data = await request<{ nodeClusters?: { id: string; name: string }[] }>("/api/ns/clusters");
        if (data?.nodeClusters) {
          setClusters(data.nodeClusters);
        }
      } catch (err) {
        console.warn("Failed to load NS clusters", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClusters();
  }, []);

  return (
    <>
      <Form.Item name={["apiParams", "clusterId"]} label="DNS集群ID" rules={[{ required: true }]}>
        {clusters.length > 0 ? (
          <Select loading={loading} placeholder="选择域名服务集群">
            {clusters.map((c) => (
              <Option key={c.id} value={c.id}>
                {c.name}
              </Option>
            ))}
          </Select>
        ) : (
          <InputNumber style={{ width: "100%" }} placeholder="输入集群ID" />
        )}
      </Form.Item>
    </>
  );
};

export const getLocalEdgeDNSDescriptionItems = (apiParams: ProviderApiParams): DescriptionsProps["items"] => {
  return [{ key: "clusterId", label: "DNS集群ID", children: apiParams.clusterId }].filter(Boolean) as DescriptionsProps["items"];
};
