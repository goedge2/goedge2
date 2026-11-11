import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Empty, Form, Spin, message } from "antd";

import { clusterQueryKeys } from "@/queries/keys";
import { findNodeDNS, updateNodeDNS } from "@/services/nodeDNS";
import { nodeDNSFormValues, type NodeDNSFormValues } from "@/services/nodeDNSForm";
import { formatErrorMessage } from "@/utils";
import { NodeDNSSettingsFields } from "./NodeDNSSettingsFields";

type NodeDNSSettingsPanelProps = {
  nodeId: string;
  nodeClusterId: string;
  onSaved?: () => void;
};

export function NodeDNSSettingsPanel({ nodeId, nodeClusterId, onSaved }: NodeDNSSettingsPanelProps) {
  const [form] = Form.useForm<NodeDNSFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const nodeDNSQuery = useQuery({
    queryKey: clusterQueryKeys.nodeDNS(nodeId, nodeClusterId),
    queryFn: async () => (await findNodeDNS(nodeId, nodeClusterId)).node,
    enabled: nodeId.length > 0 && nodeClusterId.length > 0,
  });
  const initialValues = nodeDNSQuery.data ? nodeDNSFormValues(nodeDNSQuery.data) : undefined;

  useEffect(() => {
    if (nodeDNSQuery.data) {
      form.setFieldsValue(nodeDNSFormValues(nodeDNSQuery.data));
    }
  }, [form, nodeDNSQuery.data]);

  const handleSave = async (values: NodeDNSFormValues) => {
    if (!nodeDNSQuery.data) return;
    try {
      setSubmitting(true);
      await updateNodeDNS({
        nodeId,
        nodeIPAddressId: String(values.nodeIPAddressId ?? 0),
        ipAddr: values.ipAddr?.trim() ?? "",
        dnsDomainId: String(values.dnsDomainId ?? 0),
        routes: values.routes ?? [],
      });
      message.success("保存成功");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: clusterQueryKeys.nodeDNS(nodeId, nodeClusterId) }),
        queryClient.invalidateQueries({ queryKey: clusterQueryKeys.nodeSettings(nodeId) }),
        queryClient.invalidateQueries({ queryKey: clusterQueryKeys.nodeDetail(nodeId) }),
        queryClient.invalidateQueries({ queryKey: clusterQueryKeys.nodesBase() }),
        queryClient.invalidateQueries({ queryKey: clusterQueryKeys.clusterNodesBase() }),
      ]);
      onSaved?.();
    } catch (error) {
      message.error(formatErrorMessage("保存失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  if (nodeDNSQuery.isPending) return <Spin />;
  if (!nodeDNSQuery.data) return <Empty description="当前节点没有可用的 DNS 配置" />;
  return (
    <Form form={form} layout="vertical" initialValues={initialValues} onFinish={handleSave}>
      <NodeDNSSettingsFields dnsDomainId={String(nodeDNSQuery.data.dnsDomainId ?? 0)} dnsDomainName={nodeDNSQuery.data.dnsDomainName} />
      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="button" onClick={() => form.submit()} loading={submitting}>
          保存
        </Button>
      </Form.Item>
    </Form>
  );
}
