import { Form, Input, Select, type DescriptionsProps } from "antd";
import type { ProviderApiParams } from "./types";

const { Option } = Select;

export const EdgeDNSAPIForm = () => {
  return (
    <>
      <Form.Item name={["apiParams", "host"]} label="API地址" rules={[{ required: true }]}>
        <Input placeholder="http://192.168.1.100:8001" />
      </Form.Item>
      <Form.Item name={["apiParams", "role"]} label="AccessKey类型" rules={[{ required: true }]}>
        <Select>
          <Option value="user">平台用户(user)</Option>
          <Option value="admin">管理员(admin)</Option>
        </Select>
      </Form.Item>
      <Form.Item name={["apiParams", "accessKeyId"]} label="AccessKey ID" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name={["apiParams", "accessKeySecret"]} label="AccessKey密钥" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
    </>
  );
};

export const getEdgeDNSAPIDescriptionItems = (apiParams: ProviderApiParams): DescriptionsProps["items"] => {
  return [
    { key: "host", label: "API地址", children: apiParams.host },
    { key: "role", label: "AccessKey类型", children: apiParams.role === "admin" ? "管理员" : "平台用户" },
    { key: "accessKeyId", label: "AccessKey ID", children: apiParams.accessKeyId },
    { key: "accessKeySecret", label: "AccessKey密钥", children: apiParams.accessKeySecret },
  ].filter(Boolean) as DescriptionsProps["items"];
};
