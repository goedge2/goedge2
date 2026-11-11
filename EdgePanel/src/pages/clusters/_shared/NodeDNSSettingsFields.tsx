import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Form, Input, Select, Space, Typography, message } from "antd";

import { clusterQueryKeys } from "@/queries/keys";
import { listDNSDomainRoutes, syncDNSDomainRoutes } from "@/services/nodeDNS";
import { formatErrorMessage } from "@/utils";

const { Text } = Typography;

export function NodeDNSSettingsFields({
  dnsDomainId,
  dnsDomainName,
  namePrefix,
  requireIPAddress = true,
}: {
  dnsDomainId: string;
  dnsDomainName?: string;
  namePrefix?: string;
  requireIPAddress?: boolean;
}) {
  const form = Form.useFormInstance();
  const queryClient = useQueryClient();
  const [syncingRoutes, setSyncingRoutes] = useState(false);
  const fieldName = (name: string) => (namePrefix ? [namePrefix, name] : name);
  const routesQuery = useQuery({
    queryKey: clusterQueryKeys.nodeDNSRoutes(dnsDomainId),
    queryFn: async () => (await listDNSDomainRoutes(dnsDomainId)).routes ?? [],
    enabled: dnsDomainId !== "0",
  });
  const availableRoutes = routesQuery.data ?? [];

  const handleSyncRoutes = async () => {
    try {
      setSyncingRoutes(true);
      const result = await syncDNSDomainRoutes(dnsDomainId);
      if (result.isOk) {
        message.success("从服务商获取线路成功");
      } else {
        message.error(result.error || "获取线路失败");
      }
      await queryClient.invalidateQueries({ queryKey: clusterQueryKeys.nodeDNSRoutes(dnsDomainId) });
    } catch (error) {
      message.error(formatErrorMessage("获取线路失败", error));
    } finally {
      setSyncingRoutes(false);
    }
  };

  return (
    <>
      <Form.Item name={fieldName("dnsDomainId")} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={fieldName("nodeIPAddressId")} hidden>
        <Input />
      </Form.Item>
      <Form.Item label="主域名">
        <Space orientation="vertical" size={4}>
          <Text>{dnsDomainName || "-"}</Text>
          <Text type="secondary">由当前节点所属集群设置</Text>
        </Space>
      </Form.Item>
      <Form.Item label="IP地址" name={fieldName("ipAddr")} rules={[{ required: requireIPAddress, message: "请输入IP地址" }]}>
        <Input
          placeholder="用于域名解析的节点IP地址"
          onPressEnter={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.submit();
          }}
        />
      </Form.Item>
      <Form.Item
        label="线路"
        name={fieldName("routes")}
        extra={
          dnsDomainId !== "0" ? (
            <Space size={4}>
              {availableRoutes.length > 0 ? <Text type="secondary">当前节点IP对应的线路</Text> : null}
              <Button type="link" size="small" style={{ paddingInline: 0 }} loading={syncingRoutes} onClick={() => void handleSyncRoutes()}>
                {availableRoutes.length > 0 ? "重新获取线路" : "获取线路"}
              </Button>
            </Space>
          ) : undefined
        }
      >
        {dnsDomainId === "0" ? (
          <Text type="secondary">当前集群没有选择域名</Text>
        ) : routesQuery.isPending || availableRoutes.length > 0 ? (
          <Select
            mode="multiple"
            options={availableRoutes.map((route) => ({ label: route.name || route.code || "-", value: `${route.code ?? ""}@${dnsDomainId}` }))}
            placeholder="选择DNS线路"
            loading={routesQuery.isPending}
            showSearch={{ optionFilterProp: "label" }}
            allowClear
          />
        ) : (
          <Text type="secondary">没有可选的线路</Text>
        )}
      </Form.Item>
    </>
  );
}
